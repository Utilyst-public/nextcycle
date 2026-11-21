import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { MetadataSchema, WaterbodiesSchema, StationsSchema, AboutSchema, SampleFileSchema } from '../src/data/schema.ts';
import { ListingTablesSchema, evaluateScenario } from '../src/lib/policy.ts';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
export const xml = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
export const jsonText = (value) => JSON.stringify(value, null, 2) + '\n';
export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, jsonText(value));
}
export function siteSettings(metadata, env = process.env) {
  const url = new URL(env.VITE_SITE_URL || metadata.site_url || 'https://nextcycle.tech');
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('VITE_SITE_URL must be a public HTTP(S) URL without credentials, query or fragment');
  // The site URL supplies an origin; only VITE_BASE_PATH controls routing,
  // matching Vite and the client helper even if metadata includes a URL path.
  const base = '/' + (env.VITE_BASE_PATH || '/').split('/').filter(Boolean).join('/');
  const prefix = base === '/' ? '/' : base + '/';
  if (/[<>"?#\\]/.test(prefix) || prefix.split('/').some((part) => part === '..' || part === '.')) throw new Error('Invalid base path');
  return { origin: url.origin, base: prefix, absolute: (route = '') => url.origin + prefix + route.replace(/^\/+/, '') };
}
export const snapshotPairs = (pairs) => pairs.map((p) => ({
  pair_id: p.pair_id, waterbody_name: p.waterbody_name, pollutant: p.pollutant,
  screening_flag: p.screening_flag, new_samples: p.new_samples, new_exceedances: p.new_exceedances,
  pending_new_samples: p.pending_new_samples ?? 0,
})).sort((a, b) => a.pair_id.localeCompare(b.pair_id));
const HistoryEntry = z.object({
  date: z.string().datetime({ offset: true }), dataset_version: z.string().min(1),
  data_status: z.enum(['illustrative', 'provisional', 'reviewed']), is_sample_data: z.boolean(),
  qa_rule_version: z.string().min(1).optional(),
  pairs: z.array(z.object({
    pair_id: z.string(), waterbody_name: z.string(), pollutant: z.string(),
    screening_flag: z.enum(['Delisting candidate', 'Still exceeding', 'Under-sampled']),
    new_samples: z.number().int().nonnegative(), new_exceedances: z.number().int().nonnegative(),
    pending_new_samples: z.number().int().nonnegative(),
  })),
});
export function nextHistory(history, metadata, pairs) {
  z.array(HistoryEntry).parse(history);
  const next = { date: metadata.generated_at, dataset_version: metadata.dataset_version, data_status: metadata.data_status, is_sample_data: metadata.is_sample_data, ...(metadata.qa_rule_version ? { qa_rule_version: metadata.qa_rule_version } : {}), pairs: snapshotPairs(pairs) };
  for (let i = 0; i < history.length; i++) {
    if (i && Date.parse(history[i].date) < Date.parse(history[i - 1].date)) throw new Error('History dates must be oldest-first');
    if (new Set(history[i].pairs.map((p) => p.pair_id)).size !== history[i].pairs.length) throw new Error('History contains duplicate pair IDs');
    if (history[i].pairs.some((p) => p.new_exceedances > p.new_samples)) throw new Error('History exceedances exceed sample count');
  }
  const previous = history.find((h) => h.dataset_version === next.dataset_version && h.data_status === next.data_status);
  if (previous) {
    if (JSON.stringify(previous.pairs) !== JSON.stringify(next.pairs) || previous.date !== next.date) throw new Error('Dataset content changed without a new dataset_version/generated_at; preserve history and version this refresh.');
    if (previous !== history.at(-1)) throw new Error('Cannot reuse an earlier refresh version.');
    return history;
  }
  if (history.length && Date.parse(next.date) < Date.parse(history.at(-1).date)) throw new Error('New refresh predates the last recorded refresh');
  return [...history, next];
}
export function changesBetween(previous, current) {
  if (!previous || previous.data_status !== current.data_status || previous.qa_rule_version !== current.qa_rule_version) return { flags: 0, samples: 0, added: 0, changed: 0 };
  const old = new Map(previous.pairs.map((p) => [p.pair_id, p]));
  return current.pairs.reduce((out, p) => {
    const before = old.get(p.pair_id);
    if (!before) { out.added++; out.changed++; return out; }
    if (before.screening_flag !== p.screening_flag) out.flags++;
    out.samples += Math.max(0, p.new_samples - before.new_samples);
    if (p.new_samples !== before.new_samples || p.new_exceedances !== before.new_exceedances ||
        (p.pending_new_samples ?? 0) !== before.pending_new_samples || p.screening_flag !== before.screening_flag) out.changed++;
    return out;
  }, { flags: 0, samples: 0, added: 0, changed: 0 });
}
const freshnessFields = (metadata) => ({
  in_ceden_as_of: metadata.monitoring_data_through,
  recent_data_submission_note: 'Recent data may not have been submitted yet.',
});
export function csvFor(pairs, metadata) {
  const rows = metadata ? pairs.map((pair) => ({ ...pair, ...freshnessFields(metadata) })) : pairs;
  const headers = [...new Set(rows.flatMap((p) => Object.keys(p)))];
  if (!headers.length) headers.push('pair_id');
  const cell = (v) => {
    let s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (typeof v === 'string' && /^\s*[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return '\ufeff' + headers.map(cell).join(',') + '\r\n' + rows.map((p) => headers.map((key) => cell(p[key])).join(',')).join('\r\n') + '\r\n';
}
export async function validateDataset(dataDir) {
  const metadata = MetadataSchema.parse(await readJson(path.join(dataDir, 'metadata.json')));
  if (metadata.data_status === 'illustrative' && !metadata.is_sample_data)
    throw new Error('An illustrative release must be marked as sample data.');
  if (metadata.data_status === 'provisional' && metadata.is_sample_data)
    throw new Error('A provisional release must contain real source records, not illustrative sample data.');
  if (metadata.data_status === 'reviewed' && (metadata.is_sample_data || metadata.review_complete !== true))
    throw new Error('A reviewed release requires real records and review_complete: true after the human review checklist is complete.');
  const pairs = WaterbodiesSchema.parse(await readJson(path.join(dataDir, 'waterbodies.json')));
  const stations = StationsSchema.parse(await readJson(path.join(dataDir, 'stations.json')));
  const about = AboutSchema.parse(await readJson(path.join(dataDir, 'about.json')));
  const tables = ListingTablesSchema.parse(await readJson(path.join(dataDir, 'listing_tables.json')));
  const seen = new Set();
  const regions = new Set(metadata.regions.map((r) => r.region_id));
  for (const pair of pairs) {
    // IDs become filenames, URLs and feed anchors. Reject path traversal instead of rewriting identifiers.
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(pair.pair_id) || pair.pair_id.includes('..')) throw new Error(`Unsafe pair_id: ${pair.pair_id}`);
    if (seen.has(pair.pair_id)) throw new Error(`Duplicate pair_id: ${pair.pair_id}`);
    seen.add(pair.pair_id);
    if (!regions.has(pair.region_id)) throw new Error(`Unknown region in ${pair.pair_id}`);
    if (pair.official_status === 'Listed' && pair.min_samples_for_delisting !== tables.tables[pair.delisting_table].min_samples) {
      throw new Error(`${pair.pair_id}: supplied minimum disagrees with the selected policy table`);
    }
    const scenario = evaluateScenario(pair, 0, 0, tables);
    if (scenario.flag && (scenario.flag !== pair.screening_flag || scenario.allowed !== pair.allowed_exceedances_for_delisting)) {
      throw new Error(`${pair.pair_id}: supplied screening counts disagree with the published policy table`);
    }
    const samples = SampleFileSchema.parse(await readJson(path.join(dataDir, 'samples', pair.pair_id + '.json')));
    const post = samples.results.filter((r) => !r.before_cutoff);
    const eligiblePost = post.filter((r) => r.screening_eligible);
    const pendingPost = post.filter((r) => !r.screening_eligible);
    if (samples.pair_id !== pair.pair_id ||
        eligiblePost.length !== pair.new_samples ||
        eligiblePost.filter((r) => r.exceeds).length !== pair.new_exceedances ||
        pendingPost.length !== (pair.pending_new_samples ?? 0) ||
        pendingPost.filter((r) => r.value != null && r.exceeds).length !== (pair.pending_numeric_outside_count ?? 0)) {
      throw new Error(`${pair.pair_id}: sample file disagrees with eligible or pending counts`);
    }
    if (samples.results.some((r) => r.value == null && r.exceeds)) throw new Error(`${pair.pair_id}: a non-numeric result cannot be compared with a criterion`);
    if (samples.unit !== pair.criterion_unit || samples.criterion_direction !== pair.criterion_direction || samples.criterion_value !== pair.criterion_value || samples.criterion_value_upper !== pair.criterion_value_upper) {
      throw new Error(`${pair.pair_id}: sample file criterion disagrees with supplied criterion`);
    }
    if (samples.results.some((r) => r.before_cutoff !== (r.date <= metadata.cutoff_date))) throw new Error(`${pair.pair_id}: cutoff mismatch`);
    const linked = new Set(stations.filter((s) => s.waterbody_id === pair.waterbody_id).map((s) => s.station_code));
    if (samples.results.some((r) => !linked.has(r.station_code))) throw new Error(`${pair.pair_id}: sample station has no linked station`);
  }
  return { metadata, pairs, stations, about, tables };
}

const flagLabel = (flag) => ({ 'Delisting candidate': 'Improving', 'Still exceeding': 'Still impaired', 'Under-sampled': 'Needs more data' }[flag] || flag);
function wrapText(text, limit = 45, maxLines = 3) {
  const lines = [];
  for (const word of text.split(/\s+/)) {
    if (!lines.length || lines.at(-1).length + word.length + 1 > limit) lines.push(word);
    else lines[lines.length - 1] += ' ' + word;
  }
  return lines.slice(0, maxLines).map((line, i) => `<tspan x="72" dy="${i ? 49 : 0}">${xml(line.slice(0, 65))}${i === maxLines - 1 && lines.length > maxLines ? '…' : ''}</tspan>`).join('');
}
async function socialImage(file, pair, md) {
  const direction = pair.criterion_direction === 'lower' ? 'below minimum' : pair.criterion_direction === 'range' ? 'outside range' : 'above limit';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#095c53"/><rect x="0" y="500" width="1200" height="130" fill="#043f3a"/>
  <g fill="#fff" font-family="DejaVu Sans,Arial,sans-serif">
  <text x="72" y="82" font-size="30" font-weight="bold">NextCycle <tspan fill="#4adbd0" font-size="20">/ California water evidence</tspan></text>
  <text x="72" y="156" fill="#91eee2" font-size="22">${xml(flagLabel(pair.screening_flag))} · ${xml(pair.pollutant)}</text>
  <text x="72" y="223" font-size="41" font-weight="bold">${wrapText(pair.waterbody_name)}</text>
  <text x="72" y="410" font-size="27">${pair.new_exceedances} of ${pair.new_samples} recent samples ${direction}</text>
  <text x="72" y="459" font-size="21">CEDEN data as of ${xml(md.monitoring_data_through)} · ${xml(md.dataset_version)}</text>
  <text x="72" y="488" font-size="17">Recent data may not have been submitted yet.</text>
  <text x="72" y="548" font-size="23">${md.data_status === 'illustrative' ? 'ILLUSTRATIVE SAMPLE DATA — NOT A REAL ASSESSMENT' : md.data_status === 'provisional' ? 'REAL PUBLIC DATA — PROVISIONAL SCREENING, NOT YET REVIEWED — NOT A REGULATORY DETERMINATION' : 'SCREENING ESTIMATE — NOT A REGULATORY DETERMINATION'}</text>
  <text x="72" y="593" font-size="19">nextcycle.tech · Only the Water Boards and EPA can change the official list.</text>
  </g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(file);
}
export async function generateRelease({ projectRoot = root, env = process.env, images = true } = {}) {
  const publicDir = path.join(projectRoot, 'public');
  const dataDir = path.join(publicDir, 'data');
  const { metadata, pairs, stations } = await validateDataset(dataDir);
  const { absolute } = siteSettings(metadata, env);
  const historyFile = path.join(dataDir, 'history.json');
  let history = [];
  try { history = await readJson(historyFile); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  history = nextHistory(history, metadata, pairs);
  // Atomic replacement: failed runs cannot truncate the existing history.
  await fs.writeFile(historyFile + '.tmp', jsonText(history));
  await fs.rename(historyFile + '.tmp', historyFile);
  let associations = { associations: [] };
  try { associations = await readJson(path.join(dataDir, 'place_associations.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const places = pairs.map((p) => {
    // Cached spatial associations apply only to the exact official line geometry.
    const geometryHash = createHash('sha256').update(JSON.stringify(p.geometry)).digest('hex');
    const extra = associations.associations.find((a) => a.pair_id === p.pair_id && a.geometry_sha256 === geometryHash);
    return {
      pair_id: p.pair_id, waterbody_name: p.waterbody_name, county: p.county,
      cities: [...new Set([...(p.cities ?? []), ...(extra?.cities ?? [])])],
      zips: [...new Set([...(p.zip_codes ?? []), ...(extra?.zips ?? [])])],
      lat: p.centroid.lat, lon: p.centroid.lon,
    };
  });
  await writeJson(path.join(dataDir, 'places.json'), places);
  await writeJson(path.join(dataDir, 'validation.json'), {
    dataset_version: metadata.dataset_version,
    data_status: metadata.data_status,
    is_sample_data: metadata.is_sample_data,
    review_complete: metadata.review_complete ?? false,
    checked_at: new Date().toISOString(),
    scope: 'Automated structural integrity checks only; not independent validation of measurements, geographic intersections, criterion selection or regulatory determinations. Human review status is supplied separately and is not established by these checks.',
    pair_count: pairs.length,
    station_count: stations.length,
    checks: [
      { name: 'Dataset and sample schemas', status: 'passed' },
      { name: 'Unique safe identifiers and known regions', status: 'passed' },
      { name: 'Published-table count consistency within verified coverage', status: 'passed' },
      { name: 'Sample totals, exceedance totals and cutoff flags', status: 'passed' },
      { name: 'Criterion fields, units and station associations', status: 'passed' },
      { name: 'Append-only versioned refresh history', status: 'passed' },
    ],
  });
  const apiDir = path.join(publicDir, 'api', 'v1');
  const publishedPairs = pairs.map((pair) => ({ ...pair, ...freshnessFields(metadata) }));
  await fs.rm(path.join(apiDir, 'waters'), { recursive: true, force: true });
  await writeJson(path.join(apiDir, 'waters.json'), publishedPairs);
  await writeJson(path.join(apiDir, 'meta.json'), { ...metadata, api_version: 'v1', app_version: '0.3.0', data_license_note: 'Application code is MIT; upstream datasets retain their source terms.', endpoints: ['waters.json', 'waters/{pair_id}.json', 'data-gaps.json', 'meta.json', 'waters.csv'] });
  await writeJson(path.join(apiDir, 'data-gaps.json'), publishedPairs.filter((p) => p.screening_flag === 'Under-sampled').map((p) => ({ ...p, samples_needed: Math.max(0, p.min_samples_for_delisting - p.new_samples) })));
  for (const p of publishedPairs) await writeJson(path.join(apiDir, 'waters', p.pair_id + '.json'), p);
  await fs.writeFile(path.join(apiDir, 'waters.csv'), csvFor(pairs, metadata));
  const entries = history.map((h, i) => {
    const changes = changesBetween(history[i - 1], h);
    const baseline = i === 0 || history[i - 1].data_status !== h.data_status;
    const summary = baseline ? 'Initial snapshot; no earlier comparable refresh is available.' : `${changes.flags} flag changes, ${changes.samples} new samples and ${changes.added} new pairs.`;
    return `<entry><id>${xml(absolute('updates') + '#' + encodeURIComponent(h.dataset_version) + '-' + i)}</id><title>${xml(h.dataset_version)} (${xml(h.data_status)})</title><updated>${xml(h.date)}</updated><link href="${xml(absolute('updates'))}"/><summary>${xml(summary)}</summary></entry>`;
  }).reverse().join('\n');
  await fs.writeFile(path.join(publicDir, 'feed.xml'), `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom"><id>${xml(absolute())}</id><title>NextCycle data updates</title><updated>${xml(history.at(-1).date)}</updated><author><name>NextCycle / Utilyst</name></author><link href="${xml(absolute('feed.xml'))}" rel="self"/><link href="${xml(absolute('updates'))}"/><subtitle>Count-based screening, not regulatory determinations. Current counts reflect data in CEDEN as of ${xml(metadata.monitoring_data_through)}; recent data may not have been submitted yet.</subtitle>${entries}</feed>\n`);
  if (images) {
    const ogDir = path.join(publicDir, 'og');
    await fs.rm(ogDir, { recursive: true, force: true });
    await fs.mkdir(ogDir, { recursive: true });
    for (const p of pairs) await socialImage(path.join(ogDir, p.pair_id + '.png'), p, metadata);
  }
  const digest = createHash('sha256').update(JSON.stringify({ metadata, pairs })).digest('hex');
  console.log(`NextCycle: validated ${pairs.length} pairs; generated API, CSV, places, Atom${images ? ', OG images' : ''}; ${history.length} refresh(es). SHA256 ${digest.slice(0, 12)}`);
  return { metadata, pairs, history, places };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generateRelease({ images: !process.argv.includes('--no-images') }).catch((error) => { console.error(error); process.exitCode = 1; });
}
