import { ArrowRight, ClipboardCheck, Landmark, Users, Waves } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FlagBadge } from '@/components/Badges';
import type { Dataset } from '@/data/schema';
import { countByFlag, noUsableWaterStats, topByFlag } from '@/data/selectors';
import { fmtDate } from '@/lib/format';
import { usePageTitle } from '@/lib/title';
import { Discovery } from '@/components/Discovery';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { RegionValidationNotice, ValidationBadge } from '@/components/RegionValidation';
import { useRegion } from '@/data/region';
import { useI18n } from '@/i18n';
import { pollutantName } from '@/i18n/messages';

const MapView = lazy(() => import('@/components/MapView'));

const OUTCOMES = [
  { flag: 'Delisting candidate' as const, key: 'outcomeImproving' as const },
  { flag: 'Still exceeding' as const, key: 'outcomeStill' as const },
  { flag: 'Under-sampled' as const, key: 'outcomeUnder' as const },
];
const STEPS = [
  { icon: Landmark, title: 'officialListStart' as const, body: 'officialListBody' as const },
  { icon: Waves, title: 'newerResults' as const, body: 'newerResultsBody' as const },
  { icon: ClipboardCheck, title: 'countRules' as const, body: 'countRulesBody' as const },
];
const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export default function Home({ data }: { data: Dataset }) {
  const { t, flagLabel } = useI18n();
  usePageTitle(t('home'), t('pageSummary'));
  const navigate = useNavigate();
  const [mapVisible, setMapVisible] = useState(false);
  const [refresh, setRefresh] = useState<{ date: string; dataset_version: string; changes: number | null } | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${BASE}data/history.json`).then(async (r) => r.ok ? r.json() : null).then((items: unknown) => {
      if (alive && Array.isArray(items) && items.length && typeof items[items.length - 1]?.date === 'string') {
        const latest = items[items.length - 1];
        const previous = [...items].slice(0, -1).reverse().find((x: any) => x.data_status === latest.data_status);
        let changes: number | null = null;
        if (previous && Array.isArray(previous.pairs) && Array.isArray(latest.pairs)) {
          const old = new Map(previous.pairs.map((p: any) => [p.pair_id, p]));
          changes = latest.pairs.filter((p: any) => {
            const q = old.get(p.pair_id) as any;
            return !q || p.screening_flag !== q.screening_flag || p.new_samples !== q.new_samples || p.new_exceedances !== q.new_exceedances || p.pending_new_samples !== q.pending_new_samples;
          }).length;
        }
        setRefresh({ date: latest.date, dataset_version: latest.dataset_version, changes });
      }
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  const counts = countByFlag(data.pairs);
  const noSamples = noUsableWaterStats(data.pairs);
  const { regionId } = useRegion();
  const regionName = regionId === 'R3' ? t('regionCentralCoast') : t('regionSanDiego');
  return (
    <>
      <section className="wrap grid gap-8 py-10 md:py-16 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="lg:col-span-6">
          <p className="label-caps text-link">{t('heroEyebrow')}</p>
          <h1 className="mt-4 max-w-2xl text-[2.45rem] font-bold leading-[1.04] md:text-5xl lg:text-[3.55rem]">{t('zeroSampleHeadline', { count: noSamples.withoutUsableSamples, total: noSamples.total, date: fmtDate(data.metadata.cutoff_date), region: regionName })}</h1>
          <p className="prose-nc mt-6 text-lg">{t('heroBody')}</p>
          <DataFreshnessNote date={data.metadata.monitoring_data_through} className="mt-3" />
          <RegionValidationNotice regionId={regionId} className="mt-4 max-w-2xl" />
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/map" className="btn btn-primary arrow-link">{t('exploreMap')} <ArrowRight aria-hidden className="h-4 w-4" /></Link>
            <Link to="/watch" className="btn btn-ghost">{t('seeWaters')}</Link>
          </div>
        </div>
        <div className="lg:col-span-6">
          <div className="relative h-[340px] overflow-hidden rounded-xl border border-line bg-mist md:h-[420px]">
            {!mapVisible && <div className="relative grid h-full place-items-center overflow-hidden p-8 text-center">
              <div aria-hidden className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(132deg, transparent 45%, #a9d3cd 46%, #a9d3cd 47%, transparent 48%),linear-gradient(24deg, transparent 57%, #a9d3cd 58%, #a9d3cd 59%, transparent 60%),radial-gradient(circle at 31% 39%, #167680 0 5px, transparent 6px),radial-gradient(circle at 67% 62%, #fec951 0 5px, transparent 6px)' }} />
              <div className="relative max-w-sm rounded-xl border border-line bg-white/95 p-6 shadow-sm">
                <p className="label-caps text-link">{t('waterMonitoringCalifornia')}</p><p className="mt-2 text-sm text-slate">{t('mapPreviewNote')}</p>
                <button type="button" data-testid="button-load-home-map" onClick={() => setMapVisible(true)} className="btn btn-primary mt-4">{t('loadMapPreview')}</button>
                <Link className="ml-2 inline-flex text-sm font-semibold text-link hover:underline" to="/map">{t('openFullMap')}</Link>
              </div>
            </div>}
            {mapVisible &&
            <Suspense fallback={<div className="skeleton h-full w-full rounded-none" />}>
              <MapView compact pairs={data.pairs} stations={data.stations} ariaLabel={t('mapIntro', { region: regionName })} onSelect={(id) => id && navigate(`/map?pair=${encodeURIComponent(id)}`)} />
            </Suspense>}
          </div>
        </div>
      </section>

      <section className="wrap pb-8"><Discovery data={data} /></section>
      {refresh && <section className="wrap pb-10"><Link to="/updates" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-5 text-navy hover:border-teal-400">
        <span><span className="label-caps block text-link">{t('latestRefresh')} · {fmtDate(refresh.date)}</span><span className="mt-1 block text-sm">{t('datasetVersionLabel')} {refresh.dataset_version} · {refresh.changes === null ? t('noComparableBaseline') : `${refresh.changes} ${t('changedPairs')}`}</span></span><ArrowRight aria-hidden className="h-5 w-5 text-link" />
      </Link></section>}
      <section className="wrap pb-14" aria-label={t('screeningOutcomes')}>
        <div className="grid gap-4 md:grid-cols-3">
          {OUTCOMES.map(({ flag, key }) => {
            const example = topByFlag(data.pairs, flag, 1)[0];
            return (
              <Link key={flag} to={`/watch?flag=${encodeURIComponent(flag)}`} className="card lift flex min-h-[220px] flex-col p-5 no-underline">
                <FlagBadge flag={flag} subline />
                <p className="num mt-5 text-4xl font-bold leading-none text-teal">{counts[flag]}</p>
                <p className="mt-3 text-sm text-navy">{t(key)}</p>
                {example && <p className="mt-3 flex flex-wrap items-center gap-1 text-xs text-slate">{t('example')} <span className="font-semibold text-navy">{example.waterbody_name}</span>, {pollutantName(example.pollutant.toLowerCase())}. <ValidationBadge regionId={example.region_id} pairId={example.pair_id} surface="home" /></p>}
                <span className="arrow-link mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-link">{t('viewWaters', { status: flagLabel(flag) })}<ArrowRight aria-hidden className="h-4 w-4" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-teal py-12 text-white md:py-16" aria-labelledby="why">
        <div className="wrap grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="label-caps text-teal-200">{t('whyMatters')}</p>
            <h2 id="why" className="mt-3 text-3xl text-white md:text-4xl">{t('headStart')}</h2>
          </div>
          <ul className="grid gap-6 md:grid-cols-3 lg:col-span-8">
            {[
              { icon: Landmark, title: 'utilities', text: 'utilitiesWhy' },
              { icon: Users, title: 'communities', text: 'communitiesWhy' },
              { icon: Waves, title: 'regulators', text: 'regulatorsWhy' },
            ].map((point) => <li key={point.title} className="border-t border-white/25 pt-4">
              <point.icon aria-hidden className="h-5 w-5 text-cyan" />
              <h3 className="mt-3 text-lg text-white">{point.title === 'utilities' ? t('utilities') : point.title === 'communities' ? t('communityAudience') : t('regulatorAudience')}</h3>
              <p className="mt-1 text-sm text-white/85">{t(point.text as 'utilitiesWhy' | 'communitiesWhy' | 'regulatorsWhy')}</p>
            </li>)}
          </ul>
        </div>
      </section>

      <section className="wrap py-14 md:py-16" aria-labelledby="how">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="label-caps text-link">{t('howItWorks')}</p><h2 id="how" className="mt-2 text-3xl">{t('simpleOpenScreen')}</h2></div>
          <Link to="/method" className="arrow-link inline-flex items-center gap-1 font-semibold text-link">{t('method')} <ArrowRight aria-hidden className="h-4 w-4" /></Link>
        </div>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => <li key={step.title} className="border-t-2 border-teal-200 pt-4">
            <div className="flex items-center gap-3"><span className="label-caps text-link">{[t('first'), t('next'), t('then')][i]}</span><step.icon aria-hidden className="h-5 w-5 text-teal" /></div>
            <h3 className="mt-4 text-xl">{t(step.title)}</h3>
            <p className="mt-2 text-sm">{t(step.body)}</p>
          </li>)}
        </ol>
      </section>

      <section className="border-y border-line bg-white py-6" aria-label={t('monitoringTimeline')}>
        <p className="wrap text-center text-sm font-medium text-navy md:text-base">
          {t('officialList')}: {t('dataThrough')} {fmtDate(data.metadata.cutoff_date)} <span className="mx-2 text-teal">→</span>
          {t('nextCycleData')}: {t('dataThrough')} {fmtDate(data.metadata.monitoring_data_through)} <span className="mx-2 text-teal">→</span>
          {t('timelineNext')}: {data.metadata.next_cycle.match(/\d{4}/)?.[0] ?? '2028'} ({t('expected')})
        </p>
      </section>
    </>
  );
}
