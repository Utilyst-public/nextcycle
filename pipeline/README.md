# Data refresh and future assessment pipeline

## Static release pipeline (0.3.0)

There is now a working release generator, **not** a complete ingestion or regulatory assessment engine. After a reviewed source process writes a complete dataset and sample files, update `metadata.dataset_version` and `metadata.generated_at`, then run:

```sh
npm run data:refresh
npm test
npm run build
```

The release generator checks schemas, supplied count arithmetic, units, station IDs, eligible/pending sample totals and cutoff flags. It records an append-only snapshot and produces local places, static API JSON, CSV, Atom and social PNGs. It does not independently validate criterion interpretation, source QA, geographic associations, or regulatory conclusions.

`metadata.data_status` controls public disclosure. `metadata.is_sample_data` distinguishes illustrative records from real source records: this release is `provisional`, `is_sample_data: false`, and `review_complete: false`. `review_complete` is an explicit human-maintained gate, not an automated validation result. This status does not certify scientific or regulatory validity.

The optional Census enrichment command in the main README performs maintainer-side full-line geometry intersections and caches provenance keyed to the exact official geometry hash; the site performs no geocoding. Intersections are candidate associations that still require human review.

The sourced 2015 delisting tables replace the earlier approximations. No values outside the published ranges are invented. This is a count-only scenario tool: real table selection, source matching, censoring, QA/QC, representative sampling and evidence review remain outside the generator.

This directory does not contain a complete assessment engine. A future ingestion pipeline will write versioned files to `public/data/` using the contract in `docs/data-contract.md`.

The browser displays supplied screening results. It must not be mistaken for an independently validated implementation of the Listing Policy.

Keep source extracts, processing code, validation fixtures, and provenance under version control or appropriate data storage. Publish related output files atomically and reject inconsistencies between aggregate counts and per-pair sample records.
