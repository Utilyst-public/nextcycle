# Static data contract

All JSON uses UTF-8, snake_case keys, ISO 8601 dates, and finite numeric values. Files live under `public/data/` and are requested relative to the app base path. Runtime Zod schemas in `src/data/schema.ts` are the executable source of truth. Invalid files must produce a visible error, not silently fall back to demonstration records.

## `metadata.json`

| Field | Type | Meaning |
|---|---|---|
| `dataset_version` | string | Version identifying the published source snapshot |
| `data_status` | `illustrative`, `provisional`, or `reviewed` | Controls public disclosure and history comparison boundaries |
| `is_sample_data` | boolean | `true` only when records are illustrative/demo samples; `false` for real source records, including unreviewed provisional data |
| `review_complete` | boolean | Human-maintained release gate; set true only after every item in `pipeline/out/VERIFY.md` is reviewed |
| `qa_rule_version` | optional string | Identifies the screening QA rule used for this release and its comparable history snapshots |
| `generated_at` | datetime string | Dataset generation timestamp |
| `monitoring_data_through` | date string | Latest monitoring coverage date |
| `cutoff_date` | date string | Supplied cycle cutoff |
| `next_cycle` | string | Human-readable cycle name |
| `regions` | array | Objects with string `region_id`, `region_name` |
| `sources` | array | Objects with string `name`, `publisher`, and absolute `url` |

The current provisional Region 9 release uses the cutoff `2024-10-23`. The selected fact-sheet stations provide only a partial subset of the official decision evidence; the accompanying validation report records the mismatch rather than treating it as an assessment reproduction.

The current CEDEN extraction covers annual, pre-2000, and Augmentation chemistry resources without a SWAMP-only or program filter. Program, parent project, project, resource, station-code, qualifier, and QA fields remain attached to each observation. Dissolved oxygen, pH, and temperature field-result rows are inventoried separately; a pair’s sample file contains only its selected pollutant.

`review_complete` is not produced by automated checks and does not mean that the Water Boards or EPA approved the data. An `illustrative` release uses `is_sample_data: true`; provisional and reviewed releases use real source records and `is_sample_data: false`. Only `reviewed` data requires `review_complete: true`. The Region 9 release intentionally keeps `data_status: "provisional"`, `is_sample_data: false`, and `review_complete: false` until the reviewer checks the evidence. Structural checks are not scientific validation.

## `waterbodies.json`

An array of waterbody–pollutant pairs. A waterbody can appear more than once; `pair_id` must be unique.

| Fields | Type / allowed values |
|---|---|
| `pair_id`, `waterbody_id`, `waterbody_name` | Nonempty strings |
| `waterbody_type` | `River/Stream`, `Lake/Reservoir`, `Bay/Harbor`, `Coastal`, `Lagoon/Estuary` |
| `region_id`, `county` | Strings |
| `centroid` | `{ "lat": number, "lon": number }`, decimal WGS84 degrees |
| `geometry` | GeoJSON `LineString`, `MultiLineString`, `Polygon`, or `MultiPolygon`; coordinates are longitude then latitude |
| `pollutant` | String, e.g. `Dissolved zinc` |
| `pollutant_group` | `Metals`, `Nutrients`, `Conventional`, `Toxicity`, `Other` |
| `official_status` | `Listed` or `Not listed` |
| `official_category` | String `5`, `4a`, `4b`, `3`, `2`, or `1` |
| `official_cycle` | Numeric 2024 or 2026 |
| `decision_id`, `fact_sheet_url` | String identifier and absolute source URL |
| `tmdl_status` | `TMDL required`, `TMDL adopted`, `Other control`, `None` |
| `criterion_direction` | `upper`, `lower`, or `range` |
| `criterion_value` | Number, in `criterion_unit`; lower bound for a range |
| `criterion_value_upper` | Number or null; upper bound for a range |
| `criterion_unit`, `criterion_basis` | Strings; examples `µg/L`, `mg/L`, `pH units` |
| `beneficial_uses` | Array of use-code strings |
| `listing_table` | String `3.1` or `3.2` |
| `delisting_table` | String `4.1` or `4.2` |
| `new_samples`, `new_exceedances` | Nonnegative integer counts after cutoff |
| `pending_new_samples`, `pending_numeric_outside_count` | Optional post-cutoff observations retained but not counted because the calibrated QA or replicate screen is pending |
| `allowed_exceedances_for_delisting` | Nonnegative integer, or null when insufficient data |
| `min_samples_for_delisting` | Integer 26 or 28, chosen for the applicable table |
| `screening_flag` | `Delisting candidate`, `Still exceeding`, `Under-sampled` |
| `first_new_sample_date`, `last_sample_date` | `first_new_sample_date` may be null when no post-cutoff observation exists; `last_sample_date` is a date string |
| `station_count` | Nonnegative integer |
| `ces_percentile` | Optional number from 0 to 100, or null when no reviewed association is supplied |
| `disadvantaged_community` | Optional boolean or null; a true value requires a sourced percentile |
| `summary` | Plain-language string |
| `data_gap_note` | String or null |

### Criteria

`upper` means a result above `criterion_value` exceeds. `lower` means a result below it exceeds. `range` means a result below `criterion_value` or above `criterion_value_upper` exceeds. Equality is not an exceedance in the current provisional implementation. This compact representation does not encode averaging periods, seasonal windows, beneficial-use-specific objectives, or every source qualifier; exclude complex criteria unless a reviewer confirms the reduction.

Example:

```json
{
  "criterion_direction": "range",
  "criterion_value": 6.5,
  "criterion_value_upper": 8.5,
  "criterion_unit": "pH units"
}
```

Screening flags and allowable counts are supplied by the dataset, not regulatory determinations generated by the website. The current flag taxonomy is intended for already listed pairs; non-listed data requires an explicit reviewed interpretation rather than assuming a delisting path.

## `stations.json`

Array of objects:

| Field | Type |
|---|---|
| `station_code`, `station_name`, `waterbody_id` | Strings |
| `lat`, `lon` | WGS84 decimal degrees |
| `link_method` | `Fact sheet` or `Spatial join`; a proximity association remains a candidate until reviewed |
| `sample_count` | Nonnegative integer |
| `last_sample_date` | Date string |

Station-to-pair association is through the waterbody ID and sample station codes. Station totals can cover more than one pollutant; do not assume they equal one pair’s post-cutoff count.

## `samples/{pair_id}.json`

An object containing:

- `pair_id`: string matching the filename and parent pair.
- `unit`: string matching the pair’s criterion unit.
- `criterion_value`: number matching the parent pair.
- `criterion_direction`: `upper`, `lower`, or `range`, matching the parent pair.
- `criterion_value_upper`: number or null, matching the parent pair.
- `results`: array of objects with `date`, `station_code`, nullable `value`, the source `qualifier` string (for example `=`, `<`, `ND`, `DNQ`, `NR`, or `NA`), raw `exceeds`, `before_cutoff`, and required `screening_eligible`. Optional source value/qualifier, program, project, CEDEN resource/sample identifiers, source unit, analyte, sample type, QA flags, matrix, and replicate numbers preserve review context. Unsupported or unreported source qualifiers remain pending rather than being rewritten as unqualified results.

Include pre-cutoff observations as context and post-cutoff observations used in the supplied screening counts. The same `screening_eligible` rule applies to both periods. Only eligible post-cutoff observations contribute to `new_samples` or `new_exceedances`; other retained post-cutoff records remain visible and contribute to `pending_new_samples`. A null value cannot be compared with a criterion. Censored-result qualifiers must remain visible; the displayed number alone is not a fully specified analytical treatment of a non-detect.

### Region 9 calibrated QA rule

The current provisional rule is `region9-calibrated-qa-v1`. It was calibrated against the five pairs whose included LOE source/station/date comparisons exactly reproduce official totals: Los Penasquitos Creek pH, Otay River dissolved oxygen, Tijuana River dissolved oxygen, Tijuana River pH, and Sweetwater River dissolved oxygen.

Eligible rows must be numeric and unqualified (source/result qualifiers, when present, are `=`), use a water matrix and the pair's compatible unit, have a blank or `None` QACode, and have both `CollectionReplicate = 1` and `ResultsReplicate = 1`. The calibrated QA combinations are `DataQuality = Passed` with `BatchVerification = VAC`, or `DataQuality = Unknown data quality` with `BatchVerification = NR`. That second combination is included because it is present in every calibration pair and is required to reproduce their official counts; it is not a claim that every unknown-quality source has been reviewed. This same classifier runs before and after the cutoff.

Rows with `Some review needed`, `MetaData`, other DataQuality/BatchVerification combinations, any QACode, a missing numeric result, a non-primary replicate, or a non-`=` qualifier remain pending. The five calibration windows contain no non-detects. The current extract does not carry the reporting-limit fields needed to compare a censored result to each criterion, so ND, `<`, DNQ, and other censored results stay pending rather than being assumed to pass or exceed. Explicit rejected records, QC samples, invalid dates, and non-water matrices are excluded upstream, before pending counts.

## `about.json`

Contains `recognition`, an array. Each entry has a required nonempty `name` string. Optional nullable fields are `program` (string), `year` (integer), `url` (absolute URL string), and `note` (string). The demonstration starts with an empty array.

## Cross-file checks for a real pipeline

1. Every pair references a known region; every station/sample association is consistent.
2. Eligible post-cutoff counts and pending post-cutoff counts agree with sample files.
3. `new_exceedances <= new_samples`; missing counts are not zeros.
4. Dates agree with coverage metadata and before/after-cutoff flags.
5. Range criteria have ordered numeric bounds and all units agree.
6. Under-sampled pairs use the applicable per-pair minimum, not one global threshold.
7. Provenance links resolve to the actual decision, not a generic landing page.
8. Exported citations, figures, API metadata and feed entries disclose the same `data_status`; status transitions are not compared as trends.

## Optional additions in 0.3.0

No existing required fields were renamed, removed or made optional.

Metadata may additionally contain `repo_url` (absolute repository URL), `site_url` (absolute intended public URL) and `license` (publisher-supplied license text). A configured build origin takes precedence over `site_url`.

Pairs may additionally contain:

| Field | Type / meaning |
|---|---|
| `cities` | Optional array of candidate associated city/place names; spatial results require review |
| `zip_codes` | Optional array of five-digit ZCTA strings, preserving leading zeros; ZCTAs approximate ZIP areas, not USPS delivery coverage |
| `tribal_lands` | Optional array of verified intersecting Tribal area names |
| `tribal_intersection_verified` | Optional boolean distinguishing reviewed coverage from unknown |
| `community_source_url` | Optional absolute URL documenting geographic/community provenance |

Nonempty Tribal names require `tribal_intersection_verified: true`. Never set that flag merely because a water is nearby. `false` or absent means an intersection has not been verified; a reviewed empty list may be used only with documented coverage. Real geometry associations are not automatically human-reviewed.

Optional `about.team` is an array of `{name, role, bio}` strings; show supplied team details, never generated identities or awards.

## New static files

- **`listing_tables.json`** — `{source_url, version, verified_at, scope?, tables}`. Each of `tables["4.1"]` and `tables["4.2"]` has `min_samples` and contiguous inclusive `rows: [{min,max,allowed}]`. Rows are exact transcriptions of the adopted February 3, 2015 Policy, printed pages 14–15. Coverage stops at 129/121; out-of-range scenarios return no estimate rather than extrapolating. Row ordering and coverage are runtime validated.
- **`places.json`** — generated array of `{pair_id, waterbody_name, county, cities: string[], zips: string[], lat, lon}`. It combines optional pair fields with matching cached Census associations. Unknown cities/ZIPs stay empty, never guessed.
- **`place_associations.json`** — optional maintainer cache: `{retrieved_at, method, sources:[{field,url}], associations:[{pair_id,geometry_sha256,status,cities,zips}]}`. Associations apply only when the pair ID and complete official geometry hash match; geometry edits invalidate the cache. The current script intersects full waterbody lines with Census TIGERweb place and 2020 ZCTA polygons. Spatial intersections are candidates pending review; ZCTAs are not USPS delivery areas.
- **`history.json`** — oldest-first array of `{date, dataset_version, data_status, is_sample_data, qa_rule_version?, pairs}`. `date` is the dataset's ISO generation timestamp. Each pair snapshot contains `pair_id`, `waterbody_name`, `pollutant`, `screening_flag`, eligible `new_samples`, `new_exceedances`, and `pending_new_samples`. The release step atomically appends a new snapshot and refuses changed counts under an existing version. Status or QA-rule transitions are separate comparison boundaries; a QA-rule change must not be presented as newly collected samples.
- **`tribal_lands.geojson`** — optional GeoJSON FeatureCollection of Polygon/MultiPolygon features in WGS84, Census TIGER AIANNH source, simplified Region 9 coverage. Use human-readable `NAME`/`name` properties and document source/vintage/coverage. Missing or invalid files hide the layer; absence must not be rendered as a verified nonintersection.
- **`validation.json`** — optional publisher-supplied validation report shown on Showcase; only actual supplied results may be described as validated. Absent reports are explicitly unavailable.
- **`method-validation.json`** — generated calibration evidence for the Method page: official versus source/date-matched CEDEN counts, exact/close/gap class and cause, plus each pair's post-cutoff eligible n/exceedances, pending QA count, and screening flag.
- **`public/api/v1/*`** — generated versioned JSON/CSV endpoints; see `api.md`. Per-pair endpoints preserve the existing pair contract; aggregate files are arrays, not `{data: ...}` wrappers.
- **`public/feed.xml`** — generated Atom with one entry per recorded refresh. The first comparable snapshot is a baseline with no claimed changes.
- **`public/og/{pair_id}.png`** — generated 1200×630 social cards with data status, version, monitoring date, counts and a non-regulatory disclaimer.
- **`dist/public/sitemap.xml`**, **`robots.txt`**, and per-route **`index.html`** files — built for the configured origin/base path and all public pages, including embeds.

Pair IDs used by the release generator must match `[A-Za-z0-9][A-Za-z0-9._-]*` and contain no `..`; invalid identifiers are rejected rather than silently renamed. This is a filename/URL safety constraint. Builds validate region references, table-covered supplied counts, sample totals, criteria, units, station associations and cutoff flags. Censored-result scientific interpretation remains the source pipeline's responsibility; these checks are not an independent regulatory assessment.
