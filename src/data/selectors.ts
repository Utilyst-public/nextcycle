import { FLAG_VALUES, type Flag, type Station, type WaterbodyPair } from './schema';
import { fmtNum } from '@/lib/format';
import listingTables from '../../public/data/listing_tables.json';

export function countByFlag(pairs: WaterbodyPair[]): Record<Flag, number> {
  const out = { 'Delisting candidate': 0, 'Still exceeding': 0, 'Under-sampled': 0 } as Record<Flag, number>;
  for (const p of pairs) out[p.screening_flag] += 1;
  return out;
}

export const flagRank = (f: Flag) => FLAG_VALUES.indexOf(f);
export const samplesNeeded = (p: WaterbodyPair) => Math.max(0, p.min_samples_for_delisting - p.new_samples);
export const exceedText = (p: WaterbodyPair) => `${p.new_exceedances} of ${p.new_samples} exceed`;
export const exceedRate = (p: WaterbodyPair) => (p.new_samples ? p.new_exceedances / p.new_samples : 0);

export function noUsableWaterStats(pairs: WaterbodyPair[]) {
  const listed = pairs.filter((pair) => pair.official_status === 'Listed');
  const waterSamples = new Map<string, number>();
  for (const pair of listed) {
    waterSamples.set(pair.waterbody_id, (waterSamples.get(pair.waterbody_id) ?? 0) + pair.new_samples);
  }
  return {
    total: waterSamples.size,
    withoutUsableSamples: [...waterSamples.values()].filter((count) => count === 0).length,
  };
}

export function criterionText(p: { criterion_direction: WaterbodyPair['criterion_direction']; criterion_value: number; criterion_value_upper: number | null; criterion_unit?: string }, unit = p.criterion_unit ?? '') {
  const u = unit ? ` ${unit}` : '';
  if (p.criterion_direction === 'upper') return `Not above ${fmtNum(p.criterion_value)}${u}`;
  if (p.criterion_direction === 'lower') return `Not below ${fmtNum(p.criterion_value)}${u}`;
  return `Between ${fmtNum(p.criterion_value)} and ${fmtNum(p.criterion_value_upper ?? 0)}${u}`;
}

export function exceedanceWord(p: WaterbodyPair) {
  return p.criterion_direction === 'upper' ? 'above' : p.criterion_direction === 'lower' ? 'below' : 'outside';
}

export const stationsFor = (p: WaterbodyPair, stations: Station[]) => stations.filter((s) => s.waterbody_id === p.waterbody_id);

export function uniqueSorted<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function topByFlag(pairs: WaterbodyPair[], flag: Flag, n = 5) {
  const list = pairs.filter((p) => p.screening_flag === flag);
  if (flag === 'Delisting candidate') list.sort((a, b) => exceedRate(a) - exceedRate(b) || b.new_samples - a.new_samples);
  else if (flag === 'Still exceeding') list.sort((a, b) => exceedRate(b) - exceedRate(a));
  else list.sort((a, b) => samplesNeeded(b) - samplesNeeded(a));
  return list.slice(0, n);
}

export const FLAG_MEANING: Record<Flag, { means: (p: WaterbodyPair) => string; notMeans: string }> = {
  'Delisting candidate': {
    means: (p) =>
      `Since the cutoff there are at least ${p.min_samples_for_delisting} samples, and no more than ${p.allowed_exceedances_for_delisting ?? 0} are ${exceedanceWord(p)} the criterion. On counts alone, this pair would pass the delisting test in Table ${p.delisting_table}.`,
    notMeans:
      'It does not remove the water from the list. Only the Water Boards and U.S. EPA can delist, and they also weigh evidence NextCycle does not model.',
  },
  'Still exceeding': {
    means: (p) =>
      `Since the cutoff, ${p.new_exceedances} of ${p.new_samples} samples are ${exceedanceWord(p)} the criterion. That is more than the delisting test allows, so the current listing would likely stand.`,
    notMeans: 'It is not a new violation, an enforcement finding or a permit determination.',
  },
  'Under-sampled': {
    means: (p) =>
      `There are ${p.new_samples} eligible samples since the cutoff. The delisting test needs at least ${p.min_samples_for_delisting}, so it cannot be run yet. ${samplesNeeded(p)} more would be needed.${(p.pending_new_samples ?? 0) > 0 ? ` Another ${p.pending_new_samples} recent CEDEN results are pending QA review and are not counted.` : ''}`,
    notMeans: 'It does not mean the water is clean or impaired. It means the newer evidence is thin.',
  },
};

/** Transcribed from adopted Listing Policy (2015), printed pages 14–15. */
export const ALLOWED_EXCEEDANCE_TABLE = (['4.1', '4.2'] as const).map((table) => ({
  table,
  rows: listingTables.tables[table].rows.map((r) => ({ range: `${r.min}–${r.max}`, allowed: r.allowed })),
}));
