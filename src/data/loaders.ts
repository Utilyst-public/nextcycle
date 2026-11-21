import type { z } from 'zod';
import {
  AboutSchema,
  MetadataSchema,
  SampleFileSchema,
  StationsSchema,
  WaterbodiesSchema,
  type Dataset,
  type SampleFile,
  type WaterbodyPair,
} from './schema';

export class DataLoadError extends Error {
  file: string;
  details: string[];
  constructor(file: string, message: string, details: string[] = []) {
    super(message);
    this.name = 'DataLoadError';
    this.file = file;
    this.details = details;
  }
}

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

async function loadJson<S extends z.ZodTypeAny>(file: string, schema: S): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(`${BASE}data/${file}`, { cache: 'no-cache' });
  } catch {
    throw new DataLoadError(file, 'The file could not be reached. Check your connection and try again.');
  }
  if (!res.ok) throw new DataLoadError(file, `The file returned HTTP ${res.status}.`);
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new DataLoadError(file, 'The file is not valid JSON.');
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new DataLoadError(
      file,
      'The file does not match the NextCycle data contract.',
      parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return parsed.data;
}

let datasetPromise: Promise<Dataset> | null = null;

/** Validated build-time data avoids a loading-screen layout shift on static pages.
 * Development (without this inert JSON tag) still loads the same public files.
 */
export function readBootstrapDataset(): Dataset | null {
  const element = document.getElementById('nextcycle-bootstrap');
  if (!element?.textContent) return null;
  try {
    const raw = JSON.parse(element.textContent);
    const data: Dataset = {
      metadata: MetadataSchema.parse(raw.metadata),
      pairs: WaterbodiesSchema.parse(raw.pairs),
      stations: StationsSchema.parse(raw.stations),
      about: AboutSchema.parse(raw.about),
    };
    const ids = new Set(data.pairs.map((p) => p.pair_id));
    const regions = new Set(data.metadata.regions.map((r) => r.region_id));
    if (ids.size !== data.pairs.length || data.pairs.some((p) => !regions.has(p.region_id))) throw new Error('Invalid embedded dataset references');
    datasetPromise = Promise.resolve(data);
    return data;
  } catch (error) {
    // A broken embedded payload is reported rather than replaced with demo data.
    throw new DataLoadError('nextcycle-bootstrap', 'The file does not match the NextCycle data contract.', [error instanceof Error ? error.message : 'Invalid embedded JSON']);
  }
}

export function loadDataset(force = false): Promise<Dataset> {
  if (!datasetPromise || force) {
    datasetPromise = (async () => {
      const [metadata, pairs, stations, about] = await Promise.all([
        loadJson('metadata.json', MetadataSchema),
        loadJson('waterbodies.json', WaterbodiesSchema),
        loadJson('stations.json', StationsSchema),
        loadJson('about.json', AboutSchema),
      ]);
      const seen = new Set<string>();
      const problems: string[] = [];
      const regions = new Set(metadata.regions.map((r) => r.region_id));
      for (const p of pairs) {
        if (seen.has(p.pair_id)) problems.push(`Duplicate pair_id ${p.pair_id}`);
        seen.add(p.pair_id);
        if (!regions.has(p.region_id)) problems.push(`${p.pair_id}: region ${p.region_id} is not in metadata.regions`);
      }
      if (problems.length) throw new DataLoadError('waterbodies.json', 'Cross-file checks failed.', problems);
      return { metadata, pairs, stations, about };
    })();
    datasetPromise.catch(() => {
      datasetPromise = null;
    });
  }
  return datasetPromise;
}

const sampleCache = new Map<string, Promise<SampleFile>>();

export function loadSamples(pair: WaterbodyPair, cutoff: string, force = false): Promise<SampleFile> {
  const key = pair.pair_id;
  if (!sampleCache.has(key) || force) {
    const file = `samples/${encodeURIComponent(key)}.json`;
    const p = loadJson(file, SampleFileSchema).then((s) => {
      const problems: string[] = [];
      if (s.pair_id !== pair.pair_id) problems.push(`pair_id is ${s.pair_id}, expected ${pair.pair_id}`);
      const post = s.results.filter((r) => !r.before_cutoff);
      const eligible = post.filter((r) => r.screening_eligible);
      const pending = post.filter((r) => !r.screening_eligible);
      if (eligible.length !== pair.new_samples) problems.push(`${eligible.length} eligible post-cutoff results, but waterbodies.json says ${pair.new_samples}`);
      const ex = eligible.filter((r) => r.exceeds).length;
      if (ex !== pair.new_exceedances) problems.push(`${ex} eligible post-cutoff exceedances, but waterbodies.json says ${pair.new_exceedances}`);
      if (pending.length !== (pair.pending_new_samples ?? 0)) problems.push(`${pending.length} pending post-cutoff results, but waterbodies.json says ${pair.pending_new_samples ?? 0}`);
      const pendingOutside = pending.filter((r) => r.value != null && r.exceeds).length;
      if (pendingOutside !== (pair.pending_numeric_outside_count ?? 0)) problems.push(`${pendingOutside} pending numeric outside-criterion comparisons, but waterbodies.json says ${pair.pending_numeric_outside_count ?? 0}`);
      if (s.results.some((r) => r.value == null && r.exceeds)) problems.push('a non-numeric result cannot be compared with a criterion');
      const bad = s.results.filter((r) => r.before_cutoff !== r.date <= cutoff);
      if (bad.length) problems.push(`${bad.length} results have before_cutoff inconsistent with ${cutoff}`);
      if (problems.length) throw new DataLoadError(file, 'Sample file disagrees with the summary record.', problems);
      return s;
    });
    p.catch(() => sampleCache.delete(key));
    sampleCache.set(key, p);
  }
  return sampleCache.get(key)!;
}
