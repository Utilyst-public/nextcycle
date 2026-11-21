import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { root, readJson, nextHistory, changesBetween, csvFor, siteSettings, generateRelease, validateDataset } from './release-data.mjs';
import { evaluateScenario, minimumCleanSamples, ListingTablesSchema } from '../src/lib/policy.ts';
import { catalogs, pollutantName, policyVersionText } from '../src/i18n/messages.ts';
import { setLocale } from '../src/i18n/store.ts';

const tables = ListingTablesSchema.parse(await readJson(path.join(root, 'public/data/listing_tables.json')));
test('language catalogs match and scientific display names preserve source records', () => {
  assert.deepEqual(Object.keys(catalogs.en).sort(), Object.keys(catalogs.es).sort());
  setLocale('es');
  try {
    assert.equal(pollutantName('Dissolved copper'), 'Cobre disuelto');
    assert.equal(pollutantName('dissolved copper'), 'cobre disuelto');
    assert.equal(pollutantName('pH'), 'pH');
    assert.equal(pollutantName('An unpublished analyte'), 'An unpublished analyte');
    assert.match(policyVersionText(tables.version), /Política.*2015/);
  } finally { setLocale('en'); }
});
const base = { official_status: 'Listed', delisting_table: '4.1', new_samples: 0, new_exceedances: 0 };
test('policy rows include every verified boundary and reject extrapolation', () => {
  for (const [key, table] of Object.entries(tables.tables)) {
    for (const row of table.rows) {
      for (const n of [row.min, row.max]) {
        assert.equal(evaluateScenario({ ...base, delisting_table: key }, n, row.allowed, tables).flag, 'Delisting candidate');
        assert.equal(evaluateScenario({ ...base, delisting_table: key }, n, row.allowed + 1, tables).flag, 'Still exceeding');
      }
    }
    assert.equal(evaluateScenario({ ...base, delisting_table: key }, table.min_samples - 1, 0, tables).flag, 'Under-sampled');
    assert.equal(evaluateScenario({ ...base, delisting_table: key }, table.rows.at(-1).max + 1, 0, tables).reason, 'outside-coverage');
  }
  assert.equal(tables.tables['4.2'].rows[0].allowed, 4);
});
test('invalid scenarios and nonlisted pairs have no regulatory-looking result', () => {
  for (const [k, m] of [[-1, 0], [1, 2], [1.2, 0], [10, NaN]]) assert.equal(evaluateScenario(base, k, m, tables).reason, 'invalid');
  assert.equal(evaluateScenario({ ...base, official_status: 'Not listed' }, 30, 0, tables).reason, 'not-listed');
});
test('minimum clean samples tests allowance as well as minimum count', () => {
  assert.equal(minimumCleanSamples({ ...base, new_samples: 9, new_exceedances: 1 }, tables), 19);
  assert.equal(minimumCleanSamples({ ...base, delisting_table: '4.2', new_samples: 11, new_exceedances: 6 }, tables), 26);
  assert.equal(minimumCleanSamples({ ...base, new_samples: 31, new_exceedances: 1 }, tables), 0);
  assert.equal(minimumCleanSamples({ ...base, new_samples: 42, new_exceedances: 14 }, tables), null);
});
test('refresh history is seeded honestly, append-only and idempotent', () => {
  const md = { generated_at: '2026-11-18T00:00:00Z', dataset_version: 'fixture-1', data_status: 'illustrative', is_sample_data: true };
  const p = { pair_id: 'fixture', waterbody_name: 'Fixture water', pollutant: 'Fixture pollutant', screening_flag: 'Under-sampled', new_samples: 5, new_exceedances: 1, pending_new_samples: 2 };
  const history = nextHistory([], md, [p]);
  assert.equal(history.length, 1);
  assert.deepEqual(changesBetween(null, history[0]), { flags: 0, samples: 0, added: 0, changed: 0 });
  assert.equal(nextHistory(history, md, [p]), history);
  assert.throws(() => nextHistory(history, md, [{ ...p, new_samples: 6 }]), /new dataset_version/);
  const next = nextHistory(history, { ...md, generated_at: '2026-12-18T00:00:00Z', dataset_version: 'fixture-2' }, [{ ...p, new_samples: 30, screening_flag: 'Delisting candidate' }, { ...p, pair_id: 'second' }]);
  assert.deepEqual(changesBetween(next[0], next[1]), { flags: 1, samples: 25, added: 1, changed: 2 });
  assert.equal(changesBetween(next[0], { ...next[1], data_status: 'reviewed', is_sample_data: false }).changed, 0);
});
test('QA-rule changes create a separate comparison boundary, not new-sample deltas', () => {
  const previous = {
    data_status: 'provisional', qa_rule_version: 'strict-v0',
    pairs: [{ pair_id: 'a', screening_flag: 'Under-sampled', new_samples: 0, new_exceedances: 0, pending_new_samples: 10 }],
  };
  const current = {
    data_status: 'provisional', qa_rule_version: 'calibrated-v1',
    pairs: [{ pair_id: 'a', screening_flag: 'Under-sampled', new_samples: 5, new_exceedances: 2, pending_new_samples: 5 }],
  };
  assert.deepEqual(changesBetween(previous, current), { flags: 0, samples: 0, added: 0, changed: 0 });
});
test('illustrative, provisional and reviewed release gates match source-data status', async () => {
  const dataDir = path.join(root, 'public/data');
  const metadata = await readJson(path.join(dataDir, 'metadata.json'));
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'nextcycle-review-gate-'));
  try {
    await fs.cp(dataDir, tmp, { recursive: true });
    const file = path.join(tmp, 'metadata.json');
    await fs.writeFile(file, JSON.stringify({ ...metadata, data_status: 'illustrative', is_sample_data: true, review_complete: false }));
    await assert.doesNotReject(validateDataset(tmp));
    await fs.writeFile(file, JSON.stringify({ ...metadata, data_status: 'provisional', is_sample_data: false, review_complete: false }));
    await assert.doesNotReject(validateDataset(tmp));
    await fs.writeFile(file, JSON.stringify({ ...metadata, data_status: 'provisional', is_sample_data: true, review_complete: false }));
    await assert.rejects(validateDataset(tmp), /provisional release must contain real source records/);
    await fs.writeFile(file, JSON.stringify({ ...metadata, data_status: 'reviewed', is_sample_data: false, review_complete: false }));
    await assert.rejects(validateDataset(tmp), /reviewed release requires real records and review_complete/);
    await fs.writeFile(file, JSON.stringify({ ...metadata, data_status: 'reviewed', is_sample_data: false, review_complete: true }));
    await assert.doesNotReject(validateDataset(tmp));
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
});
test('CSV handles multiline, quotes, optional fields and spreadsheet injection', () => {
  const csv = csvFor([{ pair_id: 'a', text: 'a,"b"\nc', extra: '=DANGEROUS()' }]);
  assert.ok(csv.includes('"a,""b""\nc"'));
  assert.ok(csv.includes("\"'=DANGEROUS()\""));
  assert.ok(csvFor([]).includes('pair_id'));
});
test('URLs preserve deployment subpaths without depending on Replit settings', () => {
  assert.equal(siteSettings({}, {}).absolute('w/a'), 'https://nextcycle.tech/w/a');
  assert.equal(siteSettings({}, { VITE_SITE_URL: 'https://example.org', VITE_BASE_PATH: '/water/' }).absolute('api/v1/meta.json'), 'https://example.org/water/api/v1/meta.json');
  assert.equal(siteSettings({ site_url: 'https://example.org/old-path' }, {}).absolute('watch'), 'https://example.org/watch');
  assert.throws(() => siteSettings({}, { VITE_SITE_URL: 'javascript:alert(1)' }));
});
test('illustrative, provisional and reviewed fixtures generate consistent static endpoints', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'nextcycle-fixtures-'));
  try {
    await fs.cp(path.join(root, 'public/data'), path.join(tmp, 'public/data'), { recursive: true });
    // This is a synthetic test fixture, not a claim of real monitoring or provenance.
    const mdFile = path.join(tmp, 'public/data/metadata.json');
    const md = await readJson(mdFile);
    for (const [status, sample, reviewed] of [['illustrative', true, false], ['provisional', false, false], ['reviewed', false, true]]) {
      await fs.rm(path.join(tmp, 'public/data/history.json'), { force: true });
      await fs.writeFile(mdFile, JSON.stringify({
        ...md, dataset_version: 'automated-fixture',
        data_status: status,
        is_sample_data: sample, review_complete: reviewed,
      }));
      const generated = await generateRelease({ projectRoot: tmp, images: false, env: { VITE_BASE_PATH: '/test/' } });
      const all = await readJson(path.join(tmp, 'public/api/v1/waters.json'));
      assert.equal(all.length, generated.pairs.length);
      assert.equal(all[0].in_ceden_as_of, generated.metadata.monitoring_data_through);
      assert.match(all[0].recent_data_submission_note, /may not have been submitted yet/i);
      assert.ok((await fs.readFile(path.join(tmp, 'public/api/v1/waters.csv'), 'utf8')).includes('in_ceden_as_of'));
      assert.equal((await readJson(path.join(tmp, 'public/api/v1/meta.json'))).is_sample_data, sample);
      assert.equal((await readJson(path.join(tmp, 'public/api/v1/meta.json'))).review_complete, reviewed);
      const history = await readJson(path.join(tmp, 'public/data/history.json'));
      assert.equal(history.length, 1);
      assert.equal(history[0].data_status, status);
      assert.equal(history[0].is_sample_data, sample);
      for (const p of all) assert.deepEqual(await readJson(path.join(tmp, 'public/api/v1/waters', p.pair_id + '.json')), p);
       const feed = await fs.readFile(path.join(tmp, 'public/feed.xml'), 'utf8');
       assert.ok(feed.includes('https://nextcycle.tech/test/updates'));
       assert.match(feed, /data in CEDEN as of .*recent data may not have been submitted yet/i);
      await generateRelease({ projectRoot: tmp, images: false, env: {} });
      assert.equal((await readJson(path.join(tmp, 'public/data/history.json'))).length, 1);
    }
    const pairsFile = path.join(tmp, 'public/data/waterbodies.json');
    const pairs = await readJson(pairsFile);
    pairs[0].pair_id = '../escape';
    await fs.writeFile(pairsFile, JSON.stringify(pairs));
    await assert.rejects(validateDataset(path.join(tmp, 'public/data')), /Unsafe pair_id/);
  } finally { await fs.rm(tmp, { recursive: true, force: true }); }
});
