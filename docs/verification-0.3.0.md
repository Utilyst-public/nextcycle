# 0.3.0 verification

> Historical build verification for the earlier illustrative dataset. Current
> Region 9 records, exclusions and official-count comparison are documented in
> [`pipeline/out/validation.md`](../pipeline/out/validation.md); its pair counts
> and findings supersede the sample-data-specific checks below.

Verified on November 18, 2026 using Node 24. The site remains a standalone
static React/Vite app; the API paths are generated files, not a server.

## Passed

- `npm test`: eight suites covering every published policy-table boundary,
  unsupported scenarios, minimum clean sample counts, idempotent history,
  CSV escaping, URL prefixes, bilingual scientific display names, and
  generated endpoints for sample and synthetic real-contract fixtures.
- `npm run build`: TypeScript and production generation completed, with output
  in `dist/public`. Fourteen pairs produce 38 unique page heads, a sitemap,
  per-pair PNGs, static API files, full CSV and an Atom feed.
- A separate temporary folder, without workspace packages or `node_modules`,
  completed `npm install --no-audit --no-fund`, `npm run build` and the tests.
  Final source changes were copied into that isolated installation and rebuilt.
- Browser review: ZIP search → Otay River → sampling calculator → Spanish →
  clipboard citation/iframe → standalone embed → map. OpenFreeMap tiles,
  colored waterbody lines, station dots and attribution rendered. Static API,
  Updates, Showcase and Atom URLs returned 200 without the API server running.
- Otay scenario: 9 existing samples / 1 exceedance plus 19 clean samples
  passed the count screen at 28 / 1; adding 5 exceedances instead failed at
  28 / 6. Neither result changes the official listing.
- Simulated browser geolocation returned five nearest waters with results and
  distances. Coordinates did not appear in resource URLs. Real browser
  permission prompts were not exercised.
- Language choice persisted through reload. A targeted check after review
  confirmed Spanish pollutant names, policy source captions and the correct
  November 18 verification date. Unknown source terms remain as published;
  raw JSON and CSV retain original source names.
- Desktop and 390px mobile screenshots were inspected. No horizontal overflow
  or page errors were observed. The print brief generated exactly one PDF page.
- Generated waterbody heads were checked for unique titles, pair-specific OG
  images and embedded validated data; each per-pair endpoint matched its record.

## Lighthouse: target not fully met

Local production preview, Lighthouse 13.0.1, default simulated mobile settings:

| Page | Performance | Accessibility | Best practices | SEO | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 80 | 100 | 100 | 100 | 0 |
| Sweetwater River detail | 80 | 100 | 100 | 100 | 0 |
| Requested minimum | 90 | 95 | 95 | 95 | |

Performance remains below the requested 90. Final measured total blocking time
was 660 ms on Home and 420 ms on detail. Changes made include validated static
data bootstrapping, route and chart code splitting, deferred image-export code,
font preloads, cached number/date formatters, and removal of layout-shifting
entry transitions. More initial JavaScript/rendering optimization is still
needed; a passing speed score is **not** claimed.

Local audit JSON, screenshots and the PDF are in the ignored
`generated-artifacts/` directory.

## Deliberate limits and external dependencies

- The bundled records and place associations are illustrative sample data,
  not evidence of actual water-quality improvement. Real-contract tests used
  synthetic fixtures, not a reviewed production monitoring dataset.
- Policy values were checked against the official February 3, 2015 Listing
  Policy, printed pages 14–15. For example, Table 4.2 permits four exceedances
  at 26–30 samples, not two. No values are extrapolated beyond the transcribed
  rows. This does not validate station selection, criteria or regulatory use.
- No verified Tribal boundary GeoJSON was supplied. Its toggle is hidden as
  requested. Optional verified community fields and the conditional layer
  are supported; no Tribal intersection is invented from sample centroids.
- History starts with the current snapshot; there is no fabricated prior-month
  improvement or evidence of use. New versions append when the pipeline runs.
- GoatCounter is disabled unless explicitly configured. No analytics account,
  real page counts or outside submissions were created.
- `https://nextcycle.tech` is the intended canonical/share origin, not a
  confirmed deployment. Configure the public origin/base path for another host.
- The configured `https://github.com/utilyst/nextcycle` repository returned
  HTTP 404. Issue links contain the pair ID and dataset version in both title
  and body, but successful submission requires an accessible repository.
- The replacement `https://github.com/Utilyst-public/nextcycle` repository and
  its `/issues` page returned HTTP 200; GitHub's public repository API reports
  `has_issues: true`. The current metadata uses this accessible issue target.
