import { ChevronRight, ExternalLink } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Disclaimer } from '@/components/Disclaimer';
import type { Dataset, Flag } from '@/data/schema';
import { ALLOWED_EXCEEDANCE_TABLE } from '@/data/selectors';
import { fmtDate, todayIso } from '@/lib/format';
import { flagWithOfficialTerm } from '@/lib/labels';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';
import { dataStatusLabelKey, disclosureKey, pollutantName, type MessageKey } from '@/i18n/messages';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { ValidationBadge } from '@/components/RegionValidation';
import listingTables from '../../public/data/listing_tables.json';
import { useRegion } from '@/data/region';

type ValidationPair = {
  pair_id: string;
  waterbody_name: string;
  pollutant: string;
  decision_id: string;
  region_id?: string;
  criterion_basis?: string;
  official_n: number;
  official_exceedances: number;
  full_pair_official_n?: number;
  full_pair_official_exceedances?: number;
  reproduced_n: number;
  reproduced_exceedances: number;
  match_status: 'exact' | 'close' | 'gap';
  cause_key: string;
  validation_cause_detail?: string;
  validation_scope?: string;
  post_cutoff_eligible_n: number;
  post_cutoff_eligible_exceedances: number;
  pending_post_cutoff_n: number;
  screening_flag: Flag;
};
type ValidationReport = {
  dataset_version: string;
  data_status: string;
  exact_match_count: number;
  close_match_count: number;
  gap_match_count: number;
  pair_count: number;
  pairs: ValidationPair[];
};
function isValidationReport(value: unknown): value is ValidationReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  return typeof report.dataset_version === 'string' && typeof report.data_status === 'string' &&
    Number.isInteger(report.exact_match_count) && Number.isInteger(report.close_match_count) &&
    Number.isInteger(report.gap_match_count) && Number.isInteger(report.pair_count) &&
    Array.isArray(report.pairs) && report.pairs.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      return typeof row.pair_id === 'string' && typeof row.waterbody_name === 'string' &&
        typeof row.pollutant === 'string' && typeof row.decision_id === 'string' &&
        ['exact', 'close', 'gap'].includes(String(row.match_status)) && typeof row.cause_key === 'string' &&
        ['Delisting candidate', 'Still exceeding', 'Under-sampled'].includes(String(row.screening_flag)) &&
        ['official_n', 'official_exceedances', 'reproduced_n', 'reproduced_exceedances', 'post_cutoff_eligible_n',
          'post_cutoff_eligible_exceedances', 'pending_post_cutoff_n'].every((key) => Number.isInteger(row[key]));
    });
}

function Tech({ id, title, children, open }: { id: string; title: string; children: ReactNode; open?: boolean }) {
  return (
    <details id={id} open={open} className="tech card overflow-hidden">
      <summary data-testid={`toggle-${id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-cloud">
        <ChevronRight aria-hidden className="chev h-4 w-4 text-teal" />
        <h3 className="text-base">{title}</h3>
      </summary>
      <div className="prose-nc border-t border-line px-5 py-4 text-[15px] [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
    </details>
  );
}

const PLAIN = [
  ['methodStart', 'methodStartBody'],
  ['methodGather', 'methodGatherBody'],
  ['methodCount', 'methodCountBody'],
  ['methodLabel', 'methodLabelBody'],
] as const;

export default function Method({ data }: { data: Dataset }) {
  const { t, locale, flagLabel } = useI18n();
  const { regionId } = useRegion();
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [validationLoading, setValidationLoading] = useState(true);
  const [validationError, setValidationError] = useState(false);
  usePageTitle(t('method'));
  useEffect(() => {
    let alive = true;
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}data/method-validation.json`).then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json: unknown = await response.json();
      if (!isValidationReport(json)) throw new Error('Invalid QA validation report');
      if (alive) setValidation(json);
    }).catch(() => {
      if (alive) setValidationError(true);
    }).finally(() => {
      if (alive) setValidationLoading(false);
    });
    return () => { alive = false; };
  }, []);
  const md = data.metadata;
  const visiblePairIds = new Set(data.pairs.map((pair) => pair.pair_id));
  const visibleValidationPairs = validation?.pairs.filter((row) => visiblePairIds.has(row.pair_id)) ?? [];
  const validationCounts = {
    exact: visibleValidationPairs.filter((row) => row.match_status === 'exact').length,
    close: visibleValidationPairs.filter((row) => row.match_status === 'close').length,
    gap: visibleValidationPairs.filter((row) => row.match_status === 'gap').length,
  };
  const sections = [
    ['plain', 'plainMethod'], ['disclaimer', 'disclaimerNav'], ['technical', 'technicalDetails'], ['validation', 'qaValidation'], ['sources', 'sourcesCitation'],
  ] as const;
  const resultNotes = [
    ['Delisting candidate', 'candidateMethod'],
    ['Still exceeding', 'stillMethod'],
    ['Under-sampled', 'underMethod'],
  ] as const;
  return (
    <div className="wrap pt-10 md:pt-14">
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <nav aria-label={t('onThisPage')} className="hidden lg:block">
          <div className="sticky top-24 grid gap-2 text-sm">
            <p className="label-caps text-slate">{t('onThisPage')}</p>
            {sections.map(([id, key]) => (
              <a key={id} href={`#${id}`} className="text-link hover:underline">{t(key)}</a>
            ))}
          </div>
        </nav>
        <div>
          <p className="label-caps text-link">{t('method')}</p>
          <h1 className="mt-2 text-4xl font-bold">{t('methodTitle')}</h1>
          <p className="prose-nc mt-4 text-lg">{t('methodIntro')}</p>

          <section id="plain" aria-label={t('methodSectionAria')} className="mt-10 scroll-mt-24">
            <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-2">
              {PLAIN.map(([titleKey, bodyKey], i) => (
                <li key={titleKey} className="bg-white p-6">
                  <span className="num text-sm font-bold text-teal-400">{t('stepLabel', { number: i + 1 })}</span>
                  <h2 className="mt-1 text-xl">{t(titleKey)}</h2>
                  <p className="mt-2 text-[15px]">{t(bodyKey)}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {resultNotes.map(([flag, noteKey]) => (
                <div key={flag} className="rounded-lg border border-line bg-white p-4 text-sm"><p className="font-semibold text-navy">{flagWithOfficialTerm(flag)}</p><p className="mt-1">{t(noteKey)}</p></div>
              ))}
            </div>
          </section>

          <div id="disclaimer" className="mt-12 scroll-mt-24"><Disclaimer /></div>

          <section id="technical" aria-labelledby="tech-h" className="mt-14 scroll-mt-24">
            <h2 id="tech-h" className="text-2xl">{t('technicalDetails')}</h2>
            <p className="mt-2 text-sm text-slate">{t('technicalCaveat')} <a className="link-u" href={listingTables.source_url} target="_blank" rel="noreferrer">{listingTables.version}</a>; {t('verifiedOn', { date: fmtDate(listingTables.verified_at.slice(0, 10)) })}.</p>
            <div className="mt-6 grid gap-3">
              <Tech id="sources-versions" title={t('sourcesVersions')} open>
                <ul>
                  {md.sources.map((s) => <li key={s.name}><b className="text-navy">{s.name === 'SWAMP / CEDEN surface water chemistry' ? 'Surface Water Ambient Monitoring Program / California Environmental Data Exchange Network surface water chemistry' : s.name === '2024 and 2026 California Integrated Report (303(d) list)' ? '2024 and 2026 California Integrated Report (Clean Water Act section 303(d) list)' : s.name}</b>, {s.publisher}.</li>)}
                  <li>{t('datasetVersionLabel')} <span className="num text-navy">{md.dataset_version}</span>, {t('generatedLabel')} <span className="num">{md.generated_at.slice(0, 10)}</span>, {t('dataThrough').toLowerCase()} <span className="num">{fmtDate(md.monitoring_data_through)}</span>. {t('statusLabel')}: {t(dataStatusLabelKey(md.data_status))}. {t(disclosureKey(md.data_status))}</li>
                  <li>{t('swampDefinition')} {t('cedenDefinition')}</li>
                </ul>
              </Tech>
              <Tech id="cutoffs" title={t('cutoffDates')}>
                <ul>
                  <li>{md.next_cycle}: {t('dataCutoffSentence')} <span className="num text-navy">{fmtDate(md.cutoff_date)}</span>. {t('countedNewAfter')}</li>
                  <li>{t('cutoffConfirm')}</li>
                </ul>
              </Tech>
              <Tech id="linking" title={t('stationLinks')}>
                <ul>
                  <li>{t('factSheetLink')}: {t('factSheetLinkBody')}</li>
                  <li>{t('spatialJoin')}: {t('spatialJoinBody')}</li>
                </ul>
              </Tech>
              <Tech id="qa" title={t('replicateQa')}>
                <ul>
                  <li>{t('replicateRule')}</li>
                  <li>{t('qaReject')} {t('qaNonDetect')}</li>
                </ul>
                <p className="mt-3">{t('qaCalibrationNote')}</p>
                <div className="mt-4 rounded-lg border border-amber/50 bg-ice p-3 text-sm" role="note">
                  <p className="label-caps text-amber-text">{t('openReviewerQuestion')}</p>
                  <p className="mt-1">{t('unknownNrReviewerQuestion')}</p>
                </div>
              </Tech>
              <Tech id="criterion" title={t('criterionTitle')}>
                <p>{t('criterionDescription')}</p>
              </Tech>
              <Tech id="tables" title={t('policyTablesTitle')}>
                {md.data_status === 'provisional' && <p className="mb-3 rounded border border-amber/50 bg-ice p-3 text-sm">{t('policySelectionPending')}</p>}
                <ul>
                  <li>{t('listingRule31')}</li>
                  <li>{t('listingRule32')}</li>
                  <li>{t('delistingRule')}</li>
                </ul>
                <p className="mt-3">{t('allowedTableIntro')}</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  {ALLOWED_EXCEEDANCE_TABLE.map((table) => (
                    <table key={table.table} className="w-full text-sm">
                      <caption className="label-caps mb-1 text-left text-slate">{t('tableLabel', { table: table.table })}</caption>
                      <thead><tr className="border-b border-line text-left"><th className="py-1 font-semibold text-navy">{t('samplesColumn')}</th><th className="py-1 text-right font-semibold text-navy">{t('allowedColumn')}</th></tr></thead>
                      <tbody>{table.rows.map((r, i) => <tr key={r.range} className={i % 2 ? 'bg-mist' : ''}><td className="num py-1">{r.range}</td><td className="num py-1 text-right">{r.allowed}</td></tr>)}</tbody>
                    </table>
                  ))}
                </div>
              </Tech>
              <Tech id="limits" title={t('limitations')}>
                <ul>
                  <li>{t('techLimitWeight')}</li>
                  <li>{t('techLimitSediment')}</li>
                  <li>{t('techLimitSeason')}</li>
                  <li>{t('techLimitProvisional')}</li>
                </ul>
              </Tech>
            </div>
          </section>

          <section id="validation" aria-labelledby="validation-h" className="mt-14 scroll-mt-24">
            <h2 id="validation-h" className="text-2xl">{t('qaValidation')}</h2>
            <p className="mt-2 text-sm text-slate">{t('qaValidationIntro')}</p>
            {validationLoading && <p role="status" className="mt-4 text-sm">{t('loadingResults')}</p>}
            {validationError && <p role="status" className="mt-4 text-sm text-slate">{t('qaValidationMissing')}</p>}
            {validation && (validation.dataset_version !== md.dataset_version || validation.data_status !== md.data_status) &&
              <p role="status" className="mt-4 text-sm text-slate">{t('qaValidationMismatch')}</p>}
            {validation && validation.dataset_version === md.dataset_version && validation.data_status === md.data_status && <>
              <h3 className="mt-6 text-lg">{t('qaMatchTableTitle')}</h3>
              {regionId === 'R3' && <p className="mt-2 text-sm text-slate">{t('qaRegion3Scope')}</p>}
              <div className="mt-3 overflow-x-auto rounded-lg border border-line" tabIndex={0} aria-label={t('qaMatchTableTitle')}>
                <table data-testid="qa-validation-table" className="min-w-[1280px] w-full text-left text-sm">
                  <caption className="sr-only">{t('qaMatchTableTitle')}</caption>
                  <thead className="bg-cloud"><tr>
                    <th className="px-3 py-2">{t('qaValidationWaterbody')}</th>
                    <th className="px-3 py-2">{t('qaCriterion')}</th>
                    <th className="px-3 py-2">{t('qaOfficialCounts')}</th>
                    <th className="px-3 py-2">{t('qaReproducedCounts')}</th>
                    <th className="px-3 py-2">{t('qaMatchStatus')}</th>
                    <th className="px-3 py-2">{t('qaMatchCause')}</th>
                  </tr></thead>
                  <tbody>{visibleValidationPairs.map((row, index) => {
                    const matchKey = row.match_status === 'exact' ? 'validationExact' : row.match_status === 'close' ? 'validationClose' : 'validationGap';
                    return <tr key={row.pair_id} className={index % 2 ? 'bg-mist' : 'bg-white'}>
                      <th scope="row" className="px-3 py-2 font-semibold text-navy"><span className="block">{row.waterbody_name} / {pollutantName(row.pollutant, locale)}</span><ValidationBadge regionId={row.region_id} pairId={row.pair_id} surface="method-validation" className="mt-1" /></th>
                      <td className="max-w-[260px] px-3 py-2 text-xs">{row.criterion_basis ?? '—'}</td>
                      <td className="num whitespace-nowrap px-3 py-2">
                        <span>{row.official_n}/{row.official_exceedances}</span>
                        {row.full_pair_official_n !== undefined && <span className="mt-1 block text-xs text-slate">{t('qaFullPairCounts')}: {row.full_pair_official_n}/{row.full_pair_official_exceedances}</span>}
                      </td>
                      <td className="num whitespace-nowrap px-3 py-2">{row.reproduced_n}/{row.reproduced_exceedances}</td>
                      <td className="px-3 py-2">{t(matchKey)}</td>
                      <td className="min-w-[420px] px-3 py-2">
                        <p>{t(row.cause_key as MessageKey)}</p>
                        {row.validation_cause_detail && <p lang="en" className="mt-1 text-xs text-slate">{row.validation_cause_detail}</p>}
                      </td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate">{t('qaValidationFooter', {
                exact: validationCounts.exact,
                close: validationCounts.close,
                gap: validationCounts.gap,
                total: visibleValidationPairs.length,
              })}</p>

              <h3 className="mt-8 text-lg">{t('qaPostTableTitle')}</h3>
              <p className="mt-1 text-sm text-slate">{t('qaPostTableIntro')}</p>
              <DataFreshnessNote date={md.monitoring_data_through} className="mt-1" />
              <div className="mt-3 overflow-x-auto rounded-lg border border-line" tabIndex={0} aria-label={t('qaPostTableTitle')}>
                <table data-testid="post-cutoff-qa-table" className="min-w-[740px] w-full text-left text-sm">
                  <caption className="sr-only">{t('qaPostTableTitle')}</caption>
                  <thead className="bg-cloud"><tr>
                    <th className="px-3 py-2">{t('qaValidationWaterbody')}</th>
                    <th className="px-3 py-2">{t('qaEligibleCounts')}</th>
                    <th className="px-3 py-2">{t('qaPendingCount')}</th>
                    <th className="px-3 py-2">{t('qaFlag')}</th>
                  </tr></thead>
                  <tbody>{visibleValidationPairs.map((row, index) => <tr key={row.pair_id} className={index % 2 ? 'bg-mist' : 'bg-white'}>
                    <th scope="row" className="px-3 py-2 font-semibold text-navy"><span className="block">{row.waterbody_name} / {pollutantName(row.pollutant, locale)}</span><ValidationBadge regionId={row.region_id} pairId={row.pair_id} surface="method-recent" className="mt-1" /></th>
                    <td className="num whitespace-nowrap px-3 py-2">{row.post_cutoff_eligible_n}/{row.post_cutoff_eligible_exceedances}</td>
                    <td className="num px-3 py-2">{row.pending_post_cutoff_n}</td>
                    <td className="px-3 py-2">{flagLabel(row.screening_flag)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </>}
          </section>

          <section id="sources" aria-labelledby="src-h" className="mt-14 scroll-mt-24">
            <h2 id="src-h" className="text-2xl">{t('sourcesCitation')}</h2>
            <ul className="mt-4 grid gap-3">
              {md.sources.map((s) => (
                <li key={s.name} className="card flex items-center justify-between gap-4 p-4">
                  <div><p className="font-semibold text-navy">{s.name}</p><p className="text-sm text-slate">{s.publisher}</p></div>
                   <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-link hover:underline">{t('visitSource')} <ExternalLink aria-hidden className="h-3.5 w-3.5" /></a>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-lg border border-line bg-white p-5">
               <p className="label-caps text-slate">{t('recommendedCitation')}</p>
                <p className="mt-2 text-sm text-navy">{t('methodCitation', { date: fmtDate(todayIso()) })}</p>
              <p className="mt-2 text-xs text-slate">{t('citationGuideCaveat')}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
