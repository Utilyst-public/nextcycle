import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public/data');
const calibrationPairIds = [
  'r9-2026-111713-ph',
  'r9-2026-112126-do',
  'r9-2026-112165-do',
  'r9-2026-112167-ph',
  'r9-2026-113981-do',
];
const ruleVersion = 'region9-calibrated-qa-v1';

const causeByPair = {
  'r9-2026-111216-do': ['validationCauseSanMateo', 'San Mateo Creek’s included historic 18/12 LOE has no machine-readable station code, so CEDEN cannot reproduce it.'],
  'r9-2026-111713-ph': ['validationCauseExact', 'The included station, source, and date-window totals match.'],
  'r9-2026-111826-ph': ['validationCauseTecolote', 'The City of San Diego 15/1 field-pH LOE at SD5 is absent from CEDEN; other cited TMDL/NPDES windows return extra rows.'],
  'r9-2026-111896-do': ['validationCauseSanDiegoRiver', 'Historic monthly-average LOEs at RSW-003 and RSW-006 are not in CEDEN; several Coastkeeper windows also return extra rows.'],
  'r9-2026-111943-do': ['validationCauseSycamore', 'The historic 60/20 monthly-average LOE at RSW-001 and RSW-001A is not in CEDEN.'],
  'r9-2026-111953-do': ['validationCauseForester', 'The historic 60/5 monthly-average LOE at RSW-004 is not in CEDEN; another included line has no station code.'],
  'r9-2026-112079-do': ['validationCauseChollas', 'Several included LOEs have no machine-readable station code; CC-SD8 and SD8 have no CEDEN match.'],
  'r9-2026-112126-do': ['validationCauseExact', 'The included station, source, and date-window totals match.'],
  'r9-2026-112165-do': ['validationCauseExact', 'The measurable included station, source, and date-window totals match.'],
  'r9-2026-112167-ph': ['validationCauseTijuanaPh', 'Pair totals match, although one NPDES LOE has one extra CEDEN result; other windows offset it.'],
  'r9-2026-113328-do': ['validationCauseSanDieguito', 'Several Coastkeeper/NPDES windows contain one to two extra rows, resulting in one extra sample and exceedance overall.'],
  'r9-2026-113981-do': ['validationCauseSweetwater', 'Pair totals match, although a Coastkeeper window has one extra result and exceedance offset by other windows.'],
  'r9-2026-114818-do': ['validationCauseCarmel', 'The LPC-TWAS-3 alias now matches; the NPDES and Coastkeeper windows still contain two extra rows and one extra exceedance.'],
  'r9-2026-148304-do': ['validationCauseSanLuisRey', 'The San Luis Rey Mitigation Bank window has six extra non-exceeding CEDEN results.'],
  'r9-2026-164236-nitrate': ['validationCauseRainbow', 'Two NPDES windows each have one extra CEDEN row, including one additional exceedance.'],
};

const causeText = {
  validationCauseExact: 'The included station, source, and date-window totals match.',
  validationCauseSanMateo: 'The included historic 18/12 LOE has no machine-readable station code, so CEDEN cannot reproduce it.',
  validationCauseTecolote: 'The City of San Diego 15/1 field-pH LOE at SD5 is absent from CEDEN; other cited TMDL/NPDES windows return extra rows.',
  validationCauseSanDiegoRiver: 'Historic monthly-average LOEs at RSW-003 and RSW-006 are not in CEDEN; several Coastkeeper windows also return extra rows.',
  validationCauseSycamore: 'The historic 60/20 monthly-average LOE at RSW-001 and RSW-001A is not in CEDEN.',
  validationCauseForester: 'The historic 60/5 monthly-average LOE at RSW-004 is not in CEDEN; another included line has no station code.',
  validationCauseChollas: 'Several included LOEs have no machine-readable station code; CC-SD8 and SD8 have no CEDEN match.',
  validationCauseTijuanaPh: 'Pair totals match, although one NPDES LOE has one extra CEDEN result; other windows offset it.',
  validationCauseSanDieguito: 'Several Coastkeeper/NPDES windows contain one to two extra rows, resulting in one extra sample and exceedance overall.',
  validationCauseSweetwater: 'Pair totals match, although a Coastkeeper window has one extra result and exceedance offset by other windows.',
  validationCauseCarmel: 'The LPC-TWAS-3 alias now matches; the NPDES and Coastkeeper windows still contain two extra rows and one extra exceedance.',
  validationCauseSanLuisRey: 'The San Luis Rey Mitigation Bank window has six extra non-exceeding CEDEN results.',
  validationCauseRainbow: 'Two NPDES windows each have one extra CEDEN row, including one additional exceedance.',
  validationCauseRegion3: 'The Region 3 audit compares selected fixed-criterion LOEs; source/project coverage is incomplete and unmatched station identifiers are listed in the pair notes.',
};

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));
const writeJson = async (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const normalize = (value) => String(value ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizedText = (value) => String(value ?? '').trim().toLowerCase();
const hasNoQaCode = (value) => ['', 'NONE'].includes(String(value ?? '').trim().toUpperCase());

/**
 * This rule is independent of cutoff date. The five exact LOE matches contain
 * both Passed/VAC and Unknown-data-quality/NR rows; those combinations reproduce
 * their official totals when the result itself is direct, numeric, water-matrix,
 * unqualified, has no QACode, and uses primary replicates.
 */
export function classifyQaResult(result, pair, sampleUnit) {
  const reasons = [];
  const quality = normalizedText(result.data_quality);
  const batch = normalizedText(result.batch_verification);
  const calibratedQuality =
    (quality === 'passed' && batch === 'vac') ||
    (quality === 'unknown data quality' && batch === 'nr');
  if (!calibratedQuality) reasons.push(`QA combination not calibrated (${result.data_quality || 'missing'}/${result.batch_verification || 'missing'})`);
  if (!hasNoQaCode(result.qacode)) reasons.push(`QACode=${result.qacode}`);
  if (normalize(result.matrix_name) !== 'SAMPLEWATER') reasons.push(`non-water or unreported matrix (${result.matrix_name || 'missing'})`);
  if (!Number.isFinite(result.value)) reasons.push('missing or non-numeric result');
  const qualifiers = [result.source_qualifier, result.qualifier]
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
    .map((value) => String(value).trim().toUpperCase());
  if (!qualifiers.length || qualifiers.some((qualifier) => qualifier !== '=')) {
    reasons.push(`censored or unsupported qualifier (${qualifiers.join('/') || 'missing'})`);
  }
  if (Number(result.collection_replicate) !== 1 || Number(result.results_replicate) !== 1) {
    reasons.push(`non-primary replicates (${result.collection_replicate ?? 'missing'}/${result.results_replicate ?? 'missing'})`);
  }
  if (sampleUnit !== pair.criterion_unit) reasons.push(`unit mismatch (${sampleUnit} vs ${pair.criterion_unit})`);
  return {
    eligible: reasons.length === 0,
    note: reasons.length ? reasons.join('; ') : 'Calibrated QA combination; direct numeric result; primary replicates.',
  };
}

export function classifyMatch(officialN, officialExceedances, reproducedN, reproducedExceedances) {
  const nDelta = reproducedN - officialN;
  const exceedanceDelta = reproducedExceedances - officialExceedances;
  if (nDelta === 0 && exceedanceDelta === 0) return { status: 'exact', nDelta, exceedanceDelta };
  if (Math.abs(nDelta) <= 1 && Math.abs(exceedanceDelta) <= 1) return { status: 'close', nDelta, exceedanceDelta };
  return { status: 'gap', nDelta, exceedanceDelta };
}

function policyFlag(pair, tables) {
  const table = tables.tables[pair.delisting_table];
  if (!table) throw new Error(`${pair.pair_id}: no delisting table ${pair.delisting_table}`);
  pair.min_samples_for_delisting = table.min_samples;
  if (pair.new_samples < table.min_samples) {
    pair.allowed_exceedances_for_delisting = null;
    return 'Under-sampled';
  }
  const row = table.rows.find(({ min, max }) => min <= pair.new_samples && pair.new_samples <= max);
  if (!row) throw new Error(`${pair.pair_id}: post-cutoff n is outside published Table ${pair.delisting_table} coverage`);
  pair.allowed_exceedances_for_delisting = row.allowed;
  return pair.new_exceedances <= row.allowed ? 'Delisting candidate' : 'Still exceeding';
}

function matchedLoeRows(pairResult, sampleResults) {
  const matched = new Set();
  for (const loe of pairResult.loe_records) {
    if (!loe.included_in_final_use_support_rating || !loe.date_start || !loe.date_end) continue;
    const codes = new Set((loe.normalized_station_codes ?? loe.station_codes ?? []).map(normalize));
    const programs = new Set(loe.ceden_programs_found ?? []);
    for (const row of sampleResults) {
      if (!codes.has(normalize(row.station_code)) || row.date < loe.date_start || row.date > loe.date_end) continue;
      if (programs.size && !programs.has(row.program)) continue;
      matched.add(row);
    }
  }
  return [...matched];
}

function verifyCalibration(pairs, samplesById, reconciliation) {
  const rows = [];
  for (const pairId of calibrationPairIds) {
    const pair = pairs.find((entry) => entry.pair_id === pairId);
    const pairAudit = reconciliation.pair_results.find((entry) => entry.pair_id === pairId);
    const samples = samplesById.get(pairId);
    if (!pair || !pairAudit || !samples) throw new Error(`Missing QA calibration input for ${pairId}`);
    const matched = matchedLoeRows(pairAudit, samples.results);
    const screened = matched.filter((row) => classifyQaResult(row, pair, samples.unit).eligible);
    const n = screened.length;
    const exceedances = screened.filter((row) => row.exceeds).length;
    if (n !== pairAudit.official_n || exceedances !== pairAudit.official_exceedances ||
        n !== pairAudit.ceden_source_date_comparable_n ||
        exceedances !== pairAudit.ceden_source_date_comparable_exceedances) {
      throw new Error(`${pairId}: calibrated QA rule no longer reproduces official LOE count ${pairAudit.official_n}/${pairAudit.official_exceedances}; got ${n}/${exceedances}`);
    }
    const qualityCounts = screened.reduce((out, row) => {
      out[row.data_quality] = (out[row.data_quality] ?? 0) + 1;
      return out;
    }, {});
    const batchCounts = screened.reduce((out, row) => {
      out[row.batch_verification] = (out[row.batch_verification] ?? 0) + 1;
      return out;
    }, {});
    rows.push({
      pair_id: pairId,
      n,
      exceedances,
      data_quality: qualityCounts,
      batch_verification: batchCounts,
      qualifiers: [...new Set(screened.map((row) => row.source_qualifier ?? row.qualifier))],
      qacodes: [...new Set(screened.map((row) => row.qacode ?? null))],
      replicate_pairs: [...new Set(screened.map((row) => `${row.collection_replicate}/${row.results_replicate}`))],
    });
  }
  return rows;
}

function statusLabel(status) {
  return status === 'exact' ? 'Exact' : status === 'close' ? 'Close' : 'Gap';
}

function renderReport(validation, standalone = false) {
  const heading = standalone ? '#' : '##';
  const subheading = standalone ? '##' : '###';
  const qaTable = validation.pairs.map((row) => {
    const match = statusLabel(row.match_status);
    const cause = row.validation_cause_detail || causeText[row.cause_key] || row.cause_key;
    const fullPairCounts = row.full_pair_official_n == null
      ? '—'
      : `${row.full_pair_official_n}/${row.full_pair_official_exceedances}`;
    return `| ${row.region_id} | ${row.waterbody_name} / ${row.pollutant} | ${row.decision_id} | ${row.criterion_basis ?? '—'} | ${row.official_n}/${row.official_exceedances} | ${fullPairCounts} | ${row.reproduced_n}/${row.reproduced_exceedances} | ${match} | ${cause} |`;
  }).join('\n');
  const screeningTable = validation.pairs.map((row) =>
    `| ${row.waterbody_name} / ${row.pollutant} | ${row.post_cutoff_eligible_n}/${row.post_cutoff_eligible_exceedances} | ${row.pending_post_cutoff_n} | ${row.screening_flag} |`,
  ).join('\n');
  return `${heading} Calibrated QA screening validation

**Dataset:** ${validation.dataset_version}; **status:** ${validation.data_status}; **QA rule:** ${validation.qa_rule_version}. The data remains provisional and is not a regulatory determination.

${subheading} Calibration rule

The five exact-match pairs reproduce their included official LOE totals when the app includes numeric, unqualified water results with primary collection/results replicates, no QACode, and either \`DataQuality=Passed\` with \`BatchVerification=VAC\` or \`DataQuality=Unknown data quality\` with \`BatchVerification=NR\`. The same eligibility function is applied before and after the cutoff. The five matched LOE windows contain ${validation.calibration_rows.reduce((sum, row) => sum + row.n, 0)} results and ${validation.calibration_rows.reduce((sum, row) => sum + row.exceedances, 0)} exceedances.

No non-detect/censored qualifiers occur in the five calibration windows. Because the app extract does not carry reporting-limit/method-detection-limit values needed to interpret censored results against each criterion, ND, \`<\`, DNQ, and other non-\`=\` qualifiers remain pending QA. Explicit rejected records, QC samples, invalid dates, and non-water matrices are removed before screening; unknown QA outside the two calibrated combinations, other QACodes, missing numeric results, and non-primary replicates remain pending.

${subheading} Official versus reproduced counts

“Reproduced” means CEDEN observations matched to each included LOE's station, source program, analyte, and date window, with the calibrated QA rule applied. Region 3 official counts cover only the selected included Appendix B1 LOEs sharing each fixed criterion; full pair counts are shown separately. The “close” label means both n and exceedance differences are no more than one; “gap” means a larger difference. These are source-alignment comparisons, not regulatory determinations.

| Region | Waterbody / pollutant | Decision | Selected criterion | Selected official n/ex | Full pair n/ex | Reproduced n/ex | Match | Main cause |
|---|---|---:|---|---:|---:|---:|---|---|
${qaTable}

**Exact pair totals:** ${validation.exact_match_count}/${validation.pair_count}; **close:** ${validation.close_match_count}; **gaps:** ${validation.gap_match_count}. Existing unresolved source-count gaps remain documented; they were not changed by this QA recalibration.

${subheading} Post-cutoff screening

Only eligible post-cutoff results contribute to the numerator, denominator, and screening flag. All other retained post-cutoff observations are counted separately as pending QA.

| Waterbody / pollutant | Eligible n/exceedances | Pending QA | Screening flag |
|---|---:|---:|---|
${screeningTable}

Totals: ${validation.post_cutoff_eligible_n} eligible post-cutoff results, ${validation.post_cutoff_eligible_exceedances} eligible exceedances, and ${validation.post_cutoff_pending_n} pending QA results.
`;
}

function replaceReportSections(markdown, validation) {
  const startCandidates = [
    markdown.indexOf('## Cleaning and comparison method'),
    markdown.indexOf('## Calibrated QA screening validation'),
  ].filter((index) => index >= 0);
  const start = startCandidates.length ? Math.min(...startCandidates) : -1;
  const end = markdown.indexOf('## Appendix B1 line-of-evidence inventory');
  if (start < 0 || end < 0 || end <= start) throw new Error('Could not locate validation report sections to refresh');
  return `${markdown.slice(0, start)}${renderReport(validation)}\n${markdown.slice(end)}`;
}

function renderRegion3Validation(validation, reconciliation, cutoffDate) {
  const pairAudits = new Map(reconciliation.pair_results.map((row) => [row.pair_id, row]));
  const pairs = validation.pairs.filter((row) => row.region_id === 'R3');
  const table = pairs.map((row) => {
    const audit = pairAudits.get(row.pair_id);
    if (!audit) throw new Error(`Missing Region 3 source audit for ${row.pair_id}`);
    return `| ${row.waterbody_name} / ${row.pollutant} | ${row.criterion_basis ?? '—'} | ${row.official_n}/${row.official_exceedances} | ${row.full_pair_official_n}/${row.full_pair_official_exceedances} | ${row.reproduced_n}/${row.reproduced_exceedances} | ${audit.broad_station_date_eligible_n}/${audit.broad_station_date_eligible_exceedances} | ${statusLabel(row.match_status)} | ${audit.source_dataset_coverage.matched_loe_count}/${audit.source_dataset_coverage.selected_loe_count} | ${row.post_cutoff_eligible_n}/${row.post_cutoff_eligible_exceedances}; ${row.pending_post_cutoff_n}; ${row.screening_flag} |`;
  }).join('\n');
  const details = pairs.map((row) => {
    const audit = pairAudits.get(row.pair_id);
    const sourceNames = [...new Set(audit.loe_records.map((loe) => loe.program_dataset).filter(Boolean))];
    const cited = [...new Set(audit.included_loe_station_codes ?? [])];
    const matched = [...new Set(audit.loe_records.flatMap((loe) => loe.normalized_station_codes ?? []))];
    const unmatched = audit.unmatched_codes_no_ceden_chemistry ?? [];
    return `### ${row.waterbody_name} / ${row.pollutant}

- Decision ${row.decision_id}; selected criterion: ${row.criterion_basis}.
- Selected LOEs with matching CEDEN source/project rows: ${audit.source_dataset_coverage.matched_loe_count}/${audit.source_dataset_coverage.selected_loe_count}.
- Appendix B1 source programs/datasets: ${sourceNames.join('; ') || 'not identified'}.
- Cited station identifiers: ${cited.join(', ') || 'none'}.
- Matched CEDEN station codes: ${matched.join(', ') || 'none'}.
- Unmatched identifiers: ${unmatched.join(', ') || 'none'}.
- Validation cause: ${row.validation_cause_detail ?? causeText[row.cause_key]}.
- Recent screen: ${row.post_cutoff_eligible_n}/${row.post_cutoff_eligible_exceedances} eligible n/ex; ${row.pending_post_cutoff_n} pending QA; ${row.screening_flag}.
`;
  }).join('\n');
  const exact = pairs.filter((row) => row.match_status === 'exact').length;
  const close = pairs.filter((row) => row.match_status === 'close').length;
  const gap = pairs.filter((row) => row.match_status === 'gap').length;
  return `# Region 3 Central Coast validation

**Dataset:** ${validation.dataset_version}; **data status:** ${validation.data_status}; **official cycle:** 2024 final Integrated Report. Region 3 is off-cycle in the 2026 report. The selected set contains ${pairs.length} Category 5 waterbody-pollutant pairs with one fixed criterion each. This remains provisional and is not a regulatory determination.

The calibrated QA rule is unchanged from the five Region 9 pairs and is applied before and after the ${cutoffDate} cutoff. CEDEN retrieval used every annual chemistry partition, the pre-2000 partition, and the CEDEN augmentation resource, with no SWAMP-only filter. Region 3 official comparisons use only selected Appendix B1 LOEs sharing each fixed criterion; full-pair official totals are retained separately.

**Validation:** ${exact} exact, ${close} close, ${gap} gaps out of ${pairs.length}.

| Waterbody / pollutant | Selected criterion | Selected official n/ex | Full pair official n/ex | CEDEN source/date/QA n/ex | Station/date-only n/ex | Match | LOEs with source match | Post-cutoff eligible n/ex; pending QA; flag |
|---|---|---:|---:|---:|---:|---|---:|---|
${table}

## Per-pair source and gap notes

${details}
`;
}

async function writeQaConfig(projectRoot, validation, reconciliation) {
  const file = path.join(projectRoot, 'pipeline/config/pairs.generated.yaml');
  const current = await fs.readFile(file, 'utf8');
  const withoutPrevious = current.replace(/\nqa_recalibration:\n[\s\S]*$/, '').trimEnd();
  const pairRows = validation.pairs.map((row) => {
    const counts = reconciliation.provisional_qa.pair_accounting[row.pair_id];
    return [
      `  - pair_id: ${JSON.stringify(row.pair_id)}`,
      `    pre_cutoff_eligible_n: ${counts.eligible_pre_cutoff}`,
      `    pre_cutoff_eligible_exceedances: ${counts.eligible_pre_cutoff_exceedances}`,
      `    post_cutoff_eligible_n: ${row.post_cutoff_eligible_n}`,
      `    post_cutoff_eligible_exceedances: ${row.post_cutoff_eligible_exceedances}`,
      `    post_cutoff_pending_qa: ${row.pending_post_cutoff_n}`,
      `    screening_flag: ${JSON.stringify(row.screening_flag)}`,
    ].join('\n');
  }).join('\n');
  const block = [
    'qa_recalibration:',
    '  status: "VERIFY"',
    `  rule_version: ${JSON.stringify(validation.qa_rule_version)}`,
    '  same_rule_before_and_after_cutoff: true',
    '  calibration_pair_count: 5',
    '  pairs:',
    pairRows,
  ].join('\n');
  await fs.writeFile(file, `${withoutPrevious}\n\n${block}\n`);
}

export async function reconcileQaData({ projectRoot = root } = {}) {
  const dataPath = path.join(projectRoot, 'public/data');
  const [metadata, pairs, tables, reconciliation] = await Promise.all([
    readJson(path.join(dataPath, 'metadata.json')),
    readJson(path.join(dataPath, 'waterbodies.json')),
    readJson(path.join(dataPath, 'listing_tables.json')),
    readJson(path.join(projectRoot, 'pipeline/out/ceden-source-reconciliation.json')),
  ]);
  if (metadata.data_status !== 'provisional' || metadata.is_sample_data) {
    return { skipped: true, reason: 'QA recalibration applies only to a real provisional release.' };
  }
  if (metadata.review_complete !== false) throw new Error('QA recalibration must not mark the provisional data reviewed.');
  if (metadata.qa_rule_version !== ruleVersion) throw new Error(`metadata.qa_rule_version must be ${ruleVersion}`);

  const samplesById = new Map();
  for (const pair of pairs) {
    const file = path.join(dataPath, 'samples', `${pair.pair_id}.json`);
    const samples = await readJson(file);
    if (samples.pair_id !== pair.pair_id) throw new Error(`${pair.pair_id}: sample file ID mismatch`);
    if (samples.unit !== pair.criterion_unit) throw new Error(`${pair.pair_id}: sample unit does not match the criterion`);
    if (!Array.isArray(samples.results)) throw new Error(`${pair.pair_id}: sample results must be an array`);
    for (const result of samples.results) {
      if (result.before_cutoff !== (result.date <= metadata.cutoff_date)) throw new Error(`${pair.pair_id}: cutoff flag mismatch for ${result.date}`);
      const classification = classifyQaResult(result, pair, samples.unit);
      result.screening_eligible = classification.eligible;
      result.qa_status = classification.eligible ? 'eligible' : 'pending';
      result.qa_note = classification.note;
    }
    samplesById.set(pair.pair_id, samples);
  }

  const calibration = verifyCalibration(pairs, samplesById, reconciliation);
  const byAudit = new Map(reconciliation.pair_results.map((row) => [row.pair_id, row]));
  let eligibleTotal = 0;
  let eligibleExceedancesTotal = 0;
  let pendingTotal = 0;
  const methodPairs = [];
  const accounting = {};

  for (const pair of pairs) {
    const samples = samplesById.get(pair.pair_id);
    const post = samples.results.filter((result) => !result.before_cutoff);
    const eligiblePost = post.filter((result) => result.screening_eligible);
    const pendingPost = post.filter((result) => !result.screening_eligible);
    pair.new_samples = eligiblePost.length;
    pair.new_exceedances = eligiblePost.filter((result) => result.exceeds).length;
    pair.pending_new_samples = pendingPost.length;
    pair.pending_numeric_outside_count = pendingPost.filter((result) => result.value != null && result.exceeds).length;
    pair.first_new_sample_date = eligiblePost.length ? eligiblePost.map((result) => result.date).sort()[0] : null;
    pair.screening_flag = policyFlag(pair, tables);

    const pre = samples.results.filter((result) => result.before_cutoff);
    const pairAudit = byAudit.get(pair.pair_id);
    if (!pairAudit) throw new Error(`Missing source reconciliation for ${pair.pair_id}`);
    const exactCounts = classifyMatch(
      pairAudit.official_n,
      pairAudit.official_exceedances,
      pairAudit.ceden_source_date_comparable_n,
      pairAudit.ceden_source_date_comparable_exceedances,
    );
    const [fallbackCauseKey, fallbackCauseDetail] = causeByPair[pair.pair_id] ?? ['validationCauseExact', undefined];
    const causeKey = pairAudit.validation_cause_key ?? fallbackCauseKey;
    const causeDetail = pairAudit.validation_cause_detail ?? fallbackCauseDetail ?? causeText[causeKey];
    const row = {
      pair_id: pair.pair_id,
      region_id: pair.region_id ?? 'R9',
      waterbody_name: pair.waterbody_name,
      pollutant: pair.pollutant,
      decision_id: pair.decision_id,
      official_n: pairAudit.official_n,
      official_exceedances: pairAudit.official_exceedances,
      full_pair_official_n: pairAudit.official_all_n ?? pairAudit.official_n,
      full_pair_official_exceedances: pairAudit.official_all_exceedances ?? pairAudit.official_exceedances,
      validation_scope: pairAudit.validation_scope ?? 'Included official LOEs for the pair.',
      criterion_basis: pair.criterion_basis,
      reproduced_n: pairAudit.ceden_source_date_comparable_n,
      reproduced_exceedances: pairAudit.ceden_source_date_comparable_exceedances,
      match_status: exactCounts.status,
      n_delta: exactCounts.nDelta,
      exceedance_delta: exactCounts.exceedanceDelta,
      cause_key: causeKey,
      validation_cause_detail: causeDetail,
      post_cutoff_eligible_n: pair.new_samples,
      post_cutoff_eligible_exceedances: pair.new_exceedances,
      pending_post_cutoff_n: pair.pending_new_samples,
      screening_flag: pair.screening_flag,
    };
    methodPairs.push(row);

    accounting[pair.pair_id] = {
      ...(reconciliation.provisional_qa.pair_accounting[pair.pair_id] ?? {}),
      retained_pre_cutoff: pre.length,
      eligible_pre_cutoff: pre.filter((result) => result.screening_eligible).length,
      eligible_pre_cutoff_exceedances: pre.filter((result) => result.screening_eligible && result.exceeds).length,
      pending_pre_cutoff: pre.filter((result) => !result.screening_eligible).length,
      retained_post_cutoff: post.length,
      eligible_post_cutoff: pair.new_samples,
      eligible_post_cutoff_exceedances: pair.new_exceedances,
      pending_post_cutoff: pair.pending_new_samples,
      pending_numeric_outside_post_cutoff: pair.pending_numeric_outside_count,
      screening_flag: pair.screening_flag,
    };
    eligibleTotal += pair.new_samples;
    eligibleExceedancesTotal += pair.new_exceedances;
    pendingTotal += pair.pending_new_samples;
    await writeJson(path.join(dataPath, 'samples', `${pair.pair_id}.json`), samples);
  }

  const exact = methodPairs.filter((row) => row.match_status === 'exact').length;
  const close = methodPairs.filter((row) => row.match_status === 'close').length;
  const gap = methodPairs.filter((row) => row.match_status === 'gap').length;
  reconciliation.provisional_qa = {
    ...reconciliation.provisional_qa,
    rule_version: ruleVersion,
    rule: 'Same rule before and after cutoff: DataQuality=Passed with BatchVerification=VAC, or DataQuality=Unknown data quality with BatchVerification=NR; blank QACode; numeric ResultQualCode="="; water matrix; compatible pair unit; CollectionReplicate=1 and ResultsReplicate=1. Exact duplicate source rows are already collapsed. Censored/non-detect results and all other QA combinations remain pending.',
    calibration_pair_ids: calibrationPairIds,
    calibration_verified: calibration,
    apply_same_rule_pre_and_post_cutoff: true,
    pair_accounting: accounting,
    totals: {
      pre_cutoff_retained: Object.values(accounting).reduce((sum, row) => sum + row.retained_pre_cutoff, 0),
      pre_cutoff_eligible: Object.values(accounting).reduce((sum, row) => sum + row.eligible_pre_cutoff, 0),
      pre_cutoff_eligible_exceedances: Object.values(accounting).reduce((sum, row) => sum + row.eligible_pre_cutoff_exceedances, 0),
      post_cutoff_retained: Object.values(accounting).reduce((sum, row) => sum + row.retained_post_cutoff, 0),
      post_cutoff_eligible: eligibleTotal,
      post_cutoff_eligible_exceedances: eligibleExceedancesTotal,
      post_cutoff_pending_qa: pendingTotal,
    },
  };
  await writeJson(path.join(projectRoot, 'pipeline/out/ceden-source-reconciliation.json'), reconciliation);
  await writeJson(path.join(dataPath, 'waterbodies.json'), pairs);

  const validation = {
    dataset_version: metadata.dataset_version,
    data_status: metadata.data_status,
    qa_rule_version: metadata.qa_rule_version,
    calibration_pair_ids: calibrationPairIds,
    calibration_rows: calibration,
    exact_match_count: exact,
    close_match_count: close,
    gap_match_count: gap,
    pair_count: methodPairs.length,
    post_cutoff_eligible_n: eligibleTotal,
    post_cutoff_eligible_exceedances: eligibleExceedancesTotal,
    post_cutoff_pending_n: pendingTotal,
    pairs: methodPairs,
  };
  await writeJson(path.join(dataPath, 'method-validation.json'), validation);
  await writeQaConfig(projectRoot, validation, reconciliation);

  const reportPath = path.join(projectRoot, 'pipeline/out/validation.md');
  const originalReport = await fs.readFile(reportPath, 'utf8');
  await fs.writeFile(reportPath, replaceReportSections(originalReport, validation));
  await fs.writeFile(path.join(projectRoot, 'pipeline/out/qa-screen-validation.md'), renderReport(validation, true));
  await fs.writeFile(
    path.join(projectRoot, 'pipeline/out/region3-validation.md'),
    renderRegion3Validation(validation, reconciliation, metadata.cutoff_date),
  );
  return validation;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await reconcileQaData();
  if (result.skipped) console.log(`NextCycle QA recalibration skipped: ${result.reason}`);
  else console.log(`NextCycle QA: ${result.calibration_pair_ids.length}/${result.calibration_pair_ids.length} calibration pairs match; ${result.pair_count} pairs screened; post-cutoff ${result.post_cutoff_eligible_n} eligible, ${result.post_cutoff_pending_n} pending QA.`);
}
