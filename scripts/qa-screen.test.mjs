import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyQaResult, classifyMatch, reconcileQaData } from './reconcile-qa.mjs';
import { noUsableWaterStats } from '../src/data/selectors.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pair = { pair_id: 'fixture', criterion_unit: 'mg/L' };
const valid = {
  value: 5,
  qualifier: '=',
  source_qualifier: '=',
  data_quality: 'Passed',
  qacode: 'None',
  batch_verification: 'VAC',
  collection_replicate: 1,
  results_replicate: 1,
  matrix_name: 'samplewater',
};

test('region headlines count listed waterbodies with no eligible post-cutoff samples', async () => {
  const pairs = JSON.parse(await fs.readFile(path.join(root, 'public/data/waterbodies.json'), 'utf8'));
  assert.deepEqual(noUsableWaterStats(pairs.filter((pair) => pair.region_id === 'R9')), { total: 14, withoutUsableSamples: 5 });
  assert.deepEqual(noUsableWaterStats(pairs.filter((pair) => pair.region_id === 'R3')), { total: 14, withoutUsableSamples: 0 });
});

test('reporting lag is disclosed as unavailable without record-level CEDEN publish dates', async () => {
  const chemistry = JSON.parse(await fs.readFile(path.join(root, 'pipeline/probe/samples/ceden-chemistry-2026.json'), 'utf8'));
  const archive = JSON.parse(await fs.readFile(path.join(root, 'pipeline/probe/samples/ceden-chemistry-all-years-parquet-archive.json'), 'utf8'));
  const loadDateFields = chemistry.field_names.filter((field) => /load|publish|ingest|uploaded|submitted.?date/i.test(field));
  assert.deepEqual(loadDateFields, []);
  assert.match(archive.note, /archive was not downloaded/i);
  const page = await fs.readFile(path.join(root, 'src/routes/DataGaps.tsx'), 'utf8');
  assert.match(page, /reportingLagUnavailable/);
  assert.match(page, /reportingLagCaveat/);
});

test('QA calibration accepts both exact-match quality combinations', () => {
  assert.equal(classifyQaResult(valid, pair, 'mg/L').eligible, true);
  assert.equal(classifyQaResult({
    ...valid,
    data_quality: 'Unknown data quality',
    batch_verification: 'NR',
  }, pair, 'mg/L').eligible, true);
});

test('unreviewed codes, censored results, missing values, and non-primary replicates remain pending', () => {
  const pending = [
    { ...valid, data_quality: 'Some review needed' },
    { ...valid, data_quality: 'MetaData', batch_verification: 'NR' },
    { ...valid, data_quality: 'Unknown data quality', batch_verification: 'NR', qacode: 'NR' },
    { ...valid, data_quality: 'Unknown data quality', batch_verification: 'NA', qacode: 'NR' },
    { ...valid, collection_replicate: 2 },
    { ...valid, results_replicate: 2 },
    { ...valid, source_qualifier: '<' },
    { ...valid, qualifier: 'ND' },
    { ...valid, value: null },
    { ...valid, matrix_name: 'sediment' },
  ];
  for (const result of pending) assert.equal(classifyQaResult(result, pair, 'mg/L').eligible, false);
});

test('official count comparison labels exact, close, and larger gaps consistently', () => {
  assert.equal(classifyMatch(10, 2, 10, 2).status, 'exact');
  assert.equal(classifyMatch(10, 2, 11, 3).status, 'close');
  assert.equal(classifyMatch(10, 2, 12, 2).status, 'gap');
});

test('five source/date calibration pairs and all current post-cutoff totals reconcile', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'nextcycle-qa-screen-'));
  try {
    await fs.cp(path.join(root, 'public/data'), path.join(tmp, 'public/data'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'pipeline/out'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'pipeline/config'), { recursive: true });
    await fs.cp(path.join(root, 'pipeline/config/pairs.generated.yaml'), path.join(tmp, 'pipeline/config/pairs.generated.yaml'));
    await fs.cp(path.join(root, 'pipeline/out/ceden-source-reconciliation.json'), path.join(tmp, 'pipeline/out/ceden-source-reconciliation.json'));
    await fs.cp(path.join(root, 'pipeline/out/validation.md'), path.join(tmp, 'pipeline/out/validation.md'));
    const result = await reconcileQaData({ projectRoot: tmp });
    assert.equal(result.calibration_rows.length, 5);
    assert.equal(result.exact_match_count, 5);
    assert.equal(result.pair_count, 29);
    assert.equal(result.post_cutoff_eligible_n, 525);
    assert.equal(result.post_cutoff_eligible_exceedances, 73);
    assert.equal(result.post_cutoff_pending_n, 60);
    const tecolote = result.pairs.find((row) => row.pair_id === 'r9-2026-111826-ph');
    assert.equal(tecolote.post_cutoff_eligible_n, 2);
    assert.equal(tecolote.pending_post_cutoff_n, 52);
    assert.equal(tecolote.screening_flag, 'Under-sampled');
    const report = await fs.readFile(path.join(tmp, 'pipeline/out/validation.md'), 'utf8');
    assert.match(report, /same eligibility function is applied before and after the cutoff/i);
    assert.match(report, /Eligible n\/exceedances/);
    assert.match(report, /No non-detect\/censored qualifiers occur/);
    const methodReport = JSON.parse(await fs.readFile(path.join(tmp, 'public/data/method-validation.json'), 'utf8'));
    assert.equal(methodReport.exact_match_count, 5);
    assert.equal(methodReport.close_match_count, 1);
    assert.equal(methodReport.gap_match_count, 23);
    assert.equal(methodReport.pairs.length, 29);
    const config = await fs.readFile(path.join(tmp, 'pipeline/config/pairs.generated.yaml'), 'utf8');
    assert.match(config, /qa_recalibration:/);
    assert.match(config, /post_cutoff_pending_qa: 52/);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
