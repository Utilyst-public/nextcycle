import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { WaterbodyPair } from '@/data/schema';
import { fmtDate } from '@/lib/format';
import type { SortKey } from '@/lib/url-state';
import { DacBadge, FlagBadge } from './Badges';
import { ValidationBadge } from './RegionValidation';
import { useI18n } from '@/i18n';
import { pollutantName } from '@/i18n/messages';

const COLS: { key: SortKey; label: 'colWaterbody' | 'colResult' | 'colRecentSamples' | 'colLastSampled'; className?: string }[] = [
  { key: 'waterbody', label: 'colWaterbody' },
  { key: 'flag', label: 'colResult' },
  { key: 'exceed', label: 'colRecentSamples', className: 'text-right' },
  { key: 'last_sample', label: 'colLastSampled' },
];

function ExceedCell({ p }: { p: WaterbodyPair }) {
  const { t } = useI18n();
  const pct = p.new_samples ? (p.new_exceedances / p.new_samples) * 100 : 0;
  return (
    <div className="flex min-w-[150px] flex-col gap-1">
      <span className="text-sm text-navy">{t('exceedanceOutside', { count: p.new_exceedances, total: p.new_samples })}</span>
      {(p.pending_new_samples ?? 0) > 0 && <span className="text-xs text-slate" title={t('pendingObservationCount', { count: p.pending_new_samples ?? 0 })}>{t('pendingQaCount', { count: p.pending_new_samples ?? 0 })}</span>}
      <span aria-hidden className="relative h-1.5 w-full overflow-hidden rounded bg-mist">
        <span className="absolute inset-y-0 left-0 rounded bg-amber" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function WaterbodyName({ p, surface }: { p: WaterbodyPair; surface: string }) {
  const { t } = useI18n();
  return <span className="block min-w-0">
    <span className="block truncate font-semibold text-teal">{p.waterbody_name}</span>
    <span className="block text-xs text-navy">{pollutantName(p.pollutant)}</span>
    <ValidationBadge regionId={p.region_id} pairId={p.pair_id} surface={surface} className="mt-1" />
    {p.official_category !== '5' && <span className="block text-xs text-slate">{t('cat', { category: p.official_category })}</span>}
    {p.disadvantaged_community === true && p.ces_percentile != null && <span className="mt-1 block"><DacBadge ces={p.ces_percentile} /></span>}
  </span>;
}

export function WatchTable({ pairs, sort, dir, onSort }: { pairs: WaterbodyPair[]; sort: SortKey; dir: 'asc' | 'desc'; onSort: (k: SortKey) => void }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <>
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-sm">
          <caption className="sr-only">{t('tableCaptionPairs')}</caption>
          <thead><tr className="border-b border-line text-left">
            {COLS.map((col) => {
              const active = sort === col.key;
              const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
              return <th key={col.key} scope="col" aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-4 py-3 ${col.className ?? ''}`}>
                <button data-testid={`button-sort-${col.key}`} onClick={() => onSort(col.key)} className={`label-caps inline-flex items-center gap-1 rounded px-1 py-0.5 hover:text-teal ${active ? 'text-teal' : 'text-slate'}`}>
                  {t(col.label)}<Icon aria-hidden className="h-3.5 w-3.5" />
                </button>
              </th>;
            })}
            <th className="w-8" aria-hidden />
          </tr></thead>
          <tbody>{pairs.map((p, i) => <tr key={p.pair_id} data-testid={`row-pair-${p.pair_id}`} onClick={() => navigate(`/w/${p.pair_id}`)} className={`row-hover group cursor-pointer border-b border-line last:border-0 ${i % 2 ? 'bg-cloud' : 'bg-white'}`}>
            <td className="max-w-[290px] px-4 py-3.5"><Link to={`/w/${p.pair_id}`} onClick={(e) => e.stopPropagation()} className="block"><WaterbodyName p={p} surface="watch-desktop" /></Link></td>
            <td className="px-4 py-3.5"><FlagBadge flag={p.screening_flag} size="sm" /></td>
            <td className="px-4 py-3.5"><ExceedCell p={p} /></td>
            <td className="num whitespace-nowrap px-4 py-3.5 text-navy">{fmtDate(p.last_sample_date)}</td>
            <td className="pr-3"><ChevronRight aria-hidden className="h-4 w-4 text-slate transition-transform group-hover:translate-x-0.5 group-hover:text-teal" /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {pairs.map((p) => <li key={p.pair_id}>
            <Link to={`/w/${p.pair_id}`} data-testid={`card-pair-${p.pair_id}`} className="card lift block p-4">
            <span className="flex items-start justify-between gap-3"><WaterbodyName p={p} surface="watch-mobile" /><ChevronRight aria-hidden className="mt-1 h-4 w-4 shrink-0 text-slate" /></span>
            <span className="mt-3 block"><FlagBadge flag={p.screening_flag} size="sm" /></span>
            <span className="mt-3 flex items-center justify-between gap-3 text-xs text-slate"><ExceedCell p={p} /><span className="shrink-0">{t('lastSampled')}<br /><b className="num font-medium text-navy">{fmtDate(p.last_sample_date)}</b></span></span>
          </Link>
        </li>)}
      </ul>
    </>
  );
}
