# NextCycle external connections and data-source probe

- Probe time (UTC): `2026-11-18T19:12:58+00:00`
- Runtime: Python 3.11; HTTP client: `requests` only (plus Python standard library).
- Safety: read-only requests; CKAN/ArcGIS samples capped at five records per resource/layer; no dataset files downloaded.

## California Open Data CKAN

### CKAN package: Surface Water - Chemistry Results
- Package ID: `surface-water-chemistry-results`
- URL: https://data.ca.gov/api/3/action/package_show?id=surface-water-chemistry-results
- HTTP status: **200**
- Resource count in catalog: **31**

#### All-years chemistry Parquet archive (datastore preview)
- Resource ID: `f4aa224d-4a59-403d-aad8-187955aa2e38`
- Resource URL: https://publish.data.ca.gov/dataset/28d7a81d-6458-47bd-9b79-4fcbfbb88671/resource/f4aa224d-4a59-403d-aad8-187955aa2e38/download/waterchemistrydata_parquet_2026-11-03.zip
- Catalog format / datastore_active: `ZIP` / `True`
- Datastore preview: **HTTP 200**; total rows listed: **55**; records returned: **5**
- Note: The active datastore preview is a ZIP/Parquet archive member listing, not chemistry rows. The archive was not downloaded.
**Field names:** `_id, filename, compressed_size, file_size, compression_ratio, date_time, create_system, create_version, extract_version, flag_bits, internal_attr, external_attr, CRC, compress_type`

#### 2026 CEDEN chemistry CSV
- Resource ID: `7c2faf29-d5d3-4ad6-a429-442ed337febb`
- Resource URL: https://publish.data.ca.gov/dataset/28d7a81d-6458-47bd-9b79-4fcbfbb88671/resource/7c2faf29-d5d3-4ad6-a429-442ed337febb/download/waterchemistrydata_year-2026_2026-11-03.csv
- Catalog format / datastore_active: `CSV` / `True`
- Datastore preview: **HTTP 200**; total rows listed: **82688**; records returned: **5**
**Field names:** `_id, Program, ParentProject, Project, StationName, StationCode, SampleDate, CollectionTime, LocationCode, CollectionDepth, UnitCollectionDepth, SampleTypeCode, CollectionReplicate, ResultsReplicate, LabBatch, LabSampleID, MatrixName, MethodName, Analyte, Unit, Result, Observation, MDL, RL, ResultQualCode, QACode, BatchVerification, ComplianceCode, SampleComments, CollectionComments, ResultsComments, BatchComments, EventCode, ProtocolCode, SampleAgency, GroupSamples, CollectionMethodName, Latitude, Longitude, CollectionDeviceDescription, CalibrationDate, PositionWaterColumn, PrepPreservationName, PrepPreservationDate, DigestExtractMethod, DigestExtractDate, AnalysisDate, DilutionFactor, ExpectedValue, LabAgency, SubmittingAgency, SubmissionCode, OccupationMethod, StartingBank, DistanceFromBank, UnitDistanceFromBank, StreamWidth, UnitStreamWidth, StationWaterDepth, UnitStationWaterDepth, HydroMod, HydroModLoc, LocationDetailWQComments, ChannelWidth, UpstreamLength, DownStreamLength, TotalReach, LocationDetailBAComments, SampleID, DW_AnalyteName, ProgramCode, ParentProjectCode, ProjectCode, MatrixCode, AnalyteCode, FractionName, FractionCode, DataQuality, DataQualityIndicator, Datum`

### CKAN package: Surface Water - Sampling Location Information
- Package ID: `surface-water-sampling-location-information`
- URL: https://data.ca.gov/api/3/action/package_show?id=surface-water-sampling-location-information
- HTTP status: **200**
- Resource count in catalog: **2**

#### Surface Water CEDEN sampling locations
- Resource ID: `a927cb45-0de1-47e8-96a5-a5290816797b`
- Resource URL: https://publish.data.ca.gov/dataset/725cfdd7-ce18-41c2-8b60-3b6a5a586b4a/resource/a927cb45-0de1-47e8-96a5-a5290816797b/download/all_ceden_sites_2026-11-03.csv
- Catalog format / datastore_active: `CSV` / `True`
- Datastore preview: **HTTP 200**; total rows listed: **13315**; records returned: **5**
**Field names:** `_id, StationName, SiteCode, Latitude, Longitude, Datum`

### CKAN package: SWAMP Data Dashboard
- Package ID: `surface-water-ambient-monitoring-program`
- URL: https://data.ca.gov/api/3/action/package_show?id=surface-water-ambient-monitoring-program
- HTTP status: **200**
- Resource count in catalog: **10**

#### SWAMP Stations
- Resource ID: `df69fdd7-1475-4e57-9385-bb1514f0291e`
- Resource URL: https://publish.data.ca.gov/dataset/c093f87c-dd40-48cb-8dd9-e5258bc9eb4b/resource/df69fdd7-1475-4e57-9385-bb1514f0291e/download/swamp_stations_2026-11-16.csv
- Catalog format / datastore_active: `CSV` / `True`
- Datastore preview: **HTTP 200**; total rows listed: **7046**; records returned: **5**
**Field names:** `_id, StationCode, StationName, TargetLatitude, TargetLongitude, LastSampleDate, Region, StationCategory`

#### SWAMP Water Quality Results
- Resource ID: `2bfd92aa-7256-4fd9-bfe4-a6eff7a8019e`
- Resource URL: https://publish.data.ca.gov/dataset/c093f87c-dd40-48cb-8dd9-e5258bc9eb4b/resource/2bfd92aa-7256-4fd9-bfe4-a6eff7a8019e/download/swamp_water_quality_data_2026-11-16.csv
- Catalog format / datastore_active: `CSV` / `True`
- Datastore preview: **HTTP 200**; total rows listed: **801978**; records returned: **5**
**Field names:** `_id, Program, ParentProject, Project, StationName, StationCode, SampleDate, CollectionTime, LocationCode, CollectionDepth, UnitCollectionDepth, SampleTypeCode, CollectionReplicate, ResultsReplicate, LabBatch, LabSampleID, MatrixName, MethodName, Analyte, Unit, Result, Observation, MDL, RL, ResultQualCode, QACode, BatchVerification, ComplianceCode, SampleComments, CollectionComments, ResultsComments, BatchComments, EventCode, ProtocolCode, SampleAgency, GroupSamples, CollectionMethodName, TargetLatitude, TargetLongitude, CollectionDeviceDescription, CalibrationDate, PositionWaterColumn, PrepPreservationName, PrepPreservationDate, DigestExtractMethod, DigestExtractDate, AnalysisDate, DilutionFactor, ExpectedValue, LabAgency, SubmittingAgency, SubmissionCode, OccupationMethod, StartingBank, DistanceFromBank, UnitDistanceFromBank, StreamWidth, UnitStreamWidth, StationWaterDepth, UnitStationWaterDepth, HydroMod, HydroModLoc, LocationDetailWQComments, ChannelWidth, UpstreamLength, DownStreamLength, TotalReach, LocationDetailBAComments, SampleID, DW_AnalyteName, Datum, DataQuality, DataQualityIndicator, ResultDisplay, DisplayText, Censored, AnalyteDisplay, AnalyteGroup1, AnalyteGroup2, AnalyteGroup3, MatrixDisplay, Region, Bioassessment, Bioaccumulation, Fhab, Spot, StationCategory`

## Water Boards ArcGIS feature services

### Water Boards ArcGIS: Proposed Final 2026 Rivers and Streams (line features)
- Portal search URL: https://gispublic.waterboards.ca.gov/portal/sharing/rest/search?q=title%3A%22Final_2026_Rivers_and_Streams%22&f=json
- Portal search HTTP status: **200**
- Portal item: **Proposed Final 2026 Rivers and Streams** (`b5d1aeb7d9a54a438a05ca76b6666f63`; Feature Service)
- Feature service URL: https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/Final_2026_Rivers_and_Streams/FeatureServer
- Service metadata HTTP status: **200**
- Layer: `GeoWQA_Rivers_an_SpatialJoin3` at `https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/Final_2026_Rivers_and_Streams/FeatureServer/0`; metadata HTTP status: **200**
- Geometry type: `esriGeometryPolyline`
**Field names:** `objectid, board_name, wbname, wbid, wbtype, wbsize, wb_unit, counties, listingstatus, integrated_report_category, newpollutantslisted, newpollutantsdelisted, pastcyclelistings, hyperlink, SHAPE__Length`
- Region 9 count query: **HTTP 200**, **411** features.
- GeoJSON sample query: **HTTP 200**; **5** features returned (maximum five).
- Region filter: Region 9 filtered using `board_name LIKE '%San Diego%'` (Board Name).
- Sample property fields: `SHAPE__Length, board_name, counties, hyperlink, integrated_report_category, listingstatus, newpollutantsdelisted, newpollutantslisted, objectid, pastcyclelistings, wb_unit, wbid, wbname, wbsize, wbtype`

### Water Boards ArcGIS: Proposed Final 2026 Lakes and Reservoirs (polygon features)
- Portal search URL: https://gispublic.waterboards.ca.gov/portal/sharing/rest/search?q=title%3A%22Final_2026_Lakes_and_Reservoirs%22&f=json
- Portal search HTTP status: **200**
- Portal item: **Proposed Final 2026 Lakes and Reservoirs** (`e312abf62bf547c7a0d54600789cc98f`; Feature Service)
- Feature service URL: https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/Final_2026_Lakes_and_Reservoirs/FeatureServer
- Service metadata HTTP status: **200**
- Layer: `GeoWQA_Lakes_and_SpatialJoin` at `https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/Final_2026_Lakes_and_Reservoirs/FeatureServer/0`; metadata HTTP status: **200**
- Geometry type: `esriGeometryPolygon`
**Field names:** `objectid, board_name, wbname, wbid, wbtype, wbsize, wbunit, counties, listingstatus, integrated_report_category, newpollutantslisted, newpollutantsdelisted, pastcyclelistings, hyperlink, SHAPE__Length, SHAPE__Area`
- Region 9 count query: **HTTP 200**, **75** features.
- GeoJSON sample query: **HTTP 200**; **5** features returned (maximum five).
- Region filter: Region 9 filtered using `board_name LIKE '%San Diego%'` (Board Name).
- Sample property fields: `SHAPE__Area, SHAPE__Length, board_name, counties, hyperlink, integrated_report_category, listingstatus, newpollutantsdelisted, newpollutantslisted, objectid, pastcyclelistings, wbid, wbname, wbsize, wbtype, wbunit`

### Water Boards ArcGIS: Final 2024 Integrated Report Lines
- Portal search URL: https://gispublic.waterboards.ca.gov/portal/sharing/rest/search?q=title%3A%222024%20Integrated%20Report%20Lines%22&f=json
- Portal search HTTP status: **200**
- Portal item: **Final 2024 Integrated Report Lines** (`e8e4c32277f14f69a5f4920b4fafa976`; Feature Service)
- Feature service URL: https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/Proposed_2024_Integrated_Report_Lines/FeatureServer
- Service metadata HTTP status: **200**
- Layer: `Final_Rivers_with_ListingStatus` at `https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/Proposed_2024_Integrated_Report_Lines/FeatureServer/0`; metadata HTTP status: **200**
- Geometry type: `esriGeometryPolyline`
**Field names:** `objectid, rivers_with_geowqa_geowqa_featu, newwaterbodylistingstatus_objec, boardname, waterbodyname, waterbodyid, waterbodytype, waterbodysize, waterbodyunit, waterbodycounty, listingstatus, integratedreportcategory, newpollutantlisted, newpollutantsdelisted, pastcyclelistings, hyperlink, SHAPE__Length`
- Region 9 count query: **HTTP 200**, **410** features.
- GeoJSON sample query: **HTTP 200**; **5** features returned (maximum five).
- Region filter: Region 9 filtered using `boardname LIKE '%San Diego%'` (BoardName).
- Sample property fields: `SHAPE__Length, boardname, hyperlink, integratedreportcategory, listingstatus, newpollutantlisted, newpollutantsdelisted, newwaterbodylistingstatus_objec, objectid, pastcyclelistings, rivers_with_geowqa_geowqa_featu, waterbodycounty, waterbodyid, waterbodyname, waterbodysize, waterbodytype, waterbodyunit`

### Water Boards ArcGIS: Final 2024 Integrated Report Polygons
- Portal search URL: https://gispublic.waterboards.ca.gov/portal/sharing/rest/search?q=title%3A%222024%20Integrated%20Report%20Polygons%22&f=json
- Portal search HTTP status: **200**
- Portal item: **Final 2024 Integrated Report Polygons** (`fc1f1aff1eb64f9d826bdf4e167d2e8f`; Feature Service)
- Feature service URL: https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/2024_Integrated_Report_Polygons/FeatureServer
- Service metadata HTTP status: **200**
- Layer: `Final_Lakes_with_ListingStatus` at `https://gispublic.waterboards.ca.gov/portalserver/rest/services/Hosted/2024_Integrated_Report_Polygons/FeatureServer/0`; metadata HTTP status: **200**
- Geometry type: `esriGeometryPolygon`
**Field names:** `objectid, lakes_with_geowqa_geowqa_featur, newwaterbodylistingstatus_objec, boardname, waterbodyname, waterbodyid, waterbodytype, waterbodysize, waterbodyunit, waterbodycounty, listingstatus, integratedreportcategory, newpollutantlisted, newpollutantsdelisted, pastcyclelistings, hyperlink, SHAPE__Length, SHAPE__Area`
- Region 9 count query: **HTTP 200**, **76** features.
- GeoJSON sample query: **HTTP 200**; **5** features returned (maximum five).
- Region filter: Region 9 filtered using `boardname LIKE '%San Diego%'` (BoardName).
- Sample property fields: `SHAPE__Area, SHAPE__Length, boardname, hyperlink, integratedreportcategory, lakes_with_geowqa_geowqa_featur, listingstatus, newpollutantlisted, newpollutantsdelisted, newwaterbodylistingstatus_objec, objectid, pastcyclelistings, waterbodycounty, waterbodyid, waterbodyname, waterbodysize, waterbodytype, waterbodyunit`

## EPA ATTAINS

### EPA ATTAINS assessment units
- URL: `https://attains.epa.gov/attains-public/api/assessmentUnits?stateCode=CA&pageNumber=1&pageSize=5&api_key=[redacted]`
- HTTP status: **401**
- California assessment-unit sample count: **0** (maximum five).
- Key source: public `DEMO_KEY`; no credential value is stored.
- Note: Blocked: EPA now requires a valid api.data.gov key. The default DEMO_KEY was not accepted. Set EPA_ATTAINS_API_KEY to rerun this section; no key is requested or written by this script.
**Field names:** unavailable

## OEHHA CalEnviroScreen 4.0

### OEHHA CalEnviroScreen 4.0
- Official page: https://oehha.ca.gov/calenviroscreen/download-data
- Official CA Open Data package: `calenviroscreen-4-0` (CalEnviroScreen 4.0).
- package_show URL: https://data.ca.gov/api/3/action/package_show?id=calenviroscreen-4-0
- package_show HTTP status: **200**
- Official OEHHA download page reachability (one-byte Range GET): **HTTP 200**.
- Geodatabase download: **HTTP 206**; Content-Length `1`; Content-Range `bytes 0-0/6482155`; only a one-byte range was requested.
  - Resource ID `a87b1402-cfb5-47a7-b0b2-cb88877f7791`; https://publish.data.ca.gov/dataset/11eb2b90-f3c1-46b4-bdf2-ba1dab939dac/resource/a87b1402-cfb5-47a7-b0b2-cb88877f7791/download/calenviroscreen40gdb_f_2021.gdb.zip
- Shapefile download: **HTTP 206**; Content-Length `1`; Content-Range `bytes 0-0/8216020`; only a one-byte range was requested.
  - Resource ID `8e6a8be3-bfc6-4592-b0c3-7aafd77bba2e`; https://publish.data.ca.gov/dataset/11eb2b90-f3c1-46b4-bdf2-ba1dab939dac/resource/8e6a8be3-bfc6-4592-b0c3-7aafd77bba2e/download/calenviroscreen40shp_f_2021.shp.zip
- Tract resource: `CalEnviroScreen 4.0 Results and Data Dictionary`; resource ID `9a90474a-3912-4955-9552-457ee41cea51`.
- Datastore preview: **HTTP 200**; total rows: **8035**; records returned: **5**.
**Field names:** `_id, Census Tract, Total Population, California County, ZIP, Approximate Location, Longitude, Latitude, ces_4_0_score, ces_4_0_percentile, ces_4_0_percentile_range, Ozone, Ozone Pctl, pm2_5, pm2_5_pctl, Diesel PM, Diesel PM Pctl, Drinking Water, Drinking Water Pctl, Lead, Lead Pctl, Pesticides, Pesticides Pctl, tox__release, tox__release_pctl, Traffic, Traffic Pctl, Cleanup Sites, Cleanup Sites Pctl, Groundwater Threats, Groundwater Threats Pctl, haz__waste, haz__waste_pctl, imp__water_bodies, imp__water_bodies_pctl, Solid Waste, Solid Waste Pctl, Pollution Burden, Pollution Burden Score, Pollution Burden Pctl, Asthma, Asthma Pctl, Low Birth Weight, Low Birth Weight Pctl, Cardiovascular Disease, Cardiovascular Disease Pctl, Education, Education Pctl, Linguistic Isolation, Linguistic Isolation Pctl, Poverty, Poverty Pctl, Unemployment, Unemployment Pctl, Housing Burden, Housing Burden Pctl, pop__char_, pop__char__score, pop__char__pctl`

## Field mapping to `docs/data-contract.md`

Mappings reflect fields actually returned by the public service schemas/samples above. Derived values are labeled; unavailable fields are explicitly marked.

| Contract field | Source field(s) | Notes / gaps |
|---|---|---|
| `metadata.dataset_version` | NO SOURCE FIELD | Build/version metadata belongs to this application. |
| `metadata.repo_url` | NO SOURCE FIELD | Repository metadata belongs to this application. |
| `metadata.is_sample_data` | NO SOURCE FIELD | Review/provenance decision, not in source rows. |
| `metadata.generated_at` | NO SOURCE FIELD | Probe time is recorded in this report only. |
| `metadata.monitoring_data_through` | CEDEN/SWAMP SampleDate (derive max) | Can be derived after a complete, approved data pipeline. |
| `metadata.cutoff_date` | NO SOURCE FIELD | Cycle cutoff is a policy/configuration value. |
| `metadata.next_cycle` | ArcGIS item/service cycle (partial) | A cycle can be inferred from the selected service, not a source row. |
| `metadata.regions[].region_id` | NO SOURCE FIELD | ArcGIS gives Regional Board names; the app's `R9` key is an internal mapping. |
| `metadata.regions[].region_name` | ArcGIS board_name / boardname | 2026/2024 services include the San Diego Regional Board label. |
| `metadata.sources[]` | NO SOURCE FIELD | The provenance catalog is app metadata. |
| `waterbodies[].pair_id` | NO SOURCE FIELD | Application-generated waterbody/pollutant key. |
| `waterbodies[].waterbody_id` | ArcGIS wbid / waterbodyid; EPA assessmentUnitIdentifier | EPA sample is blocked by API-key requirement in this run. |
| `waterbodies[].waterbody_name` | ArcGIS wbname / waterbodyname; EPA assessmentUnitName | Name aliases differ by service year. |
| `waterbodies[].waterbody_type` | ArcGIS wbtype / waterbodytype | Source labels may need enum normalization. |
| `waterbodies[].region_id` | ArcGIS board_name / boardname | Board name can be mapped to the internal region key. |
| `waterbodies[].county` | ArcGIS counties / waterbodycounty | May contain multiple counties. |
| `waterbodies[].centroid` | NO SOURCE FIELD | Can be calculated from geometry; no canonical centroid field in sampled services. |
| `waterbodies[].geometry` | ArcGIS GeoJSON geometry | Line/Polygon geometry returned as GeoJSON. |
| `waterbodies[].pollutant` | ArcGIS newpollutantslisted / newpollutantsdelisted / pastcyclelistings (compound text) | Not a normalized pair-level pollutant field. |
| `waterbodies[].pollutant_group` | NO SOURCE FIELD | Requires reviewed pollutant taxonomy. |
| `waterbodies[].official_status` | ArcGIS listingstatus | Source values require normalization. |
| `waterbodies[].official_category` | ArcGIS integrated_report_category / integratedreportcategory | Present in both 2024 and 2026 services. |
| `waterbodies[].official_cycle` | ArcGIS service/item year | Service-level metadata, not a row field. |
| `waterbodies[].decision_id` | NO SOURCE FIELD | No decision-ID field appeared in sampled feature-service schemas. |
| `waterbodies[].fact_sheet_url` | ArcGIS hyperlink | The official services return per-waterbody fact-sheet URLs. |
| `waterbodies[].tmdl_status` | NO SOURCE FIELD | Requires a separate reviewed TMDL source. |
| `waterbodies[].criterion_direction` | NO SOURCE FIELD | Not in sampled ArcGIS, CEDEN, or SWAMP fields. |
| `waterbodies[].criterion_value` | NO SOURCE FIELD | Not in sampled sources; requires the criterion/fact-sheet source. |
| `waterbodies[].criterion_value_upper` | NO SOURCE FIELD | Not in sampled sources. |
| `waterbodies[].criterion_unit` | CEDEN/SWAMP Unit | Sample measurement unit; not necessarily the policy criterion unit. |
| `waterbodies[].criterion_basis` | NO SOURCE FIELD | Requires policy/document extraction and review. |
| `waterbodies[].beneficial_uses` | NO SOURCE FIELD | Not present in sampled services. |
| `waterbodies[].listing_table` | NO SOURCE FIELD | Not present in sampled services. |
| `waterbodies[].delisting_table` | NO SOURCE FIELD | Not present in sampled services. |
| `waterbodies[].new_samples` | CEDEN/SWAMP SampleDate and station/result rows (derive) | Requires approved pair matching and date filters. |
| `waterbodies[].new_exceedances` | CEDEN/SWAMP Result plus criterion (derive) | Criterion values are not available from sampled fields. |
| `waterbodies[].allowed_exceedances_for_delisting` | NO SOURCE FIELD | Policy calculation; not a source field. |
| `waterbodies[].min_samples_for_delisting` | NO SOURCE FIELD | Policy calculation; not a source field. |
| `waterbodies[].screening_flag` | NO SOURCE FIELD | Derived after approved counts and policy thresholds. |
| `waterbodies[].first_new_sample_date` | CEDEN/SWAMP SampleDate (derive) | Requires approved pair matching and cutoff. |
| `waterbodies[].last_sample_date` | CEDEN/SWAMP SampleDate (derive) | Requires approved pair matching and cutoff. |
| `waterbodies[].station_count` | CEDEN/SWAMP StationCode (derive) | Count distinct linked stations after association. |
| `waterbodies[].ces_percentile` | OEHHA ces_4_0_percentile | Tract-level field; requires spatial join to a waterbody. |
| `waterbodies[].disadvantaged_community` | NO SOURCE FIELD | Application's threshold is derived from the percentile. |
| `waterbodies[].summary` | NO SOURCE FIELD | Editorial summary, not a source field. |
| `waterbodies[].data_gap_note` | NO SOURCE FIELD | Editorial/analysis output. |
| `stations[].station_code` | CEDEN sampling locations SiteCode / chemistry StationCode; SWAMP StationCode | The CEDEN location crosswalk uses `SiteCode`; chemistry rows use `StationCode`. |
| `stations[].station_name` | CEDEN StationName / SWAMP station name | Exact station-key aliases differ by resource. |
| `stations[].lat` | CEDEN Latitude / SWAMP TargetLatitude | Coordinate field availability varies by selected table. |
| `stations[].lon` | CEDEN Longitude / SWAMP TargetLongitude | Coordinate field availability varies by selected table. |
| `stations[].waterbody_id` | NO SOURCE FIELD | Requires a reviewed station-to-waterbody crosswalk or spatial join. |
| `stations[].link_method` | NO SOURCE FIELD | Link method is pipeline provenance. |
| `stations[].sample_count` | CEDEN/SWAMP rows (derive) | Requires a consistent query and station association. |
| `stations[].last_sample_date` | CEDEN/SWAMP SampleDate (derive) | Requires a consistent query and station association. |
| `samples[].pair_id` | NO SOURCE FIELD | Application-generated parent pair key. |
| `samples[].unit` | CEDEN Unit / SWAMP unit field | Source result unit. |
| `samples[].criterion_direction` | NO SOURCE FIELD | Requires reviewed policy criterion data. |
| `samples[].criterion_value` | NO SOURCE FIELD | Requires reviewed policy criterion data. |
| `samples[].criterion_value_upper` | NO SOURCE FIELD | Requires reviewed policy criterion data. |
| `samples[].results[].date` | CEDEN SampleDate / SWAMP sample date | Source date; normalize to YYYY-MM-DD. |
| `samples[].results[].station_code` | CEDEN StationCode / SWAMP station code | Resource-specific station-code alias. |
| `samples[].results[].value` | CEDEN Result / SWAMP result-value field | Source measurement. |
| `samples[].results[].qualifier` | CEDEN ResultQualCode / SWAMP qualifier field | Normalize to the app's qualifier enum. |
| `samples[].results[].exceeds` | NO SOURCE FIELD | Derived only after reviewed criterion matching. |
| `samples[].results[].before_cutoff` | NO SOURCE FIELD | Derived from sample date and configured cutoff. |
| `about.recognition[]` | NO SOURCE FIELD | Editorial/product content. |

## Sample files

| File | Source | Records in sample | HTTP status |
|---|---|---:|---:|
| `samples/ceden-chemistry-all-years-parquet-archive.json` | All-years chemistry Parquet archive (datastore preview) | 5 | 200 |
| `samples/ceden-chemistry-2026.json` | 2026 CEDEN chemistry CSV | 5 | 200 |
| `samples/ceden-sampling-locations.json` | Surface Water CEDEN sampling locations | 5 | 200 |
| `samples/swamp-stations.json` | SWAMP Stations | 5 | 200 |
| `samples/swamp-water-quality-results.json` | SWAMP Water Quality Results | 5 | 200 |
| `samples/waterboards-2026-lines.json` | Proposed Final 2026 Rivers and Streams (line features) | 5 | 200 |
| `samples/waterboards-2026-polygons.json` | Proposed Final 2026 Lakes and Reservoirs (polygon features) | 5 | 200 |
| `samples/waterboards-2024-lines.json` | Final 2024 Integrated Report Lines | 5 | 200 |
| `samples/waterboards-2024-polygons.json` | Final 2024 Integrated Report Polygons | 5 | 200 |
| `samples/epa-attains-ca-assessment-units.json` | EPA ATTAINS assessment units for California | 0 | 401 |
| `samples/oehha-calenviroscreen40-tracts.json` | OEHHA CalEnviroScreen 4.0 tract data | 5 | 200 |


## Built site: Preview verification

- Production build: `npm run build` passed; `npm run preview` served the built site on local port 4173.
- Direct routes: **22** loaded with HTTP 200, including **14** waterbody-pair routes; the unknown route displayed “This page is not on the list.”
- Browser console/page errors: **0**.
- Map: OpenFreeMap style/sprite/glyph/vector-tile requests returned **15** responses; **0** non-200 and **0** failed requests. MapLibre canvas 1080×936; loading state cleared; no map alert.
- Waterbody/station overlays: map finished source/layer setup; station toggle was on; **True**. Attribution: `OpenFreeMap | OpenFreeMap © OpenMapTiles Data from OpenStreetMap`. Visual capture: `/tmp/nextcycle-map.png` (temporary, not included in project files).
- Export/action tests: CSV `nextcycle-watch-list-sample-0.1.csv` (5015 bytes); PNG `nextcycle-CAR9093100-zinc-dissolved.png` (325822 bytes); citation copied to clipboard once and included the sample-data disclaimer.
- Link collection: **11 unique external hrefs** across **130** occurrences; mailto links checked for encoded syntax. Status details are in `site-links.json`.
- Note: the app's waterbody fact-sheet href is a generic Water Quality Assessment landing page (HTTP 206); it is reachable, so it was not rewritten as a guessed waterbody-specific URL.
- External-link result: all checked web links passed except the configured GitHub repository URL (HTTP 404, expected by the request); mailto links passed syntax validation.

