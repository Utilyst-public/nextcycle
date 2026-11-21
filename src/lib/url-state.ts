import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FLAG_VALUES, type Flag, type WaterbodyPair } from '@/data/schema';
import { exceedRate, flagRank } from '@/data/selectors';

export type SortKey = 'waterbody' | 'pollutant' | 'official' | 'flag' | 'exceed' | 'last_sample' | 'ces';
export const SORT_KEYS: SortKey[] = ['waterbody', 'pollutant', 'official', 'flag', 'exceed', 'last_sample', 'ces'];

export interface Filters {
  flag: Flag[];
  group: string[];
  type: string[];
  county: string[];
  dac: boolean;
  q: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
}

const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

export function useWatchFilters() {
  const [params, setParams] = useSearchParams();
  const filters: Filters = useMemo(() => {
    const sort = params.get('sort') as SortKey | null;
    return {
      flag: list(params.get('flag')).filter((f): f is Flag => (FLAG_VALUES as readonly string[]).includes(f)),
      group: list(params.get('group')),
      type: list(params.get('type')),
      county: list(params.get('county')),
      dac: params.get('dac') === '1',
      q: params.get('q') ?? '',
      sort: sort && SORT_KEYS.includes(sort) ? sort : 'flag',
      dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<Filters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            const val = Array.isArray(v) ? v.join(',') : typeof v === 'boolean' ? (v ? '1' : '') : String(v ?? '');
            if (val && !(k === 'sort' && val === 'flag') && !(k === 'dir' && val === 'asc')) next.set(k, val);
            else next.delete(k);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );
  const clear = useCallback(() => setParams(new URLSearchParams(), { replace: true }), [setParams]);
  const activeCount = filters.flag.length + filters.group.length + filters.type.length + filters.county.length + (filters.dac ? 1 : 0) + (filters.q ? 1 : 0);
  return { filters, update, clear, activeCount };
}

export function applyFilters(pairs: WaterbodyPair[], f: Filters) {
  const q = f.q.trim().toLowerCase();
  return pairs.filter(
    (p) =>
      (!f.flag.length || f.flag.includes(p.screening_flag)) &&
      (!f.group.length || f.group.includes(p.pollutant_group)) &&
      (!f.type.length || f.type.includes(p.waterbody_type)) &&
      (!f.county.length || f.county.includes(p.county)) &&
      (!f.dac || p.disadvantaged_community === true) &&
      (!q || `${p.waterbody_name} ${p.pollutant} ${p.waterbody_id} ${p.county} ${p.decision_id}`.toLowerCase().includes(q)),
  );
}

export function sortPairs(pairs: WaterbodyPair[], key: SortKey, dir: 'asc' | 'desc') {
  const val = (p: WaterbodyPair): string | number => {
    switch (key) {
      case 'waterbody': return p.waterbody_name;
      case 'pollutant': return p.pollutant;
      case 'official': return `${p.official_status}-${p.official_category}`;
      case 'flag': return flagRank(p.screening_flag) * 1000 - exceedRate(p) * 100;
      case 'exceed': return exceedRate(p);
      case 'last_sample': return p.last_sample_date;
      case 'ces': return p.ces_percentile ?? -1;
    }
  };
  const m = dir === 'asc' ? 1 : -1;
  return [...pairs].sort((a, b) => {
    const x = val(a), y = val(b);
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return c * m || a.waterbody_name.localeCompare(b.waterbody_name);
  });
}
