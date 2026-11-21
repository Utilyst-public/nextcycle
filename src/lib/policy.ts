import { z } from 'zod';
import type { Flag, WaterbodyPair } from '../data/schema';

const TableSchema = z.object({
  min_samples: z.number().int().positive(),
  rows: z.array(z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
    allowed: z.number().int().nonnegative(),
  })).min(1),
});
export const ListingTablesSchema = z.object({
  source_url: z.string().url(),
  version: z.string(),
  verified_at: z.string(),
  tables: z.object({ '4.1': TableSchema, '4.2': TableSchema }),
}).superRefine((data, ctx) => {
  for (const [key, table] of Object.entries(data.tables)) {
    let end = table.min_samples - 1;
    let allowed = -1;
    for (const row of table.rows) {
      if (row.min !== end + 1 || row.max < row.min || row.allowed < allowed || row.allowed > row.min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid or noncontiguous policy table ${key}` });
      }
      end = row.max;
      allowed = row.allowed;
    }
  }
});
export type ListingTables = z.infer<typeof ListingTablesSchema>;
type Pair = Pick<WaterbodyPair, 'official_status' | 'delisting_table' | 'new_samples' | 'new_exceedances'>;
export interface Scenario {
  flag: Flag | null;
  total: number;
  exceedances: number;
  allowed: number | null;
  reason?: 'invalid' | 'not-listed' | 'outside-coverage';
}

/** Count-only screening using published table rows, never extrapolated. */
export function evaluateScenario(pair: Pair, k: number, m: number, tables: ListingTables): Scenario {
  const total = pair.new_samples + k;
  const exceedances = pair.new_exceedances + m;
  const unknown = (reason: Scenario['reason']): Scenario => ({ flag: null, total, exceedances, allowed: null, reason });
  if (![k, m, pair.new_samples, pair.new_exceedances].every(Number.isSafeInteger) ||
      k < 0 || m < 0 || m > k || pair.new_samples < 0 || pair.new_exceedances < 0 ||
      pair.new_exceedances > pair.new_samples || !Number.isSafeInteger(total)) return unknown('invalid');
  if (pair.official_status !== 'Listed') return unknown('not-listed');
  const table = tables.tables[pair.delisting_table];
  if (!table) return unknown('outside-coverage');
  if (total < table.min_samples) return { flag: 'Under-sampled', total, exceedances, allowed: null };
  const row = table.rows.find((r) => r.min <= total && total <= r.max);
  if (!row) return unknown('outside-coverage');
  return { flag: exceedances <= row.allowed ? 'Delisting candidate' : 'Still exceeding', total, exceedances, allowed: row.allowed };
}

/** Exact minimum within the verified rows; null means not established, not impossible. */
export function minimumCleanSamples(pair: Pair, tables: ListingTables): number | null {
  if (pair.official_status !== 'Listed' || pair.new_exceedances > pair.new_samples) return null;
  const table = tables.tables[pair.delisting_table];
  if (!table) return null;
  for (const row of table.rows) {
    if (pair.new_exceedances <= row.allowed && pair.new_samples <= row.max) {
      return Math.max(0, row.min - pair.new_samples);
    }
  }
  return null;
}
