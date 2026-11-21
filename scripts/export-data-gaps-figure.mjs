import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { noUsableWaterStats, samplesNeeded } from '../src/data/selectors.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metadata = JSON.parse(await fs.readFile(path.join(root, 'public/data/metadata.json'), 'utf8'));
const pairs = JSON.parse(await fs.readFile(path.join(root, 'public/data/waterbodies.json'), 'utf8'));
const releasePairs = pairs.filter((pair) => pair.region_id === 'R9');
const waterStats = noUsableWaterStats(releasePairs);
const groupTotals = new Map();
for (const pair of releasePairs.filter((item) => item.screening_flag === 'Under-sampled')) {
  groupTotals.set(pair.pollutant_group, (groupTotals.get(pair.pollutant_group) ?? 0) + samplesNeeded(pair));
}
const groups = [...groupTotals].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
if (!groups.length || groups.some(({ value }) => !Number.isFinite(value) || value < 0)) {
  throw new Error('Cannot export Data Gaps figure: sample-needed chart data is empty or invalid.');
}

const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const displayDate = (iso) => new Intl.DateTimeFormat('en-US', {
  month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
const cutoffDate = displayDate(metadata.cutoff_date);
const cedenDate = displayDate(metadata.monitoring_data_through);
const axisMax = Math.max(100, Math.ceil(Math.max(...groups.map(({ value }) => value)) / 100) * 100);
const axisLeft = 460;
const axisWidth = 920;
const chartTop = 486;
const chartBottom = 686;
const barYs = groups.length === 1 ? [548] : [512, 615];
const ticks = Array.from({ length: Math.floor(axisMax / 100) + 1 }, (_, index) => index * 100);
const grid = ticks.map((tick) => {
  const x = axisLeft + (tick / axisMax) * axisWidth;
  return `<line x1="${x}" y1="${chartTop}" x2="${x}" y2="${chartBottom}" stroke="#d9dedd" stroke-width="2"/>
    <text x="${x}" y="721" text-anchor="middle" fill="#647581" font-size="20">${tick}</text>`;
}).join('');
const bars = groups.map((group, index) => {
  const y = barYs[index] ?? chartTop + 26 + index * 76;
  const width = Math.max(0, (group.value / axisMax) * axisWidth);
  return `<text x="112" y="${y + 38}" fill="#123047" font-size="26" font-weight="600">${escapeXml(group.name)}</text>
    <rect x="${axisLeft}" y="${y}" width="${width}" height="52" rx="10" fill="#095c53"/>
    <text x="${axisLeft + width + 18}" y="${y + 36}" fill="#123047" font-size="25" font-weight="700">${group.value}</text>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900" font-family="Inter, Arial, sans-serif">
  <rect width="1600" height="900" fill="#f7fafc"/>
  <text x="112" y="94" fill="#167680" font-size="20" font-weight="700" letter-spacing="2">NEXTCYCLE / DATA GAPS</text>
  <text x="112" y="184" fill="#095c53" font-size="58" font-weight="700">${waterStats.withoutUsableSamples} of ${waterStats.total} listed San Diego waters</text>
  <text x="112" y="258" fill="#095c53" font-size="44" font-weight="700">have no usable public samples since ${cutoffDate}.</text>
  <text x="112" y="318" fill="#647581" font-size="24">Public monitoring records since the October 2024 cutoff; counts are provisional.</text>
  <rect x="72" y="365" width="1456" height="410" rx="20" fill="#ffffff" stroke="#d9dedd" stroke-width="2"/>
  <text x="112" y="426" fill="#123047" font-size="29" font-weight="650">Additional samples needed by pollutant group</text>
  ${grid}
  ${bars}
  <text x="112" y="756" fill="#647581" font-size="18">Units: additional samples needed across ${releasePairs.length} listed San Diego waterbody–pollutant pairs.</text>
  <text x="112" y="828" fill="#123047" font-size="21">Counts reflect data in CEDEN as of ${cedenDate}. Recent data may not have been submitted yet.</text>
  <text x="112" y="872" fill="#8a6100" font-size="21" font-weight="700">Real public data. Provisional screening, not yet reviewed. Not a regulatory determination.</text>
</svg>`;

const outputPath = path.join(root, 'public/press/data-gaps-key-figure.png');
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outputPath);
console.log(`Exported ${outputPath} (1600x900; ${waterStats.withoutUsableSamples}/${waterStats.total} waters; ${groups.map(({ name, value }) => `${name}: ${value}`).join(', ')}).`);
