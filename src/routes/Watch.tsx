import { Info, Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo } from 'react';
import { CsvButton } from '@/components/CsvButton';
import { EmptyState } from '@/components/States';
import { WatchTable } from '@/components/WatchTable';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { RegionValidationNotice } from '@/components/RegionValidation';
import { FLAG_VALUES, type Dataset, type Flag } from '@/data/schema';
import { countByFlag, uniqueSorted } from '@/data/selectors';
import { useRegion } from '@/data/region';
import { cn, fmtDate } from '@/lib/format';
import { applyFilters, sortPairs, useWatchFilters, type Filters } from '@/lib/url-state';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';
import { dataStatusLabelKey } from '@/i18n/messages';

export default function Watch({ data }: { data: Dataset }) {
  const { t, flagLabel, criterionText } = useI18n();
  usePageTitle(t('watchTitle'));
  const { filters, update, clear, activeCount } = useWatchFilters();
  const hasCes = data.pairs.some((p) => p.ces_percentile != null && p.disadvantaged_community != null);
  const effectiveFilters = hasCes ? filters : { ...filters, dac: false };
  const rows = useMemo(() => sortPairs(applyFilters(data.pairs, effectiveFilters), filters.sort, filters.dir), [data.pairs, filters, hasCes]);
  const groups = uniqueSorted(data.pairs.map((pair) => pair.pollutant_group));
  const types = uniqueSorted(data.pairs.map((pair) => pair.waterbody_type));
  const counties = uniqueSorted(data.pairs.map((pair) => pair.county));
  const counts = countByFlag(data.pairs);
  const md = data.metadata;
  const { regionId } = useRegion();
  const csvRows = rows.map((p) => ({
    pair_id: p.pair_id, waterbody_id: p.waterbody_id, waterbody_name: p.waterbody_name, waterbody_type: p.waterbody_type, county: p.county, region_id: p.region_id,
    pollutant: p.pollutant, pollutant_group: p.pollutant_group, official_status: p.official_status, official_category: p.official_category, official_cycle: p.official_cycle,
    decision_id: p.decision_id, tmdl_status: p.tmdl_status, criterion: criterionText(p), criterion_basis: p.criterion_basis, screening_flag: p.screening_flag,
     new_samples: p.new_samples, new_exceedances: p.new_exceedances, pending_new_samples: p.pending_new_samples, pending_numeric_outside_count: p.pending_numeric_outside_count, allowed_exceedances_for_delisting: p.allowed_exceedances_for_delisting, min_samples_for_delisting: p.min_samples_for_delisting,
    last_sample_date: p.last_sample_date, ces_percentile: p.ces_percentile, disadvantaged_community: p.disadvantaged_community,
     dataset_version: md.dataset_version, data_status: t(dataStatusLabelKey(md.data_status)),
      in_ceden_as_of: md.monitoring_data_through, recent_data_submission_note: t('recentDataSubmissionNote'),
  }));
  const onSort = (key: Filters['sort']) => update({ sort: key, dir: filters.sort === key && filters.dir === 'asc' ? 'desc' : 'asc' });
  const toggle = (values: string[], value: string, setter: (next: string[]) => void) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  const categoryLabel = (value: string) => {
    const keys: Record<string, Parameters<typeof t>[0]> = {
      Metals: 'groupMetals', Nutrients: 'groupNutrients', Conventional: 'groupConventional', Toxicity: 'groupToxicity', Other: 'groupOther',
      'River/Stream': 'typeRiver', 'Lake/Reservoir': 'typeLake', 'Bay/Harbor': 'typeBay', Coastal: 'typeCoastal', 'Lagoon/Estuary': 'typeLagoon',
    };
    return keys[value] ? t(keys[value]) : value;
  };
  const groupChips = (options: string[], selected: string[], onChange: (next: string[]) => void) => options.map((option) => {
    const active = selected.includes(option);
    return <button key={option} type="button" aria-pressed={active} onClick={() => toggle(selected, option, onChange)} className={cn('rounded-full border px-3 py-1 text-[13px] font-medium transition-colors', active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-navy hover:border-teal-400')}>{option}</button>;
  });

  return (
    <div className="wrap pt-10 pb-16 md:pt-14">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div><p className="label-caps text-link">{t('watch')}</p><h1 className="mt-2 text-4xl font-bold">{t('watchTitle')}</h1>
          <p className="prose-nc mt-3">{t('watchIntro', { date: fmtDate(md.cutoff_date) })}</p>
          <DataFreshnessNote date={md.monitoring_data_through} className="mt-2" /></div>
        <CsvButton filename={`nextcycle-watch-list-${md.dataset_version}.csv`} rows={csvRows} columns={Object.keys(csvRows[0] ?? { pair_id: 1 })} />
      </header>
      <RegionValidationNotice regionId={regionId} className="mt-5" />

      <nav aria-label={t('filterByResult')} className="mt-8 flex flex-wrap gap-2 border-b border-line">
        {[{ label: t('allResults'), flag: null as Flag | null, count: data.pairs.length }, ...FLAG_VALUES.map((flag) => ({ label: flagLabel(flag), flag, count: counts[flag] }))].map((tab) => {
          const active = tab.flag ? filters.flag.length === 1 && filters.flag[0] === tab.flag : filters.flag.length === 0;
          return <button key={tab.label} type="button" aria-pressed={active} onClick={() => update({ flag: tab.flag ? [tab.flag] : [] })} className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold ${active ? 'border-teal text-teal' : 'border-transparent text-slate hover:text-navy'}`}>
            {tab.label}<span className={`num rounded-full px-1.5 py-0.5 text-xs ${active ? 'bg-teal text-white' : 'bg-mist text-slate'}`}>{tab.count}</span>
          </button>;
        })}
      </nav>

      <section aria-label={t('watchFilters')} className="mt-5 rounded-xl border border-line bg-white p-4 md:p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(230px,1fr)_2fr_auto] lg:items-end">
          <div>
            <label htmlFor="q" className="label-caps mb-2 block text-slate">{t('search')}</label>
            <div className="relative"><Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
              <input id="q" data-testid="input-search" type="search" value={filters.q} onChange={(event) => update({ q: event.target.value })} placeholder={t('waterbodyOrPollutant')} className="w-full rounded-lg border border-line bg-cloud py-2.5 pl-9 pr-3 text-sm text-navy placeholder:text-slate focus:border-teal focus:outline-none" />
            </div>
          </div>
          <fieldset><legend className="label-caps mb-2 text-slate">{t('pollutantGroup')}</legend><div className="flex flex-wrap gap-2">{groups.map((option) => { const active = filters.group.includes(option); return <button key={option} type="button" aria-pressed={active} onClick={() => toggle(filters.group, option, (group) => update({ group }))} className={cn('rounded-full border px-3 py-1 text-[13px] font-medium transition-colors', active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-navy hover:border-teal-400')}>{categoryLabel(option)}</button>; })}</div></fieldset>
           {hasCes && <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-navy">
            <input data-testid="toggle-dac" type="checkbox" checked={filters.dac} onChange={(event) => update({ dac: event.target.checked })} className="h-4 w-4 accent-[var(--nc-deep-teal)]" />
            {t('dacFilter')}
            <span className="cursor-help text-slate" title={t('cesThreshold')} aria-label={t('cesThreshold')}><Info aria-hidden className="h-4 w-4" /></span>
          </label>}
        </div>
        <details className="mt-4 border-t border-line pt-3">
          <summary data-testid="button-more-filters" className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-link"><SlidersHorizontal aria-hidden className="h-4 w-4" /> {t('moreFilters')} <span className="text-xs font-normal text-slate">{t('county')} · {t('waterbodyType')}</span></summary>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            <fieldset><legend className="label-caps mb-2 text-slate">{t('county')}</legend><div className="flex flex-wrap gap-2">{groupChips(counties, filters.county, (county) => update({ county }))}</div></fieldset>
            <fieldset><legend className="label-caps mb-2 text-slate">{t('waterbodyType')}</legend><div className="flex flex-wrap gap-2">{types.map((option) => { const active = filters.type.includes(option); return <button key={option} type="button" aria-pressed={active} onClick={() => toggle(filters.type, option, (type) => update({ type }))} className={cn('rounded-full border px-3 py-1 text-[13px] font-medium transition-colors', active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-navy hover:border-teal-400')}>{categoryLabel(option)}</button>; })}</div></fieldset>
          </div>
        </details>
      </section>

      <section aria-label={t('results')} className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p aria-live="polite" data-testid="text-result-count" className="text-navy">{t('showingResults', { shown: rows.length, total: data.pairs.length })}</p>
          {activeCount > 0 && <button data-testid="button-clear-filters" onClick={clear} className="inline-flex items-center gap-1 rounded px-2 py-1 font-semibold text-link hover:bg-mist"><X aria-hidden className="h-3.5 w-3.5" /> {t('clearFilters')}</button>}
        </div>
        {rows.length ? <WatchTable pairs={rows} sort={filters.sort} dir={filters.dir} onSort={onSort} /> : <EmptyState title={t('noFilterMatches')} action={<button onClick={clear} className="btn btn-primary">{t('clearFilters')}</button>}>{t('tryOtherFilters')}</EmptyState>}
      </section>
    </div>
  );
}
