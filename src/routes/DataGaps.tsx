import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DacBadge, FlagBadge } from '@/components/Badges';
import { CsvButton } from '@/components/CsvButton';
import { SampleTally } from '@/components/SampleTally';
import { EmptyState } from '@/components/States';
import type { Dataset, WaterbodyPair } from '@/data/schema';
import { noUsableWaterStats, samplesNeeded } from '@/data/selectors';
import { fmtDate } from '@/lib/format';
import { usePageTitle } from '@/lib/title';
import { ScenarioCalculator } from '@/components/ScenarioCalculator';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { ValidationBadge } from '@/components/RegionValidation';
import { useState } from 'react';
import { useI18n } from '@/i18n';
import { disclosureKey, pollutantName } from '@/i18n/messages';
import { useRegion } from '@/data/region';

const RECS = [
  { t: 'recCrosswalkTitle', b: 'recCrosswalkBody' },
  { t: 'recTablesTitle', b: 'recTablesBody' },
  { t: 'recCoordinatesTitle', b: 'recCoordinatesBody' },
  { t: 'recAssessmentTitle', b: 'recAssessmentBody' },
  { t: 'recCriterionTitle', b: 'recCriterionBody' },
];

function groupStats(pairs: WaterbodyPair[]) {
  const m = new Map<string, { needed: number; count: number }>();
  for (const p of pairs) {
    const k = p.pollutant_group;
    const g = m.get(k) ?? { needed: 0, count: 0 };
    g.needed += samplesNeeded(p); g.count += 1;
    m.set(k, g);
  }
  return Array.from(m, ([k, g]) => ({ k, ...g })).sort((a, b) => b.needed - a.needed);
}

function Bars({ rows, asOf }: { rows: ReturnType<typeof groupStats>; asOf: string }) {
  const { t } = useI18n();
  const max = Math.max(1, ...rows.map((row) => row.needed));
  const pairCount = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <div className="card p-5">
      <h3 className="text-base">{t('samplesByGroup')}</h3>
      <ul className="mt-4 grid gap-3">
        {rows.map((r, i) => (
          <li key={r.k}>
            <div className="flex justify-between text-sm"><span className="text-navy">{t(`group${r.k.replace(/[^a-z]/gi, '')}` as 'groupMetals' | 'groupNutrients' | 'groupConventional' | 'groupToxicity' | 'groupOther')}</span><span className="num text-navy">{t('sampleCountLabel', { count: r.needed })}</span></div>
            <div className="relative mt-1 h-2 rounded bg-mist">
              <span className="grow-x absolute inset-y-0 left-0 rounded bg-teal-400" style={{ width: `${(r.needed / max) * 100}%`, animationDelay: `${i * 80}ms` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate">{t('gapChartFoot', { pairs: pairCount, date: fmtDate(asOf) })}</p>
    </div>
  );
}

export default function DataGaps({ data }: { data: Dataset }) {
  const { t } = useI18n();
  usePageTitle(t('gaps'));
  const [scenarioId, setScenarioId] = useState('');
  const md = data.metadata;
  const noSamples = noUsableWaterStats(data.pairs);
  const { regionId } = useRegion();
  const regionName = regionId === 'R3' ? t('regionCentralCoast') : t('regionSanDiego');
  const under = data.pairs.filter((p) => p.screening_flag === 'Under-sampled').sort((a, b) => samplesNeeded(b) - samplesNeeded(a));
  const needed = under.reduce((s, p) => s + samplesNeeded(p), 0);
  const underDac = under.filter((p) => p.disadvantaged_community).length;
  const allDac = data.pairs.filter((p) => p.disadvantaged_community).length;
  const hasCes = data.pairs.some((p) => p.ces_percentile != null && p.disadvantaged_community != null);
  const csvRows = under.map((p, i) => ({
    rank: i + 1, pair_id: p.pair_id, waterbody_name: p.waterbody_name, pollutant: p.pollutant, county: p.county, new_samples: p.new_samples,
    pending_new_samples: p.pending_new_samples, pending_numeric_outside_count: p.pending_numeric_outside_count,
    min_samples_for_delisting: p.min_samples_for_delisting, samples_needed: samplesNeeded(p), new_exceedances: p.new_exceedances,
    ces_percentile: p.ces_percentile, disadvantaged_community: p.disadvantaged_community, data_gap_note: p.data_gap_note ? t('dataGapContext', { count: Math.max(0, p.min_samples_for_delisting - p.new_samples) }) : '',
    dataset_version: md.dataset_version, data_status: t(disclosureKey(md.data_status)),
    in_ceden_as_of: md.monitoring_data_through, recent_data_submission_note: t('recentDataSubmissionNote'),
  }));

  return (
    <div className="wrap pt-10 md:pt-14">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label-caps text-link">{t('dataGapsLabel')}</p>
          <h1 className="mt-2 text-4xl font-bold">{t('zeroSampleHeadline', { count: noSamples.withoutUsableSamples, total: noSamples.total, date: fmtDate(md.cutoff_date), region: regionName })}</h1>
          <p className="prose-nc mt-3">{t('gapDescription', { date: fmtDate(md.cutoff_date) })}</p>
          <DataFreshnessNote date={md.monitoring_data_through} className="mt-2" />
        </div>
        <CsvButton filename={`nextcycle-data-gaps-${md.dataset_version}.csv`} rows={csvRows} columns={Object.keys(csvRows[0] ?? { rank: 1 })} />
      </header>

      <section aria-label={t('summaryFindings')} className="mt-10 grid gap-4 md:grid-cols-12">
        <div className="card p-5 md:col-span-4">
          <p className="label-caps text-slate">{t('samplesNeeded')}</p>
          <p className="num mt-2 text-5xl font-bold text-teal">{needed}</p>
          <span aria-hidden className="grow-x mt-3 block h-1 w-10 rounded bg-amber" />
          <p className="mt-3 text-sm">{t('gapPairsToTest', { count: under.length })}</p>
        </div>
        {hasCes ? <div className="card bg-ice p-5 md:col-span-8">
          <p className="label-caps text-deep">{t('dacOverlap')}</p>
          <p className="mt-2 text-2xl font-semibold leading-snug text-navy">
            {t('dacOverlapCount', { affected: underDac, total: under.length })}
          </p>
          <p className="mt-2 text-sm text-navy">{t('dacOverlapAll', { affected: allDac, total: data.pairs.length })}</p>
        </div> : <div className="card bg-ice p-5 md:col-span-8"><p className="text-sm text-navy">{t('dacUnavailable')}</p></div>}
        <div className="md:col-span-12"><Bars rows={groupStats(under)} asOf={md.monitoring_data_through} /></div>
      </section>

      <section className="mt-8 rounded-lg border border-line bg-white p-5" aria-labelledby="reporting-lag" role="note">
        <h2 id="reporting-lag" className="text-lg">{t('reportingLagTitle')}</h2>
        <p className="mt-2 text-sm text-navy">{t('reportingLagUnavailable')}</p>
        <p className="mt-2 text-sm text-slate">{t('reportingLagCaveat')}</p>
      </section>

      <section aria-labelledby="ranked" className="mt-14">
        <h2 id="ranked" className="text-2xl">{t('rankedBySamples')}</h2>
        {under.length === 0 ? (
          <div className="mt-6"><EmptyState title={t('noPairsNeedSamples')}>{t('everyPairEnough')}</EmptyState></div>
        ) : (
          <ol className="mt-6 grid gap-4">
            {under.map((p, i) => (
              <li key={p.pair_id} data-testid={`card-gap-${p.pair_id}`} className="card lift grid gap-5 p-5 md:grid-cols-[56px_1fr_auto] md:items-center">
                <span className="num text-3xl font-bold text-teal-400">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/w/${p.pair_id}`} className="text-lg font-semibold text-teal hover:underline">{p.waterbody_name}</Link>
                    <FlagBadge flag={p.screening_flag} size="sm" />
                    <ValidationBadge regionId={p.region_id} pairId={p.pair_id} surface="data-gaps" />
                    {p.disadvantaged_community === true && p.ces_percentile != null && <DacBadge ces={p.ces_percentile} />}
                  </div>
                   <p className="text-sm text-navy">{pollutantName(p.pollutant)} · {t('countyName', { county: p.county })} · {t('exceedanceCountSoFar', { count: p.new_exceedances })}</p>
                  <div className="mt-3"><SampleTally n={p.new_samples} exceed={p.new_exceedances} min={p.min_samples_for_delisting} size="sm" showLegend={i === 0} /></div>
                     {(p.pending_new_samples ?? 0) > 0 && <p className="mt-2 text-xs text-slate">{t('pendingObservationCount', { count: p.pending_new_samples ?? 0 })}</p>}
                   {p.data_gap_note && <p className="mt-3 text-sm">{t('dataGapContext', { count: Math.max(0, p.min_samples_for_delisting - p.new_samples) })}</p>}
                </div>
                <div className="text-left md:text-right">
                  <p className="num text-3xl font-bold text-teal">{samplesNeeded(p)}</p>
                   <p className="text-sm font-semibold text-teal">{t('moreSamplesNeeded')}</p>
                   <p className="text-xs text-slate">{t('samplesCollected', { current: p.new_samples, minimum: p.min_samples_for_delisting })}</p>
                   <Link to={`/w/${p.pair_id}`} className="arrow-link mt-2 inline-flex items-center gap-1 text-sm font-semibold text-link">{t('details')} <ArrowRight aria-hidden className="h-3.5 w-3.5" /></Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="gap-scenario" className="mt-12">
        <h2 id="gap-scenario" className="text-2xl">{t('calculatorTitle')}</h2>
        <label htmlFor="gap-scenario-select" className="mt-3 block text-sm font-semibold text-navy">{t('selectPairPrompt')}</label>
        <select id="gap-scenario-select" value={scenarioId} onChange={(e) => setScenarioId(e.target.value)} className="mt-1 w-full max-w-xl rounded-md border border-line bg-white px-3 py-2 text-sm">
          <option value="">{t('selectWaterPrompt')}</option>
          {data.pairs.filter((p) => p.official_status === 'Listed').map((p) => <option key={p.pair_id} value={p.pair_id}>{p.waterbody_name} · {pollutantName(p.pollutant)}</option>)}
        </select>
         {scenarioId && data.pairs.find((p) => p.pair_id === scenarioId) && <ScenarioCalculator pair={data.pairs.find((p) => p.pair_id === scenarioId)!} asOf={md.monitoring_data_through} />}
      </section>

      <section aria-labelledby="recs" className="mt-16 rounded-2xl bg-mist p-6 md:p-10">
        <h2 id="recs" className="text-2xl">{t('recommendedFields')}</h2>
        <p className="prose-nc mt-2">{t('recommendedIntro')}</p>
        <ol className="mt-8 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {RECS.map((r, i) => (
            <li key={r.t} className="flex gap-4">
              <span className="num mt-0.5 text-sm font-bold text-teal">{String(i + 1).padStart(2, '0')}</span>
               <div><h3 className="text-base">{t(r.t as 'recCrosswalkTitle' | 'recTablesTitle' | 'recCoordinatesTitle' | 'recAssessmentTitle' | 'recCriterionTitle')}</h3><p className="mt-1 text-sm">{t(r.b as 'recCrosswalkBody' | 'recTablesBody' | 'recCoordinatesBody' | 'recAssessmentBody' | 'recCriterionBody')}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
