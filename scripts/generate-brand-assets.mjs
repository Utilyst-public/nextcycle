import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandDir = path.join(root, 'public', 'brand');
const [markSvg, whiteMarkSvg] = await Promise.all([
  fs.readFile(path.join(brandDir, 'nextcycle-mark.svg'), 'utf8'),
  fs.readFile(path.join(brandDir, 'nextcycle-mark-white.svg'), 'utf8'),
]);

await sharp(Buffer.from(markSvg))
  .resize(32, 32)
  .png()
  .toFile(path.join(brandDir, 'favicon-32.png'));

await sharp(Buffer.from(markSvg))
  .resize(180, 180)
  .flatten({ background: '#FFFFFF' })
  .png()
  .toFile(path.join(brandDir, 'apple-touch-icon.png'));

function innerSvg(svg) {
  const match = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/);
  if (!match) throw new Error('Brand mark must be a valid SVG.');
  return match[1];
}

const lightMark = innerSvg(markSvg);
const darkMark = innerSvg(whiteMarkSvg);
const sizeRows = [
  { size: 16, y: 58 },
  { size: 32, y: 104 },
  { size: 128, y: 180 },
];
const previewSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="340" viewBox="0 0 880 340">
  <rect width="440" height="340" fill="#F7FAFC"/>
  <rect x="440" width="440" height="340" fill="#095C53"/>
  <g font-family="Inter,Arial,sans-serif" font-weight="700" font-size="16">
    <text x="28" y="34" fill="#095C53">LIGHT BACKGROUND</text>
    <text x="468" y="34" fill="#FFFFFF">DARK BACKGROUND</text>
  </g>
  <g font-family="Inter,Arial,sans-serif" font-size="14">
    <text x="30" y="71" fill="#095C53">16 px</text>
    <text x="30" y="125" fill="#095C53">32 px</text>
    <text x="30" y="247" fill="#095C53">128 px</text>
    <text x="470" y="71" fill="#FFFFFF">16 px</text>
    <text x="470" y="125" fill="#FFFFFF">32 px</text>
    <text x="470" y="247" fill="#FFFFFF">128 px</text>
  </g>
  ${sizeRows.map(({ size, y }) => `<g transform="translate(150 ${y}) scale(${size / 100})">${lightMark}</g>`).join('\n')}
  ${sizeRows.map(({ size, y }) => `<g transform="translate(590 ${y}) scale(${size / 100})">${darkMark}</g>`).join('\n')}
</svg>`;
await fs.writeFile(path.join(root, 'docs', 'brand-mark-sizes.svg'), previewSvg);

console.log('Generated 32px favicon, 180px Apple touch icon, and brand size comparison.');
