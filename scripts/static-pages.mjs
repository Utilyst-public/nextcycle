import fs from 'node:fs/promises';
import path from 'node:path';
import { root, readJson, siteSettings, xml } from './release-data.mjs';

const routes = [
  ['', 'California water evidence, before the next list', 'Explore newer California water-quality monitoring, screening estimates and data gaps. Find your waters without an account.'],
  ['watch', 'Watch list', 'Browse waterbody and pollutant pairs by screening result, county and recent monitoring evidence.'],
  ['map', 'Map', 'Explore listed waters, monitoring stations and community context on an interactive map.'],
  ['data-gaps', 'Data gaps', 'Find where more representative water samples could close evidence gaps. Try count-based sampling scenarios.'],
  ['method', 'Method', 'Review the provisional screening approach, candidate policy-table choices, evidence limits and source data.'],
  ['utilities', 'For utilities', 'Use transparent water-quality screening to help plan monitoring, budgets and review of official assessments.'],
  ['about', 'About and privacy', 'About NextCycle, the people behind it and how private browser location and optional analytics work.'],
  ['updates', 'First provisional data snapshot', 'Review the first provisional snapshot and its pending human-review evidence.'],
  ['api', 'Open data API', 'Download NextCycle JSON and CSV datasets, review the static v1 API and cite the source.'],
  ['showcase', 'NextCycle showcase', 'The problem, computed findings, open data, community access and a five-minute NextCycle demo.'],
];
const tag = (name, value, attr = 'name') => `<meta ${attr}="${name}" content="${xml(value)}" />`;
export async function writeStaticPages(outDir = path.join(root, 'dist', 'public'), env = process.env) {
  const metadata = await readJson(path.join(root, 'public/data/metadata.json'));
  const pairs = await readJson(path.join(root, 'public/data/waterbodies.json'));
  const { absolute, base } = siteSettings(metadata, env);
  const template = (await fs.readFile(path.join(outDir, 'index.html'), 'utf8')).replace(/<script id="nextcycle-bootstrap"[^>]*>[\s\S]*?<\/script>/g, '');
  const bootstrap = JSON.stringify({
    metadata, pairs,
    stations: await readJson(path.join(root, 'public/data/stations.json')),
    about: await readJson(path.join(root, 'public/data/about.json')),
  }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const assets = await fs.readdir(path.join(outDir, 'assets'));
  const routeModules = { watch: 'Watch', map: 'MapPage', 'data-gaps': 'DataGaps', method: 'Method', utilities: 'Utilities', about: 'About', updates: 'Updates', api: 'Api', showcase: 'Showcase', w: 'Detail', embed: 'Embed' };
  const fontPreloads = [400, 700].map((weight) => assets.find((file) => new RegExp(`^inter-latin-${weight}-normal-.*\\.woff2$`).test(file)))
    .filter(Boolean).map((file) => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${xml(base + 'assets/' + file)}" />`).join('');
  const pages = [...routes, ...pairs.flatMap((p) => {
    const direction = p.criterion_direction === 'lower' ? 'below minimum' : p.criterion_direction === 'range' ? 'outside range' : 'above limit';
    const description = `${p.waterbody_name}, ${p.pollutant}: ${p.new_exceedances} of ${p.new_samples} eligible recent CEDEN results ${direction}; ${p.pending_new_samples ?? 0} additional results are pending QA review.`;
    return [[`w/${p.pair_id}`, `${p.waterbody_name} — ${p.pollutant}`, description, `og/${p.pair_id}.png`],
      [`embed/${p.pair_id}`, `${p.waterbody_name} — embed`, description, `og/${p.pair_id}.png`]];
  })];
  const statusText = metadata.data_status === 'provisional' ? 'Real public data. Provisional screening, not yet reviewed. Not a regulatory determination.' :
    metadata.data_status === 'illustrative' ? 'Illustrative sample data—not a real assessment.' : 'Screening estimate, not an official decision.';
  for (const page of pages) page[2] = `${page[2]} ${statusText}`;
  for (const [route, title, description, image = 'og-image.png'] of pages) {
    const fullTitle = `${title} | NextCycle`;
    let html = template.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<meta\s+(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi, '').replace(/<link\s+rel=["'](?:canonical|alternate)["'][^>]*>/gi, '');
    const head = `<title>${xml(fullTitle)}</title>\n${tag('description', description)}\n${tag('robots', 'index,follow')}\n<link rel="canonical" href="${xml(absolute(route))}" />\n<link rel="alternate" type="application/atom+xml" title="NextCycle updates" href="${xml(absolute('feed.xml'))}" />\n${tag('og:title', fullTitle, 'property')}${tag('og:description', description, 'property')}${tag('og:url', absolute(route), 'property')}${tag('og:image', absolute(image), 'property')}${tag('og:type', 'website', 'property')}${tag('og:image:width', '1200', 'property')}${tag('og:image:height', '630', 'property')}${tag('og:image:alt', title, 'property')}${tag('twitter:card', 'summary_large_image')}${tag('twitter:title', fullTitle)}${tag('twitter:description', description)}${tag('twitter:image', absolute(image))}`;
    const moduleName = routeModules[route.split('/')[0]];
    const chunk = moduleName && assets.find((file) => file.startsWith(moduleName + '-') && file.endsWith('.js'));
    const preload = chunk ? `<link rel="modulepreload" href="${xml(base + 'assets/' + chunk)}" />` : '';
    html = html.replace('<head>', '<head>' + fontPreloads).replace('</head>', head + preload + '\n</head>');
    html = html.replace('<div id="root"></div>', `<script id="nextcycle-bootstrap" type="application/json">${bootstrap}</script><div id="root"></div>`);
    const folder = path.join(outDir, route);
    await fs.mkdir(folder, { recursive: true });
    await fs.writeFile(path.join(folder, 'index.html'), html);
    // Vite and many static hosts resolve extensionless URLs through .html before
    // directory indexes. Keep both forms so /w/id gets its own crawler metadata.
    if (route) await fs.writeFile(path.join(outDir, route + '.html'), html);
  }
  await fs.writeFile(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(([route]) => `<url><loc>${xml(absolute(route))}</loc><lastmod>${xml(metadata.generated_at.slice(0, 10))}</lastmod></url>`).join('')}</urlset>\n`);
  await fs.writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${absolute('sitemap.xml')}\n`);
  const home = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
  await fs.writeFile(path.join(outDir, '404.html'), home.replace('<meta name="robots" content="index,follow" />', '<meta name="robots" content="noindex,follow" />'));
  console.log(`NextCycle: wrote ${pages.length} crawlable page heads, sitemap and 404 fallback.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.join(root, 'scripts', 'static-pages.mjs')) await writeStaticPages();
