// Generates the illustrative sample dataset in public/data/.
// Values, IDs and decision numbers are illustrative only. Not real assessments.
// Run: node scripts/generate-sample-data.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'data');
fs.mkdirSync(path.join(out, 'samples'), { recursive: true });

const CUTOFF = '2024-10-23';
const THROUGH = '2026-10-31';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const day = 86400000;
const toIso = (ms) => new Date(ms).toISOString().slice(0, 10);
const ms = (iso) => Date.parse(iso + 'T00:00:00Z');

const policy = JSON.parse(fs.readFileSync(path.join(out, 'listing_tables.json'), 'utf8'));
// Published rows only. Sample measurements are illustrative; policy thresholds are not.
export function allowedExceedances(table, n) {
  return policy.tables[table].rows.find((r) => r.min <= n && n <= r.max)?.allowed ?? null;
}

const POLL = {
  copper_fw: { pollutant: 'Dissolved copper', slug: 'copper-dissolved', group: 'Metals', unit: 'µg/L', dir: 'upper', c: 9.3, cu: null, basis: 'California Toxics Rule, freshwater chronic (hardness 100 mg/L)', dec: 2, nd: 0.12 },
  copper_sw: { pollutant: 'Dissolved copper', slug: 'copper-dissolved', group: 'Metals', unit: 'µg/L', dir: 'upper', c: 3.1, cu: null, basis: 'California Toxics Rule, saltwater chronic', dec: 2, nd: 0.12 },
  zinc: { pollutant: 'Dissolved zinc', slug: 'zinc-dissolved', group: 'Metals', unit: 'µg/L', dir: 'upper', c: 120, cu: null, basis: 'California Toxics Rule, freshwater chronic (hardness 100 mg/L)', dec: 1, nd: 0.1 },
  selenium: { pollutant: 'Selenium', slug: 'selenium', group: 'Metals', unit: 'µg/L', dir: 'upper', c: 5, cu: null, basis: 'California Toxics Rule, freshwater chronic', dec: 2, nd: 0.1 },
  tn: { pollutant: 'Total nitrogen', slug: 'total-nitrogen', group: 'Nutrients', unit: 'mg/L', dir: 'upper', c: 1.0, cu: null, basis: 'San Diego Basin Plan numeric target (illustrative)', dec: 2, nd: 0.05 },
  tp: { pollutant: 'Phosphorus', slug: 'phosphorus', group: 'Nutrients', unit: 'mg/L', dir: 'upper', c: 0.1, cu: null, basis: 'San Diego Basin Plan numeric target (illustrative)', dec: 3, nd: 0.08 },
  do: { pollutant: 'Dissolved oxygen', slug: 'dissolved-oxygen', group: 'Conventional', unit: 'mg/L', dir: 'lower', c: 5.0, cu: null, basis: 'San Diego Basin Plan, warm freshwater habitat minimum', dec: 1, nd: 0 },
  ph: { pollutant: 'pH', slug: 'ph', group: 'Conventional', unit: 'pH units', dir: 'range', c: 6.5, cu: 8.5, basis: 'San Diego Basin Plan, inland surface waters range', dec: 2, nd: 0 },
  tox: { pollutant: 'Toxicity', slug: 'toxicity', group: 'Toxicity', unit: '% effect', dir: 'upper', c: 25, cu: null, basis: 'Test of Significant Toxicity, chronic (illustrative threshold)', dec: 1, nd: 0 },
};

const URL_IR = 'https://www.waterboards.ca.gov/water_issues/programs/water_quality_assessment/';

const PAIRS = [
  { wb: 'CAR9093100', name: 'Sweetwater River, lower', type: 'River/Stream', county: 'San Diego', p: 'zinc', n: 31, e: 1, ces: 62, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-1', 'REC-2', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-116.98, 32.69], [-117.01, 32.676], [-117.03, 32.665], [-117.07, 32.655], [-117.1, 32.652]] }, st: 3,
    summary: 'Zinc in the lower Sweetwater River was listed in an earlier cycle. Since the 2024 cutoff, 31 samples were taken and only one was above the limit. On count alone, this pair would pass the delisting test.', gap: null },
  { wb: 'CAR9031000', name: 'San Luis Rey River, lower', type: 'River/Stream', county: 'San Diego', p: 'tn', n: 30, e: 2, ces: 48, cat: '5', tmdl: 'TMDL required', cycle: 2026, uses: ['MUN', 'AGR', 'REC-1', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-117.2, 33.25], [-117.24, 33.24], [-117.27, 33.23], [-117.33, 33.215], [-117.39, 33.205]] }, st: 2,
    summary: 'Nitrogen levels in the lower San Luis Rey River have mostly stayed under the target since late 2024. Two of 30 samples were higher, which is within what the delisting test allows.', gap: null },
  { wb: 'CAR9022000', name: 'Santa Margarita River, upper', type: 'River/Stream', county: 'Riverside', p: 'tp', n: 29, e: 1, ces: 22, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['MUN', 'AGR', 'REC-1', 'COLD', 'WILD'], geom: { type: 'LineString', coordinates: [[-117.2, 33.45], [-117.24, 33.42], [-117.27, 33.39], [-117.3, 33.36], [-117.33, 33.33]] }, st: 2,
    summary: 'Phosphorus in the upper Santa Margarita River was above the target often enough to be listed. Newer samples tell a calmer story: one of 29 was above the target.', gap: null },
  { wb: 'CAB9063000', name: 'Mission Bay', type: 'Bay/Harbor', county: 'San Diego', p: 'copper_sw', n: 33, e: 0, ces: 41, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-1', 'REC-2', 'MAR', 'WILD', 'SHELL'], geom: { type: 'Polygon', coordinates: [[[-117.245, 32.775], [-117.235, 32.8], [-117.215, 32.802], [-117.198, 32.79], [-117.2, 32.772], [-117.225, 32.766], [-117.245, 32.775]]] }, st: 3,
    summary: 'No dissolved copper sample in Mission Bay has been above the saltwater limit since the 2024 cutoff. With 33 samples, the bay has enough data for a delisting test on count alone.', gap: null },
  { wb: 'CAR9061200', name: 'Tecolote Creek', type: 'River/Stream', county: 'San Diego', p: 'ph', n: 27, e: 1, ces: 79, cat: '5', tmdl: 'TMDL required', cycle: 2026, uses: ['REC-2', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-117.16, 32.8], [-117.17, 32.793], [-117.18, 32.785], [-117.193, 32.778], [-117.205, 32.772]] }, st: 2,
    summary: 'pH in Tecolote Creek should stay between 6.5 and 8.5. Since late 2024, one of 27 readings fell outside that range. That is within what the delisting test allows.', gap: 'Only one sample above the minimum. Additional sampling must remain representative across seasons and locations.' },
  { wb: 'CAR9082200', name: 'Chollas Creek', type: 'River/Stream', county: 'San Diego', p: 'copper_fw', n: 42, e: 14, ces: 94, cat: '4a', tmdl: 'TMDL adopted', cycle: 2024, uses: ['REC-1', 'REC-2', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-117.06, 32.73], [-117.075, 32.722], [-117.09, 32.715], [-117.105, 32.707], [-117.12, 32.7], [-117.135, 32.69]] }, st: 3,
    summary: 'Copper in Chollas Creek is still often above the limit, mostly after storms. 14 of 42 samples since the cutoff were higher than the limit. The listing would very likely remain.', gap: null },
  { wb: 'CAR9111000', name: 'Tijuana River', type: 'River/Stream', county: 'San Diego', p: 'do', n: 38, e: 17, ces: 91, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-1', 'REC-2', 'WARM', 'WILD', 'EST'], geom: { type: 'LineString', coordinates: [[-117.05, 32.545], [-117.065, 32.549], [-117.08, 32.552], [-117.1, 32.555], [-117.125, 32.555]] }, st: 3,
    summary: 'Dissolved oxygen in the Tijuana River often falls below the level fish need. 17 of 38 readings since the cutoff were too low. Low oxygen remains a common condition here.', gap: null },
  { wb: 'CAR9071200', name: 'Forrester Creek', type: 'River/Stream', county: 'San Diego', p: 'selenium', n: 34, e: 9, ces: 68, cat: '5', tmdl: 'TMDL required', cycle: 2026, uses: ['REC-2', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-116.93, 32.83], [-116.943, 32.82], [-116.955, 32.81], [-116.98, 32.795], [-117.0, 32.79]] }, st: 2,
    summary: 'Selenium in Forrester Creek is still above the limit in about one of every four samples. 9 of 34 samples since the cutoff exceeded it, more than the delisting test allows.', gap: null },
  { wb: 'CAE9063100', name: 'Famosa Slough', type: 'Lagoon/Estuary', county: 'San Diego', p: 'tn', n: 28, e: 8, ces: 77, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-2', 'EST', 'WILD', 'RARE'], geom: { type: 'Polygon', coordinates: [[[-117.232, 32.747], [-117.229, 32.758], [-117.224, 32.759], [-117.223, 32.748], [-117.232, 32.747]]] }, st: 2,
    summary: 'Famosa Slough still shows high nitrogen. 8 of 28 samples since the cutoff were above the target, more than the delisting test allows.', gap: null },
  { wb: 'CAR9071100', name: 'San Diego River, lower', type: 'River/Stream', county: 'San Diego', p: 'tox', n: 30, e: 6, ces: 71, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['MUN', 'REC-1', 'REC-2', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-117.07, 32.8], [-117.12, 32.785], [-117.17, 32.765], [-117.21, 32.758], [-117.245, 32.757]] }, st: 3,
    summary: 'Toxicity tests on lower San Diego River water still show effects on test organisms. 6 of 30 tests since the cutoff failed, more than the delisting test allows.', gap: null },
  { wb: 'CAR9101000', name: 'Otay River', type: 'River/Stream', county: 'San Diego', p: 'copper_fw', n: 9, e: 1, ces: 83, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-1', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-116.95, 32.6], [-116.975, 32.598], [-117.0, 32.595], [-117.05, 32.59], [-117.1, 32.59]] }, st: 2,
    summary: 'Copper in the Otay River has only nine samples since the 2024 cutoff. That is too few to tell whether the listing still holds.', gap: 'Monitoring at the lower Otay station paused in 2025. 19 more samples are needed before a delisting test can be run.' },
  { wb: 'CAE9061300', name: 'Los Peñasquitos Lagoon', type: 'Lagoon/Estuary', county: 'San Diego', p: 'tp', n: 11, e: 3, ces: 18, cat: '5', tmdl: 'TMDL required', cycle: 2026, uses: ['REC-1', 'REC-2', 'EST', 'WILD', 'RARE', 'MAR'], geom: { type: 'Polygon', coordinates: [[[-117.262, 32.925], [-117.259, 32.94], [-117.248, 32.942], [-117.243, 32.93], [-117.25, 32.922], [-117.262, 32.925]]] }, st: 2,
    summary: 'Phosphorus in Los Peñasquitos Lagoon has 11 samples since the cutoff, and three were above the target. There is not yet enough data for a delisting test.', gap: 'Lagoon mouth closures limit sampling access. Sampling is seasonal and concentrated in summer.' },
  { wb: 'CAR9063200', name: 'Rose Creek', type: 'River/Stream', county: 'San Diego', p: 'zinc', n: 14, e: 0, ces: 57, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-2', 'WARM', 'WILD'], geom: { type: 'LineString', coordinates: [[-117.21, 32.87], [-117.212, 32.855], [-117.215, 32.84], [-117.225, 32.81], [-117.23, 32.795]] }, st: 2,
    summary: 'No zinc sample in Rose Creek has been above the limit since the cutoff, but there are only 14. Fourteen more would allow a delisting test.', gap: 'No exceedances so far. This is the pair where added sampling is most likely to change the outcome.' },
  { wb: 'CAB9082100', name: 'San Diego Bay shoreline, Chollas Creek mouth', type: 'Bay/Harbor', county: 'San Diego', p: 'tox', n: 8, e: 2, ces: 86, cat: '5', tmdl: 'TMDL required', cycle: 2024, uses: ['REC-1', 'REC-2', 'MAR', 'WILD', 'COMM'], geom: { type: 'LineString', coordinates: [[-117.14, 32.7], [-117.13, 32.693], [-117.12, 32.685], [-117.115, 32.677], [-117.11, 32.67]] }, st: 2,
    summary: 'Toxicity along the San Diego Bay shoreline near Chollas Creek has been tested eight times since the cutoff. Two tests failed. Too few tests have been run to say more.', gap: 'Toxicity testing is costly and infrequent. 20 more tests are needed, in an area with a high CalEnviroScreen score.' },
];

const exceedsFn = (d, v) => (d.dir === 'upper' ? v > d.c : d.dir === 'lower' ? v < d.c : v < d.c || v > d.cu);
const round = (v, dec) => Number(v.toFixed(dec));

const waterbodies = [];
const stations = [];
const ids = new Set();

PAIRS.forEach((P, idx) => {
  const d = POLL[P.p];
  const r = rng(1000 + idx * 7919);
  const pair_id = `${P.wb}-${d.slug}`;
  if (ids.has(pair_id)) throw new Error('dup ' + pair_id);
  ids.add(pair_id);
  // These explicit illustrative examples follow sections 3.6/4.6 for toxicity.
  // A real assessment publisher must review table selection rather than infer it from a group.
  const usesToxicantTable = d.group === 'Metals' || d.group === 'Toxicity';
  const listingTable = usesToxicantTable ? '3.1' : '3.2';
  const delistTable = usesToxicantTable ? '4.1' : '4.2';
  const minN = delistTable === '4.1' ? 28 : 26;

  const codes = Array.from({ length: P.st }, (_, i) => `9${String(idx + 1).padStart(2, '0')}${P.wb.slice(3, 6)}${String.fromCharCode(65 + i)}${i + 1}`);
  const stNames = ['at mouth', 'mid reach', 'upstream'];

  const mk = (dateMs, exceed, station) => {
    let v;
    let q = '=';
    if (exceed) {
      if (d.dir === 'upper') v = d.c * (1.08 + 1.5 * r());
      else if (d.dir === 'lower') v = d.c - 0.4 - 2.4 * r();
      else v = r() < 0.6 ? d.cu + 0.12 + 0.5 * r() : d.c - 0.15 - 0.4 * r();
    } else {
      const x = r();
      if (d.nd > 0 && x < d.nd) { v = d.c * 0.08; q = 'ND'; }
      else if (d.nd > 0 && x < d.nd + 0.05) { v = d.c * 0.14; q = 'DNQ'; }
      else if (d.dir === 'upper') v = d.c * (0.22 + 0.7 * r());
      else if (d.dir === 'lower') v = d.c + 0.3 + 4.2 * r();
      else v = 7.0 + 1.3 * r();
    }
    v = round(v, d.dec);
    const ex = q === 'ND' || q === 'DNQ' ? false : exceedsFn(d, v);
    if (ex !== exceed) throw new Error('exceed mismatch ' + pair_id);
    const date = toIso(dateMs);
    return { date, station_code: station, value: v, qualifier: q, exceeds: ex, before_cutoff: date <= CUTOFF, screening_eligible: true, qa_status: 'eligible' };
  };

  const results = [];
  // pre-cutoff
  const preN = 14 + Math.floor(r() * 9);
  const preStart = ms('2019-02-01'), preEnd = ms('2024-09-30');
  for (let i = 0; i < preN; i++) {
    const t = preStart + ((preEnd - preStart) * (i + 0.5)) / preN + (r() - 0.5) * 20 * day;
    results.push(mk(t, r() < 0.42, codes[i % codes.length]));
  }
  // post-cutoff with exactly e exceedances
  const postStart = ms('2024-11-04'), postEnd = ms('2026-10-27');
  const order = Array.from({ length: P.n }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const exSet = new Set(order.slice(0, P.e));
  const span = P.n < 15 ? (postEnd - postStart) * (0.55 + 0.25 * r()) : postEnd - postStart;
  for (let i = 0; i < P.n; i++) {
    const t = postStart + (span * (i + 0.5)) / P.n + (r() - 0.5) * 6 * day;
    const st = i < codes.length ? codes[i] : codes[Math.floor(r() * codes.length)];
    results.push(mk(t, exSet.has(i), st));
  }
  results.sort((a, b) => a.date.localeCompare(b.date));

  const post = results.filter((x) => !x.before_cutoff);
  const nPost = post.length;
  const ePost = post.filter((x) => x.exceeds).length;
  const allowed = allowedExceedances(delistTable, nPost);
  const flag = nPost < minN ? 'Under-sampled' : ePost <= allowed ? 'Delisting candidate' : 'Still exceeding';

  const xs = P.geom.type === 'LineString' ? P.geom.coordinates : P.geom.coordinates[0].slice(0, -1);
  const centroid = { lat: round(xs.reduce((s, c) => s + c[1], 0) / xs.length, 4), lon: round(xs.reduce((s, c) => s + c[0], 0) / xs.length, 4) };

  codes.forEach((code, i) => {
    const mine = results.filter((x) => x.station_code === code);
    const c = xs[Math.min(xs.length - 1, Math.round(((xs.length - 1) * (codes.length - 1 - i)) / Math.max(1, codes.length - 1)))];
    stations.push({
      station_code: code,
      station_name: `${P.name} ${stNames[i]}`,
      lat: round(c[1] + (r() - 0.5) * 0.004, 5),
      lon: round(c[0] + (r() - 0.5) * 0.004, 5),
      waterbody_id: P.wb,
      link_method: i === codes.length - 1 && codes.length > 1 ? 'Spatial join' : 'Fact sheet',
      sample_count: mine.length,
      last_sample_date: mine[mine.length - 1].date,
    });
  });

  waterbodies.push({
    pair_id,
    waterbody_id: P.wb,
    waterbody_name: P.name,
    waterbody_type: P.type,
    region_id: 'R9',
    county: P.county,
    centroid,
    geometry: P.geom,
    pollutant: d.pollutant,
    pollutant_group: d.group,
    official_status: 'Listed',
    official_category: P.cat,
    official_cycle: P.cycle,
    decision_id: `D-R9-${P.cycle}-${String(4100 + idx * 37)}`,
    fact_sheet_url: URL_IR,
    tmdl_status: P.tmdl,
    criterion_direction: d.dir,
    criterion_value: d.c,
    criterion_value_upper: d.cu,
    criterion_unit: d.unit,
    criterion_basis: d.basis,
    beneficial_uses: P.uses,
    listing_table: listingTable,
    delisting_table: delistTable,
    new_samples: nPost,
    new_exceedances: ePost,
    allowed_exceedances_for_delisting: allowed,
    min_samples_for_delisting: minN,
    screening_flag: flag,
    first_new_sample_date: post[0].date,
    last_sample_date: post[post.length - 1].date,
    station_count: codes.length,
    ces_percentile: P.ces,
    disadvantaged_community: P.ces >= 75,
    summary: P.summary,
    data_gap_note: P.gap,
  });

  fs.writeFileSync(
    path.join(out, 'samples', `${pair_id}.json`),
    JSON.stringify({ pair_id, unit: d.unit, criterion_direction: d.dir, criterion_value: d.c, criterion_value_upper: d.cu, results }, null, 2) + '\n',
  );
});

const counts = waterbodies.reduce((a, w) => ((a[w.screening_flag] = (a[w.screening_flag] || 0) + 1), a), {});
console.log(counts);

fs.writeFileSync(path.join(out, 'waterbodies.json'), JSON.stringify(waterbodies, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'stations.json'), JSON.stringify(stations, null, 2) + '\n');
fs.writeFileSync(
  path.join(out, 'metadata.json'),
  JSON.stringify(
    {
      dataset_version: 'sample-0.3',
      data_status: 'illustrative',
      repo_url: 'https://github.com/Utilyst-public/nextcycle',
      site_url: 'https://nextcycle.tech',
      license: 'MIT (illustrative data); upstream data retains source terms',
      is_sample_data: true,
      review_complete: false,
      generated_at: '2026-11-18T00:00:00Z',
      monitoring_data_through: THROUGH,
      cutoff_date: CUTOFF,
      next_cycle: '2028 Integrated Report',
      regions: [{ region_id: 'R9', region_name: 'San Diego Region' }],
      sources: [
        { name: 'SWAMP / CEDEN surface water chemistry', publisher: 'California State Water Resources Control Board', url: 'https://data.ca.gov/' },
        { name: '2024 and 2026 California Integrated Report (303(d) list)', publisher: 'California State Water Resources Control Board', url: URL_IR },
        { name: 'CalEnviroScreen 4.0', publisher: 'OEHHA', url: 'https://oehha.ca.gov/calenviroscreen' },
      ],
    },
    null,
    2,
  ) + '\n',
);
if (!fs.existsSync(path.join(out, 'about.json'))) fs.writeFileSync(path.join(out, 'about.json'), JSON.stringify({ recognition: [] }, null, 2) + '\n');
