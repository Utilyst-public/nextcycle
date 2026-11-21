# Beyond the website template

## Scientific validation

- Confirm the applicable assessment cycles and data cutoff dates.
- Verify Listing Policy table applicability and sample-size/exceedance thresholds.
- Represent upper, lower, and range criteria; handle duration, hardness, salinity, and other criterion dependencies.
- Establish replicate collapsing, censored-result handling, QA exclusions, units, and station matching.
- Validate against independently reviewed reference decisions and edge cases.
- Preserve assessment provenance and auditable reasons for every screening outcome.

## Real-data pipeline

- Ingest versioned public monitoring extracts.
- Publish a reviewed station-to-waterbody crosswalk.
- Produce the documented static JSON contract atomically.
- Add automated consistency checks across summaries, samples, stations, and metadata.
- Do not silently substitute mock data when a file fails validation.

## Broader coverage

Add regions through metadata and records, with region-specific cycle/cutoff handling. New-listing candidates need a distinct policy and UI path; do not infer them from the current listed-water screening flags.

## Release readiness

Independently review accessibility, browser compatibility, map failures, static-host deep links, and downloadable figures. Replace placeholder links and verify licenses before a public release.
