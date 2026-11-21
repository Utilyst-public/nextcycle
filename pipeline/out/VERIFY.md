# Region 9 provisional release review checklist

**Reviewer:** Dr. John Armin, PE (Founder & CEO, Utilyst)  
**Review status:** Not done  
**Current release gates:** `data_status: provisional`, `is_sample_data: false`,
`review_complete: false`

The reviewer will check this file and [`validation.md`](./validation.md). The
release is not reviewed, approved, or validated by the Water Boards. Build and
schema checks establish file consistency only. Keep every pair in
[`../config/pairs.generated.yaml`](../config/pairs.generated.yaml) at
`status: VERIFY` until reviewed.

## Official listing, criteria, and counts

- [ ] Confirm the final adopted 2026 Integrated Report and Region 9 scope; check
  whether the `2024-10-23` cutoff is appropriate for this comparison.
- [ ] Check all 15 waterbody IDs, names, Category 5 status, decision IDs,
  final 2026 fact-sheet URLs, and county/TMDL fields against each Appendix B1
  record. The source audit records all 15 links and exact WBIDs.
- [ ] Confirm that the 2026 GIS service is titled “Proposed Final” and is not
  used for listing or decision associations. Verify each final 2026 B1
  waterbody ID against the matching final 2024 geometry feature. The 2024 layer
  is a cross-cycle geometry fallback only, its service describes the map as
  informational, and its shape alignment remains `VERIFY`.
- [ ] For all 15 pairs, confirm pollutant/analyte mapping, criterion text,
  direction, numeric value, unit, averaging period, beneficial use, and
  applicable use-specific conditions. The release has 11 lower dissolved
  oxygen criteria, 3 pH ranges, and 1 upper nitrate/nitrite criterion of
  10 mg/L as N.
- [ ] Confirm official conclusion counts and included LOE totals for all
  15 pairs. The current source/date comparison matches 5/15 exact n/ex totals;
  review the remaining line-level differences in `validation.md`. Rainbow
  Creek decision 164236 concludes 2 of 3 samples outside criterion, matching
  the included LOE sum. Confirm how its 5B status and USEPA-approved TMDL
  affect the intended screening and policy presentation.
- [ ] Confirm Listing Policy tables for every pair: provisional Tables 3.2/4.2
  for dissolved oxygen and nitrate/nitrite. Confirm the decision section,
  table choice, sample minimum, and applicability against the 2015 policy and
  official decision reasoning.

## CEDEN station links and monitoring results

- [ ] Review the 119 candidate station points and all 124 normalized Appendix
  B1 codes. The source audit records code aliases, CEDEN location or chemistry
  coordinates, and five unmatched codes (`CC-SD8`, `SD8`, `RSW-003`, `RSW-006`,
  `SD5`). Spatial proximity is not proof of a station-to-reach link.
- [ ] Review the San Mateo Creek candidates, especially `901DCCSMC` (named for
  Devils Canyon Creek), and the San Diego River stations that may be close to
  more than one reach.
- [ ] Review the CEDEN annual, pre-2000, and Augmentation resource IDs and SQL
  query scope. The 26,894-row pull covered every selected LOE station code and
  dissolved oxygen, pH, temperature, nitrate, nitrite, and selenium, with no
  SWAMP-only or program filter. Confirm that this scope and the cutoff are
  appropriate.
- [ ] Review the calibrated provisional QA rule. The five exact-match pairs
  support `Passed` + `BatchVerification=VAC` or `Unknown data quality` +
  `BatchVerification=NR`, with blank `QACode`, numeric unqualified water
  results, compatible units, and both replicate indices equal to 1. The same
  rule is applied before and after cutoff. Non-detects remain pending because
  reporting-limit fields are absent from the release.
- [ ] Confirm that Rainbow Creek CEDEN results are the combined nitrate/nitrite
  analyte expressed as nitrogen and use compatible `mg/L as N` units.
- [ ] Review all 84 retained post-cutoff observations: 32 are eligible under
  the calibrated rule and 52 remain pending QA; 8 eligible results exceed
  their pair criterion.
- [ ] Review the 3,226 retained pre-cutoff observations, including 2,758 that
  pass the calibrated QA screen. Across all 15 pairs, the exact official `n`
  plus exceedance match is 5/15, one comparison is close, and nine have larger
  source/aggregation gaps. The
  remaining official source and aggregation gaps are itemized in
  `validation.md`; this subset does not reproduce the full official assessment.
- [ ] Review the 24 continuous/sonde catalog candidates and the DWR Hydstra
  station check in `continuous-source-audit.json`. No candidate matched the
  selected Region 9 Appendix B1 station/source evidence.

## Geography, provenance, and outputs

- [ ] Inspect complete merged line geometries and representative points.
  Verify repeated feature merging, cross-cycle alignment, and station-distance
  calculations.
- [ ] Review Census TIGERweb city/ZCTA intersections. These are candidate
  spatial intersections, not confirmed service areas; ZCTA is not USPS ZIP
  coverage.
- [ ] Confirm no CalEnviroScreen percentile or disadvantaged-community flag is
  implied. None is published.
- [ ] Confirm source attribution and data terms. The configured issue
  repository `https://github.com/Utilyst-public/nextcycle` returned HTTP 200.
- [ ] Inspect the regenerated API/CSV, Atom feed, place index, and 15 pair
  outputs/OG cards.
  Confirm the exact provisional disclosure is present and no output implies
  human review, Water Boards approval, or a regulatory determination.
- [ ] Confirm history begins with the first real provisional baseline and has
  no illustrative history or sample-to-real improvement claim. The current
  15-pair data refresh is appended as a new snapshot.
- [ ] After review, record reviewer, role, date, dataset version, source
  versions, decisions, exceptions, and evidence in `validation.md`.

**Do not change `review_complete` as part of automated checks.** The selected
records are real public source data (`is_sample_data: false`) but remain
provisional pending human review. Keep `review_complete: false`; the reviewer
will set it only after checking this evidence. No Water
Boards or EPA approval is asserted by this project.
