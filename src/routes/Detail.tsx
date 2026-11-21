import { ChevronRight, Copy, ExternalLink, ImageDown, Landmark, MapPin, ScanSearch, Printer, Code2, Mail } from 'lucide-react';
import { lazy, Suspense, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DacBadge, FlagBadge, OfficialBadge, SampleLabel } from '@/components/Badges';
import { SampleTally } from '@/components/SampleTally';
import { EmptyState, ErrorState } from '@/components/States';
import { DeferredResultsChart } from '@/components/DeferredResultsChart';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { RegionValidationNotice, ValidationBadge } from '@/components/RegionValidation';
import { useToast } from '@/components/Toast';
import { useSamples } from '@/data/provider';
import type { Dataset, WaterbodyPair } from '@/data/schema';
import { ALLOWED_EXCEEDANCE_TABLE, stationsFor } from '@/data/selectors';
import { fmtDate, fmtNum, todayIso } from '@/lib/format';
import { flagLabel } from '@/lib/labels';
import { publicOrigin, usePageTitle } from '@/lib/title';
import { tokens } from '@/styles/tokens';
import NotFound from './NotFound';
import { ScenarioCalculator } from '@/components/ScenarioCalculator';
import { useI18n } from '@/i18n';
import { pollutantName } from '@/i18n/messages';

const figureModule = () => import('@/components/KeyFigureCard');
const KeyFigureCard = lazy(() => figureModule().then((m) => ({ default: m.KeyFigureCard })));

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className="grid grid-cols-[145px_1fr] gap-3 border-b border-line py-2.5 text-sm last:border-0"><dt className="text-slate">{k}</dt><dd className="text-navy">{children}</dd></div>;
}

function verdict(pair: WaterbodyPair, cutoff: string, translate: ReturnType<typeof useI18n>['t']) {
  const key = pair.screening_flag === 'Delisting candidate' ? 'verdictCandidate' : pair.screening_flag === 'Still exceeding' ? 'verdictStill' : 'verdictUnder';
  return translate(key, {
    water: pair.waterbody_name, pollutant: pair.pollutant.toLowerCase(),
    count: pair.new_exceedances, samples: pair.new_samples, cutoff: fmtDate(cutoff),
  });
}

export function citationFor(p: WaterbodyPair, d: Dataset, translate: ReturnType<typeof useI18n>['t'], url: string) {
  const md = d.metadata;
  return translate('citationTemplate', {
    name: p.waterbody_name, pollutant: p.pollutant, flag: flagLabel(p.screening_flag),
    exceedances: p.new_exceedances, samples: p.new_samples, cutoff: fmtDate(md.cutoff_date),
     version: md.dataset_version, sampleClause: md.data_status === 'illustrative' ? translate('sampleCitationClause') : md.data_status === 'provisional' ? translate('provisionalCitationClause') : '',
    through: fmtDate(md.monitoring_data_through), sources: translate('citationSources'), url, accessed: fmtDate(todayIso()),
  });
}

export default function Detail({ data, pairId }: { data: Dataset; pairId: string }) {
  const pair = data.pairs.find((p) => p.pair_id === pairId);
  const { t, criterionText, flagLabel } = useI18n();
  usePageTitle(
    pair ? `${pair.waterbody_name}, ${pollutantName(pair.pollutant)}` : t('notFoundTitle'),
    pair ? t('detailMeta', { water: pair.waterbody_name, pollutant: pair.pollutant }) : t('notFoundTitle'),
    (data.metadata as Dataset['metadata'] & { site_url?: string }).site_url,
    pair ? `og/${encodeURIComponent(pair.pair_id)}.png` : 'og-image.png',
  );
  const md = data.metadata;
  const { state, retry } = useSamples(pair, md.cutoff_date);
  const notify = useToast();
  const figRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copyStatus, setCopyStatus] = useState(false);
  if (!pair) return <NotFound message={t('detailPairMissing', { id: pairId })} />;

  const stations = stationsFor(pair, data.stations);
  const appBase = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  const canonicalUrl = new URL(`${appBase}w/${encodeURIComponent(pair.pair_id)}`, publicOrigin((data.metadata as Dataset['metadata'] & { site_url?: string }).site_url)).toString();
  const postSeq = state.status === 'ready' ? state.data.results.filter((result) => !result.before_cutoff && result.screening_eligible).map((result) => result.exceeds) : undefined;
  const copyCitation = async () => {
    const text = citationFor(pair, data, t, canonicalUrl);
    try { await navigator.clipboard.writeText(text); notify(t('copiedCitation')); }
    catch { window.prompt(t('copyCitation'), text); }
  };
  const embedUrl = new URL(`${appBase}embed/${encodeURIComponent(pair.pair_id)}`, publicOrigin((data.metadata as Dataset['metadata'] & { site_url?: string }).site_url)).toString();
  const embedMarkup = `<iframe src="${embedUrl}" title="${t('iframeTitle', { waterbody: pair.waterbody_name })}" width="100%" height="360" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" style="border:0;max-width:640px"></iframe>`;
  const copyEmbed = async () => {
    try { await navigator.clipboard.writeText(embedMarkup); setCopyStatus(true); notify(t('copied')); }
    catch { window.prompt(t('copyEmbed'), embedMarkup); }
  };
  const repo = md.repo_url?.replace(/\/$/, '');
  const issueUrl = repo ? `${repo}/issues/new?${new URLSearchParams({
    title: t('issueTitle', { pair: pair.pair_id, waterbody: pair.waterbody_name, version: md.dataset_version }),
    body: t('issueBody', { pair: pair.pair_id, version: md.dataset_version }),
  })}` : '';
  const community = pair as WaterbodyPair & { cities?: string[]; zip_codes?: string[]; tribal_lands?: string[]; tribal_intersection_verified?: boolean };
  const usefulMail = (useful: boolean) => {
    const subject = encodeURIComponent(t('mailFeedbackSubject', { pair: pair.pair_id }));
    const body = encodeURIComponent(t('mailFeedbackBody', { answer: t(useful ? 'answerYes' : 'answerNo'), pair: pair.pair_id, version: md.dataset_version }));
    window.location.href = `mailto:hello@utilyst.com?subject=${subject}&body=${body}`;
  };
  const exportPng = async () => {
    if (state.status !== 'ready') return;
    let imageModule: typeof import('html-to-image');
    try {
      [imageModule] = await Promise.all([import('html-to-image'), figureModule()]);
    } catch { notify(t('exportFailed')); return; }
    setExporting(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 250));
    try {
      const node = figRef.current;
      if (!node) throw new Error('Figure not ready');
      const url = await imageModule.toPng(node, { pixelRatio: 2, backgroundColor: tokens.white, cacheBust: true });
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `nextcycle-${pair.pair_id}.png`; anchor.click();
      notify(t('exportedFigure'));
    } catch { notify(t('exportFailed')); }
    finally { setExporting(false); }
  };

  const directionKey = pair.criterion_direction === 'upper' ? 'aboveDirection' : pair.criterion_direction === 'lower' ? 'belowDirection' : 'outsideDirection';
  const meaningBullets = pair.screening_flag === 'Delisting candidate'
    ? [t('meaningCandidateOne', { minimum: pair.min_samples_for_delisting, allowed: pair.allowed_exceedances_for_delisting ?? 0 }), t('meaningCandidateTwo')]
    : pair.screening_flag === 'Still exceeding'
      ? [t('meaningStillOne', { count: pair.new_exceedances, total: pair.new_samples, direction: t(directionKey) }), t('meaningStillTwo')]
      : [t('meaningUnderOne', { count: pair.new_samples, minimum: pair.min_samples_for_delisting }), t('meaningUnderTwo', { needed: Math.max(0, pair.min_samples_for_delisting - pair.new_samples) })];
  const notMeansBullets = pair.screening_flag === 'Delisting candidate'
    ? [t('notDelisted'), t('onlyAgenciesDecide')]
    : pair.screening_flag === 'Still exceeding'
      ? [t('notViolation'), t('notPermit')]
      : [t('notCleanOrImpaired'), t('tooFewToTell')];

  return (
    <div className="detail-page wrap pt-8 pb-16 md:pt-12">
      <nav aria-label={t('breadcrumb')} className="flex items-center gap-1 text-sm text-slate"><Link to="/watch" className="text-link hover:underline">{t('breadcrumbWatch')}</Link><ChevronRight aria-hidden className="h-3.5 w-3.5" /><span aria-current="page" className="truncate">{pair.waterbody_name}</span></nav>
      <header className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          {md.data_status === 'illustrative' && <SampleLabel />}
          <h1 className="mt-2 text-4xl font-bold md:text-5xl">{pair.waterbody_name}</h1>
          <p className="mt-2 text-lg text-navy">{pollutantName(pair.pollutant)} · {t('countyName', { county: pair.county })} · {md.regions.find((r) => r.region_id === pair.region_id)?.region_name ?? pair.region_id}</p>
          <ValidationBadge regionId={pair.region_id} pairId={pair.pair_id} surface="detail" className="mt-2" />
          <ul aria-label={t('beneficialUses')} className="mt-3 flex flex-wrap gap-1.5">
            {pair.beneficial_uses.map((use) => <li key={use} className="rounded-full bg-teal-200 px-2.5 py-0.5 text-xs font-semibold text-teal-800">{use}</li>)}
            {pair.disadvantaged_community === true && pair.ces_percentile != null && <li><DacBadge ces={pair.ces_percentile} /></li>}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <button data-testid="button-export-png" onClick={exportPng} disabled={exporting || state.status !== 'ready'} className="btn btn-primary"><ImageDown aria-hidden className="h-4 w-4" />{exporting ? t('rendering') : t('exportFigure')}</button>
          <button data-testid="button-copy-citation" onClick={copyCitation} className="btn btn-ghost"><Copy aria-hidden className="h-4 w-4" />{t('copyCitation')}</button>
          <button data-testid="button-print-brief" onClick={() => window.print()} className="btn btn-ghost"><Printer aria-hidden className="h-4 w-4" />{t('print')}</button>
          <button data-testid="button-copy-embed" onClick={copyEmbed} className="btn btn-ghost"><Code2 aria-hidden className="h-4 w-4" />{t('copyEmbed')}</button>
          <Link data-testid="link-view-on-map" to={`/map?pair=${encodeURIComponent(pair.pair_id)}`} className="btn btn-ghost"><MapPin aria-hidden className="h-4 w-4" />{t('map')}</Link>
        </div>
      </header>
      <RegionValidationNotice regionId={pair.region_id} className="mt-5" />
      {copyStatus && <p role="status" className="sr-only">{t('copied')}</p>}

      <section aria-label={t('newerSamplesSuggest')} className="mt-8 rounded-xl border border-teal-200 bg-ice p-5 md:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3"><p className="label-caps text-teal">{t('newerSamplesSuggest')}</p><FlagBadge flag={pair.screening_flag} subline /></div>
        <p className="mt-4 max-w-4xl text-xl font-semibold leading-snug text-navy md:text-2xl">{verdict(pair, md.cutoff_date, t)}</p>
        <DataFreshnessNote date={md.monitoring_data_through} className="mt-2" />
      </section>
      <section className="detail-print-brief" aria-label={t('printBrief')}>
        <h1>{pair.waterbody_name} · {pollutantName(pair.pollutant)}</h1><p>{verdict(pair, md.cutoff_date, t)}</p>
        <p>{t('screeningWithPending', { count: pair.new_exceedances, total: pair.new_samples, direction: t(directionKey), pending: pair.pending_new_samples ?? 0 })} {t('officialStatus')}: {t(pair.official_status === 'Listed' ? 'officialListed' : 'officialNotListed')}, {t('cat', { category: pair.official_category })}.</p>
        <DataFreshnessNote date={md.monitoring_data_through} className="mt-2" />
        <div className="print-count-chart" role="img" aria-label={t('printChartA11y', { outside: pair.new_exceedances, total: pair.new_samples })}>
          <p>{t('recentSampleCount')}</p><div><span style={{ width: `${pair.new_samples ? (pair.new_exceedances / pair.new_samples) * 100 : 0}%` }} /></div>
          <p>{t('printOutside', { outside: pair.new_exceedances, within: Math.max(0, pair.new_samples - pair.new_exceedances) })}</p>
        </div>
        <p>{t('datasetVersionLabel')} {md.dataset_version} · {t('dataThrough').toLowerCase()} {fmtDate(md.monitoring_data_through)} · SWAMP/CEDEN; {t('officialFactSheet')}: {pair.fact_sheet_url}.</p>
        <p>{t('printDisclaimer')}</p>
      </section>

      <section aria-label={`${t('whatMeans')} / ${t('whatNotMeans')}`} className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="card p-5"><h2 className="text-lg">{t('whatMeans')}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-navy">{meaningBullets.map((text) => <li key={text}>{text}</li>)}</ul></div>
        <div className="card p-5"><h2 className="text-lg">{t('whatNotMeans')}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-navy">{notMeansBullets.map((text) => <li key={text}>{text}</li>)}</ul></div>
      </section>

      <section aria-labelledby="chart" className="card mt-6 p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="chart" className="text-xl">{t('monitoringResults', { pollutant: pair.pollutant.toLowerCase() })}</h2><p className="text-sm text-slate">{criterionText(pair)}. {t('shadingCutoff')}</p></div>{md.data_status === 'illustrative' && <SampleLabel />}</div>
        {state.status === 'loading' && <div className="skeleton mt-5 h-[340px]" role="status" aria-label={t('loadingResults')} />}
        {state.status === 'error' && <ErrorState compact error={state.error} onRetry={retry} />}
        {state.status === 'ready' && (state.data.results.length === 0
          ? <div className="mt-5"><EmptyState title={t('noResultsFile')} /></div>
          : <figure className="mt-5">
            <div role="img" aria-label={t('chartA11y', { count: state.data.results.length, pollutant: pair.pollutant, unit: state.data.unit, outside: pair.new_exceedances, total: pair.new_samples })}>
              <DeferredResultsChart pair={pair} samples={state.data} cutoff={md.cutoff_date} />
            </div>
            <figcaption className="mt-3 text-xs text-slate">{t('monitoringSourceCaption', { unit: state.data.unit, sampleClause: md.data_status === 'illustrative' ? t('sampleClause') : '', date: fmtDate(md.monitoring_data_through) })}</figcaption>
          </figure>)}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="official" data-testid="card-official" className="card p-5 md:p-6">
          <div className="flex items-center gap-2"><Landmark aria-hidden className="h-5 w-5 text-teal" /><h2 id="official" className="text-lg">{t('officialStatus')}</h2></div>
          <p className="mt-1 text-xs text-slate">{t('officialStatusExplanation')}</p>
          <div className="mt-5"><OfficialBadge pair={pair} /></div>
          <p className="mt-3 text-sm text-navy">{t('officialCycle', { year: pair.official_cycle, category: pair.official_category })}</p>
          <a href={pair.fact_sheet_url} target="_blank" rel="noreferrer" data-testid="link-fact-sheet" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline">{t('officialFactSheet')} <ExternalLink aria-hidden className="h-3.5 w-3.5" /></a>
        </section>
        <section aria-labelledby="screening" data-testid="card-screening" className="card border-dashed border-teal-400 bg-cloud p-5 md:p-6">
          <div className="flex items-center gap-2"><ScanSearch aria-hidden className="h-5 w-5 text-teal" /><h2 id="screening" className="text-lg">{t('nextcycleResult')}</h2></div>
          <p className="mt-1 text-xs text-slate">{t('earlyScreenSince', { date: fmtDate(md.cutoff_date) })}</p>
          <div className="mt-4"><FlagBadge flag={pair.screening_flag} size="lg" /></div>
            <p className="mt-4 text-sm text-navy">{t('screeningWithPending', { count: pair.new_exceedances, total: pair.new_samples, direction: t(directionKey), pending: pair.pending_new_samples ?? 0 })}</p>
           <DataFreshnessNote date={md.monitoring_data_through} className="mt-1" />
           {pair.screening_flag === 'Under-sampled' && pair.new_samples >= 3 &&
             <p className="mt-3 rounded-lg border border-teal-200 bg-ice p-3 text-sm font-medium text-navy">{t('earlySignal', { count: pair.new_exceedances, total: pair.new_samples, direction: t(directionKey) })}</p>}
          <div className="mt-4"><SampleTally n={pair.new_samples} exceed={pair.new_exceedances} min={pair.min_samples_for_delisting} sequence={postSeq} /></div>
        </section>
      </div>

      <section aria-labelledby="plain-language" className="card mt-6 p-5 md:p-6">
        <h2 id="plain-language" className="text-xl">{t('plainLanguage')}</h2>
        <p className="prose-nc mt-3 text-[17px]">{verdict(pair, md.cutoff_date, t)}</p>
        {pair.data_gap_note && <div className="mt-4 rounded-lg border border-dashed border-slate p-4"><p className="label-caps mb-1 text-slate">{t('dataGapNote')}</p><p className="text-sm">{t('dataGapContext', { count: Math.max(0, pair.min_samples_for_delisting - pair.new_samples) })}</p></div>}
      </section>
      <ScenarioCalculator pair={pair} asOf={md.monitoring_data_through} />
      <section aria-labelledby="community-notes" className="card mt-6 p-5 md:p-6">
        <h2 id="community-notes" className="text-xl">{t('community')}</h2>
        <p className="mt-3 text-sm text-navy">{community.tribal_intersection_verified
          ? `${t('tribalVerified')} ${community.tribal_lands?.length ? community.tribal_lands.join(', ') : ''}`
          : t('tribalUnknown')}</p>
        {pair.disadvantaged_community === true && pair.ces_percentile != null && <p className="mt-2 text-sm text-navy">{t('tribalAreaCaveat', { percentile: pair.ces_percentile })}</p>}
        {((community.cities?.length ?? 0) > 0 || (community.zip_codes?.length ?? 0) > 0) && <p className="mt-2 text-sm text-slate">{t('placeCandidateCoverage', { places: [...(community.cities ?? []), ...(community.zip_codes ?? []).map((z) => t('zipPrefix', { code: z }))].join(', ') })} {t('geographyCaveat')}</p>}
      </section>
      <section aria-labelledby="feedback-heading" className="mt-6 rounded-xl bg-mist p-5">
        <h2 id="feedback-heading" className="text-lg">{t('feedback')}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => usefulMail(true)}>{t('useful')}</button>
          <button className="btn btn-ghost" onClick={() => usefulMail(false)}>{t('notUseful')}</button>
          <a className="btn btn-primary" href={`mailto:hello@utilyst.com?subject=${encodeURIComponent(t('mailFeedbackSubject', { pair: pair.pair_id }))}&body=${encodeURIComponent(t('mailGenericBody', { pair: pair.pair_id, version: md.dataset_version }))}`}><Mail aria-hidden className="h-4 w-4" />{t('emailFeedback')}</a>
          {issueUrl && <a className="btn btn-ghost" href={issueUrl} target="_blank" rel="noreferrer">{t('issue')} <ExternalLink aria-hidden className="h-4 w-4" /></a>}
        </div>
        {!issueUrl && <p className="mt-3 text-xs text-slate">{t('repoUnavailable')}</p>}
      </section>

      <details className="tech mt-6 rounded-xl border border-line bg-white">
        <summary data-testid="button-technical-details" className="flex items-center gap-2 px-5 py-4 text-sm font-semibold text-teal"><ChevronRight aria-hidden className="chev h-4 w-4" />{t('technicalToggle')}</summary>
        <div className="border-t border-line p-5 md:p-6">
          <p className="max-w-3xl text-sm text-slate">{t('technicalReviewNote')}</p>
          <div className="mt-4 grid gap-x-8 lg:grid-cols-2">
            <dl>
              <Row k={t('waterbodyId')}><span className="num">{pair.waterbody_id}</span></Row>
              <Row k={t('pairId')}><span className="num">{pair.pair_id}</span></Row>
              <Row k={t('decisionId')}><span className="num">{pair.decision_id}</span></Row>
              <Row k={t('officialStatusTechnical')}><>{t('officialCategoryTechnical', { status: t(pair.official_status === 'Listed' ? 'officialListed' : 'officialNotListed'), category: pair.official_category, tmdl: t(pair.tmdl_status === 'TMDL required' ? 'tmdlRequired' : pair.tmdl_status === 'TMDL adopted' ? 'tmdlAdopted' : pair.tmdl_status === 'Other control' ? 'otherControl' : 'noTmdl') })}</></Row>
              <Row k={t('listingTable')}>{t('tablePair', { listing: pair.listing_table, delisting: pair.delisting_table })}</Row>
              <Row k={t('criterionBasis')}>{criterionText(pair)}. {pair.criterion_basis}</Row>
              <Row k={t('testThresholds')}>{pair.allowed_exceedances_for_delisting === null ? t('notEnoughMinimum', { minimum: pair.min_samples_for_delisting }) : t('allowedMinimum', { allowed: pair.allowed_exceedances_for_delisting, minimum: pair.min_samples_for_delisting })}</Row>
              <Row k={t('screeningLabel')}>{flagLabel(pair.screening_flag)}</Row>
        <Row k={t('samplingWindow')}>{pair.first_new_sample_date ? fmtDate(pair.first_new_sample_date) : '—'} {t('throughDate')} {fmtDate(pair.last_sample_date)}.</Row>
            </dl>
            <div>
              <h3 className="text-base">{t('monitoringStations')}</h3>
              {stations.length ? <ul className="mt-2 divide-y divide-line">{stations.map((station) => <li key={station.station_code} className="py-3">
                <p className="font-semibold text-navy">{station.station_name}</p>
                <p className="num text-xs text-slate">{station.station_code} · {station.lat.toFixed(4)}, {station.lon.toFixed(4)}</p>
                <p className="mt-1 text-xs text-slate">{t('stationResultSummary', { count: station.sample_count, date: fmtDate(station.last_sample_date), method: t(station.link_method === 'Fact sheet' ? 'factSheetLink' : 'spatialJoin') })}</p>
              </li>)}</ul> : <p className="mt-2 text-sm text-slate">{t('noStationsLinked')}</p>}
            </div>
          </div>
          <section aria-labelledby="policy-tables" className="mt-6">
            <h3 id="policy-tables" className="text-base">{t('policyThresholds')}</h3>
            <p className="mt-1 text-xs text-slate">{t('countTestTables')}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {ALLOWED_EXCEEDANCE_TABLE.map((table) => <table key={table.table} className="w-full text-sm">
                <caption className="label-caps mb-1 text-left text-slate">{t('tableLabel', { table: table.table })}</caption>
                <thead><tr className="border-b border-line text-left"><th className="py-1 font-semibold text-navy">{t('sampleRange')}</th><th className="py-1 text-right font-semibold text-navy">{t('allowedColumn')}</th></tr></thead>
                <tbody>{table.rows.map((row) => <tr key={row.range} className="border-b border-line last:border-0"><td className="num py-1 text-navy">{row.range}</td><td className="num py-1 text-right text-navy">{row.allowed}</td></tr>)}</tbody>
              </table>)}
            </div>
          </section>
          {state.status === 'ready' && <details className="tech mt-5 rounded-lg border border-line">
            <summary data-testid="button-toggle-results" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-teal"><ChevronRight aria-hidden className="chev h-4 w-4" />{t('viewIndividualResults', { count: state.data.results.length })}</summary>
            <div className="max-h-80 overflow-auto border-t border-line">
              <table className="w-full text-sm"><thead className="sticky top-0 bg-white"><tr className="text-left">{(['dateColumn', 'stationColumn', 'valueColumn', 'qualifierColumn', 'outsideColumn', 'periodColumn'] as const).map((heading) => <th key={heading} className="label-caps px-4 py-2 text-slate">{t(heading)}</th>)}</tr></thead>
                <tbody>{state.data.results.map((result, index) => <tr key={`${result.station_code}-${result.date}-${index}`} className={index % 2 ? 'bg-mist' : 'bg-white'}>
                  <td className="num px-4 py-1.5 text-navy">{result.date}</td><td className="num px-4 py-1.5 text-navy">{result.station_code}</td><td className="num px-4 py-1.5 text-navy">{result.value == null ? '—' : fmtNum(result.value)}</td><td className="num px-4 py-1.5">{result.qualifier}</td><td className="px-4 py-1.5">{result.exceeds ? <b className="text-amber-text">{t('yes')}</b> : t('no')}</td><td className="px-4 py-1.5">{result.before_cutoff ? t('beforeCutoffLabel') : t('afterCutoffLabel')}</td>
                </tr>)}</tbody>
              </table>
            </div>
          </details>}
          <p className="mt-4 text-xs text-slate">{t('dataSourceTerms', { date: fmtDate(md.monitoring_data_through) })}</p>
        </div>
      </details>

      {exporting && state.status === 'ready' && <Suspense fallback={null}><div aria-hidden style={{ position: 'fixed', left: -10000, top: 0 }}><KeyFigureCard ref={figRef} pair={pair} samples={state.data} metadata={md} /></div></Suspense>}
    </div>
  );
}
