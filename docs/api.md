# NextCycle static API v1

No server, token, database, user account or request logging is required. These UTF-8 files are written at build/refresh time from the same validated dataset the website displays. They are static snapshots, not live monitoring feeds.

Paths below are relative to the deployed application prefix. For example a `/nextcycle/` deployment serves `/nextcycle/api/v1/waters.json`, not `/api/v1/waters.json`.

| Endpoint | JSON shape / content |
|---|---|
| `api/v1/waters.json` | Array of full waterbody–pollutant pair records |
| `api/v1/waters/{pair_id}.json` | One full pair record with the same field names |
| `api/v1/data-gaps.json` | Under-sampled pair array with computed `samples_needed` |
| `api/v1/meta.json` | Dataset metadata plus `api_version`, `app_version`, `data_license_note` and `endpoints` |
| `api/v1/waters.csv` | All pairs, all schema fields, UTF-8 BOM, RFC-style quoted CSV |

Complex CSV values (geometry, centroid and arrays) are JSON strings. Cells beginning with spreadsheet formula characters are prefixed with an apostrophe; use JSON for exact machine round trips. Metadata and pair CSVs include `data_status`; retain that status and the source provenance when reusing the records.

```js
// Same-origin root deployment; replace the prefix when hosting under a subdirectory.
const base = new URL("/", window.location.origin);
async function getJSON(relativePath) {
  const response = await fetch(new URL(relativePath, base));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!response.headers.get("content-type")?.includes("json")) {
    throw new Error("Expected JSON; this may be an SPA fallback for a missing file");
  }
  return response.json();
}
const [metadata, waters] = await Promise.all([
  getJSON("api/v1/meta.json"),
  getJSON("api/v1/waters.json")
]);
const first = waters[0];
if (first) {
  const detail = await getJSON(`api/v1/waters/${encodeURIComponent(first.pair_id)}.json`);
  console.log(metadata.dataset_version, metadata.data_status, detail);
}
```

Cross-origin consumers need their static host to send an appropriate `Access-Control-Allow-Origin` header. This project does not add a backend proxy or promise CORS headers on hosts it does not control. Missing pair IDs may return a host's 404 or HTML SPA fallback; consumers must check status AND parse/type.

## Versioning and refreshes

`v1` is the endpoint contract version. `dataset_version` is a separate source refresh identifier. Replace related data and sample files together, increment the dataset version and generation timestamp, then run `npm run data:refresh` followed by the production build. The release generator validates the data before publishing assets and appends a snapshot to `data/history.json`. Builds of unchanged data do not invent refreshes.

`feed.xml` publishes refreshes in Atom format; `data/history.json` retains the machine-readable snapshots. Counts compare only snapshots with the same `data_status`; a status transition is a new baseline, not a trend. Eligible samples and pending QA observations are tracked separately. A first provisional source-data release starts a new history baseline rather than comparing illustrative values with monitoring records.

## Meaning and limitations

The flags `Delisting candidate`, `Still exceeding` and `Under-sampled` are supplied screening indicators. User-facing labels remain centralized in the website. These are not official delistings, enforcement decisions, permit determinations, safe-swimming advisories or drinking-water advice.

The calculator uses `data/listing_tables.json`, a sourced transcription of the printed 2015 Policy tables, without extrapolating beyond their coverage. The API preserves the data publisher's table selection; selecting a table for a pollutant requires qualified review. Full sample handling, temporal/spatial representativeness, changing criteria and weight of evidence are not independently adjudicated here.

## License

Application code is MIT. Public monitoring and official listing records retain their source terms, citations and attribution obligations. Read `metadata.license`, `metadata.sources`, each source's published terms and `data_status` before redistribution. MIT software licensing does not automatically relicense third-party data.

## Citation

> NextCycle / Utilyst. *[waterbody name], [pollutant]: [data_status] water-quality screening*. Dataset [dataset_version], monitoring through [monitoring_data_through], accessed [date]. [Canonical waterbody URL]. Include the applicable disclaimer from metadata and retain the official and monitoring source links.

Always include dataset version, data status, source links, monitoring coverage and access date. The intended canonical domain is configurable; this documentation does not establish that `nextcycle.tech` has been published.
