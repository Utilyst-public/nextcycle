// Optional maintainer-only geographic enrichment. The website never calls Census.
// Intersects complete official waterbody lines with Census areas. Results are spatial
// candidates, not human-reviewed reach or postal associations.
import path from 'node:path';
import { createHash } from 'node:crypto';
import { root, readJson, writeJson } from './release-data.mjs';

const census = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/';
const layers = [
  ['cities', 'Places_CouSub_ConCity_SubMCD/MapServer/4'],
  ['cities', 'Places_CouSub_ConCity_SubMCD/MapServer/5'],
  ['zips', 'PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1'],
];
const pairs = await readJson(path.join(root, 'public/data/waterbodies.json'));
const associations = [];
for (const p of pairs) {
  const geometryHash = createHash('sha256').update(JSON.stringify(p.geometry)).digest('hex');
  const association = { pair_id: p.pair_id, geometry_sha256: geometryHash, status: 'VERIFY', cities: [], zips: [] };
  const results = await Promise.all(layers.map(async ([field, layer]) => {
    const url = new URL(census + layer + '/query');
    const paths = p.geometry.type === 'LineString' ? [p.geometry.coordinates] : p.geometry.coordinates;
    const params = new URLSearchParams({
      f: 'json',
      geometry: JSON.stringify({ paths, spatialReference: { wkid: 4326 } }),
      geometryType: 'esriGeometryPolyline',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'BASENAME,GEOID',
      returnGeometry: 'false',
      returnDistinctValues: 'true',
      resultRecordCount: '1000',
      orderByFields: field === 'zips' ? 'GEOID' : 'BASENAME',
    });
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params,
          signal: AbortSignal.timeout(35000),
        });
        if (!response.ok) throw new Error(`Census returned ${response.status}`);
        const json = await response.json();
        if (json.error || !Array.isArray(json.features)) throw new Error(JSON.stringify(json.error || 'Missing features'));
        return [field, json.features.map((f) => String(f.attributes[field === 'zips' ? 'GEOID' : 'BASENAME'])).filter((v) => v && v !== 'null')];
      } catch (error) { lastError = error; }
    }
    throw lastError;
  }));
  for (const [field, values] of results) association[field].push(...values);
  association.cities = [...new Set(association.cities)];
  association.zips = [...new Set(association.zips)];
  associations.push(association);
  console.log(`${p.waterbody_name}: ${association.cities.join(', ') || 'no place intersection'} / ${association.zips.join(', ') || 'no ZCTA intersection'} (VERIFY)`);
}
// Only write if every request succeeded; preserve the previous cache on failure.
await writeJson(path.join(root, 'public/data/place_associations.json'), {
  retrieved_at: new Date().toISOString(),
  method: 'Census TIGERweb esriGeometryPolyline intersections using each complete official 2026 waterbody geometry. Outputs are spatial candidates and remain VERIFY pending human review. ZCTA (2020) approximates a ZIP area, not postal delivery coverage.',
  sources: layers.map(([field, layer]) => ({ field, url: census + layer })),
  associations,
});
