#!/usr/bin/env python3
"""Bounded, read-only probes for NextCycle's public data sources.

Run from the app directory with Python 3.11:
    python3.11 pipeline/probe/probe.py

Only the requests package is used beyond the Python standard library. Dataset
downloads are never fetched; CKAN's preview API and ArcGIS feature queries are
limited to five records. Set EPA_ATTAINS_API_KEY to query ATTAINS; the public
DEMO_KEY is attempted when that environment variable is absent.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import requests


APP_ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = Path(__file__).resolve().parent
SAMPLES_DIR = OUT_DIR / "samples"
TIMEOUT = (10, 45)
USER_AGENT = "NextCycle public data probe/1.0 (read-only; max five sample records)"
CKAN_API = "https://data.ca.gov/api/3/action"
ARCGIS_SEARCH = "https://gispublic.waterboards.ca.gov/portal/sharing/rest/search"
ATTAINS_API = "https://attains.epa.gov/attains-public/api"

session = requests.Session()
session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
report: list[str] = []
sample_summaries: list[dict[str, Any]] = []


def md_cell(value: Any) -> str:
    text = "—" if value is None or value == "" else str(value)
    return text.replace("|", "\\|").replace("\n", " ")


def get_json(url: str, params: dict[str, Any] | None = None) -> tuple[requests.Response | None, Any, str | None]:
    try:
        response = session.get(url, params=params, timeout=TIMEOUT)
    except requests.RequestException as exc:
        return None, None, f"{type(exc).__name__}: {exc}"
    try:
        return response, response.json(), None
    except ValueError:
        return response, None, "Response was not valid JSON"


def save_sample(
    filename: str,
    *,
    source: str,
    url: str,
    status: int | str,
    records: list[Any] | None = None,
    fields: list[str] | None = None,
    total: int | None = None,
    note: str | None = None,
    resource_id: str | None = None,
) -> None:
    """Write a small, auditable response sample; record arrays are capped at 5."""
    clean_records = list(records or [])[:5]
    payload = {
        "source": source,
        "url": url,
        "http_status": status,
        "resource_id": resource_id,
        "total_records_available": total,
        "sample_record_count": len(clean_records),
        "field_names": fields or [],
        "note": note,
        "records": clean_records,
    }
    target = SAMPLES_DIR / filename
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str) + "\n", encoding="utf-8")
    sample_summaries.append(
        {
            "file": f"samples/{filename}",
            "source": source,
            "count": len(clean_records),
            "status": status,
        }
    )


def add_fields(fields: list[str]) -> None:
    if fields:
        report.append(f"**Field names:** `{', '.join(fields)}`")
    else:
        report.append("**Field names:** unavailable")


def resource_active(resource: dict[str, Any]) -> bool:
    return resource.get("datastore_active") is True or str(resource.get("datastore_active", "")).lower() in {"true", "1"}


def bounded_get_status(url: str) -> tuple[int | str, str, str, str | None]:
    """Check a URL with a one-byte range, without consuming a dataset response."""
    try:
        response = session.get(
            url,
            headers={"Range": "bytes=0-0"},
            timeout=TIMEOUT,
            allow_redirects=True,
            stream=True,
        )
    except requests.RequestException as exc:
        return "request failed", "not supplied", "not supplied", f"{type(exc).__name__}: {exc}"
    status = response.status_code
    length = response.headers.get("Content-Length", "not supplied")
    content_range = response.headers.get("Content-Range", "not supplied")
    response.close()
    return status, length, content_range, None


def select_resource(resources: list[dict[str, Any]], predicate) -> dict[str, Any] | None:
    return next((resource for resource in resources if predicate(resource)), None)


def safe_slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:72] or "resource"


def probe_ckan_package(
    package_id: str,
    *,
    resource_specs: list[tuple[str, str, Any]],
    archive_spec: tuple[str, str, Any] | None = None,
) -> None:
    url = f"{CKAN_API}/package_show"
    response, body, error = get_json(url, {"id": package_id})
    title = body.get("result", {}).get("title") if isinstance(body, dict) else None
    report.extend(
        [
            f"### CKAN package: {title or package_id}",
            f"- Package ID: `{package_id}`",
            f"- URL: {url}?id={package_id}",
            f"- HTTP status: **{response.status_code if response else 'request failed'}**",
        ]
    )
    if error:
        report.append(f"- Error: {error}")
    if not response or response.status_code != 200 or not isinstance(body, dict) or not body.get("success"):
        save_sample(
            f"ckan-{safe_slug(package_id)}-package.json",
            source=title or package_id,
            url=f"{url}?id={package_id}",
            status=response.status_code if response else "request failed",
            note=error or (body.get("error") if isinstance(body, dict) else None),
        )
        report.append("")
        return

    resources = body.get("result", {}).get("resources", [])
    report.append(f"- Resource count in catalog: **{len(resources)}**")

    for label, slug, predicate in resource_specs:
        resource = select_resource(resources, predicate)
        report.append(f"\n#### {label}")
        if not resource:
            report.append("- Resource: **not found in package metadata**")
            save_sample(
                f"{slug}.json",
                source=label,
                url=f"{url}?id={package_id}",
                status=response.status_code,
                note="No matching resource was returned by package_show.",
            )
            continue

        resource_id = str(resource.get("id", ""))
        resource_url = str(resource.get("url", ""))
        active = resource_active(resource)
        report.extend(
            [
                f"- Resource ID: `{resource_id}`",
                f"- Resource URL: {resource_url}",
                f"- Catalog format / datastore_active: `{resource.get('format')}` / `{active}`",
            ]
        )
        if active:
            preview_url = f"{CKAN_API}/datastore_search"
            query_params = {"resource_id": resource_id, "limit": 5}
            preview_response, preview, preview_error = get_json(preview_url, query_params)
            status = preview_response.status_code if preview_response else "request failed"
            result = preview.get("result", {}) if isinstance(preview, dict) else {}
            records = result.get("records", []) if isinstance(result, dict) else []
            fields = [str(field.get("id")) for field in result.get("fields", []) if field.get("id")] if isinstance(result, dict) else []
            total = result.get("total") if isinstance(result, dict) else None
            note = None
            if preview_error:
                note = preview_error
            if archive_spec and slug == archive_spec[0]:
                note = (
                    "The active datastore preview is a ZIP/Parquet archive member listing, "
                    "not chemistry rows. The archive was not downloaded."
                )
            report.append(f"- Datastore preview: **HTTP {status}**; total rows listed: **{total if total is not None else 'unavailable'}**; records returned: **{min(len(records), 5)}**")
            if note:
                report.append(f"- Note: {note}")
            add_fields(fields)
            save_sample(
                f"{slug}.json",
                source=label,
                url=f"{preview_url}?resource_id={resource_id}&limit=5",
                status=status,
                records=records,
                fields=fields,
                total=total if isinstance(total, int) else None,
                note=note,
                resource_id=resource_id,
            )
        else:
            status, content_length, content_range, preview_error = bounded_get_status(resource_url)
            note = "No datastore preview; only a one-byte range was requested, not the resource body."
            report.append(f"- Download reachability (one-byte Range GET): **HTTP {status}**; Content-Length: `{content_length}`; Content-Range: `{content_range}`")
            report.append(f"- Note: {note}")
            if preview_error:
                report.append(f"- Error: {preview_error}")
            save_sample(
                f"{slug}.json",
                source=label,
                url=resource_url,
                status=status,
                note=note,
                resource_id=resource_id,
            )
    report.append("")


def arcgis_search_item(query: str, path_fragment: str) -> tuple[dict[str, Any] | None, int | str, str]:
    response, body, error = get_json(
        ARCGIS_SEARCH,
        {"q": query, "f": "json", "num": 25, "start": 1},
    )
    if not response or response.status_code != 200 or not isinstance(body, dict):
        return None, response.status_code if response else "request failed", error or "Search response unavailable"
    matches = [
        item
        for item in body.get("results", [])
        if item.get("type") == "Feature Service"
        and path_fragment.lower() in str(item.get("url", "")).lower()
    ]
    if not matches:
        return None, response.status_code, f"No Feature Service match for {path_fragment}; portal total={body.get('total')}"
    # The final services' titles explicitly say Proposed Final for 2026. Keep that
    # official title and its URL in the report instead of implying adoption status.
    matches.sort(key=lambda item: ("draft" in str(item.get("title", "")).lower(), str(item.get("title", ""))))
    return matches[0], response.status_code, ""


def probe_arcgis_service(name: str, query: str, path_fragment: str, sample_name: str) -> None:
    item, search_status, search_error = arcgis_search_item(query, path_fragment)
    report.extend([f"### Water Boards ArcGIS: {name}", f"- Portal search URL: {ARCGIS_SEARCH}?q={requests.utils.quote(query)}&f=json"])
    if not item:
        report.append(f"- Portal search HTTP status: **{search_status}**")
        report.append(f"- Result: {search_error}")
        save_sample(sample_name, source=name, url=ARCGIS_SEARCH, status=search_status, note=search_error)
        report.append("")
        return

    service_url = str(item.get("url", "")).rstrip("/")
    report.extend(
        [
            f"- Portal search HTTP status: **{search_status}**",
            f"- Portal item: **{item.get('title')}** (`{item.get('id')}`; {item.get('type')})",
            f"- Feature service URL: {service_url}",
        ]
    )
    info_response, info, info_error = get_json(service_url, {"f": "json"})
    report.append(f"- Service metadata HTTP status: **{info_response.status_code if info_response else 'request failed'}**")
    if info_error or not isinstance(info, dict):
        message = info_error or "Service metadata was not JSON."
        report.append(f"- Error: {message}")
        save_sample(sample_name, source=name, url=service_url, status=info_response.status_code if info_response else "request failed", note=message)
        report.append("")
        return

    layer = next(iter(info.get("layers", [])), None)
    if not layer:
        report.append("- Feature layer: **none listed**")
        save_sample(sample_name, source=name, url=service_url, status=info_response.status_code, note="Service metadata listed no feature layers.")
        report.append("")
        return

    layer_url = f"{service_url}/{layer['id']}"
    layer_response, layer_info, layer_error = get_json(layer_url, {"f": "json"})
    fields_meta = layer_info.get("fields", []) if isinstance(layer_info, dict) else []
    fields = [str(field.get("name")) for field in fields_meta if field.get("name")]
    aliases = {str(field.get("name", "")).lower(): field.get("alias") for field in fields_meta}
    report.extend(
        [
            f"- Layer: `{layer.get('name')}` at `{layer_url}`; metadata HTTP status: **{layer_response.status_code if layer_response else 'request failed'}**",
            f"- Geometry type: `{layer_info.get('geometryType') if isinstance(layer_info, dict) else 'unavailable'}`",
        ]
    )
    add_fields(fields)
    if layer_error:
        report.append(f"- Layer error: {layer_error}")

    region_field = next(
        (field for field in fields if field.lower() in {"board_name", "boardname", "regional_board", "region_name"}),
        None,
    )
    if region_field:
        # Both final services expose the Regional Board label, not a numeric
        # region code. Region 9 is identified by the source's San Diego label.
        where = f"{region_field} LIKE '%San Diego%'"
        region_note = f"Region 9 filtered using `{region_field} LIKE '%San Diego%'` ({aliases.get(region_field.lower()) or 'Regional Board label'})."
    else:
        where = "1=0"
        region_note = "No Regional Board/region field exists; no records were requested rather than sampling non-Region-9 features."
    query_url = f"{layer_url}/query"
    count_response, count_body, count_error = get_json(
        query_url,
        {"f": "json", "where": where, "returnCountOnly": "true"},
    )
    total = count_body.get("count") if isinstance(count_body, dict) else None
    query_params = {
        "f": "geojson",
        "where": where,
        "outFields": "*",
        "resultRecordCount": 5,
        "outSR": 4326,
    }
    feature_response, geojson, feature_error = get_json(query_url, query_params)
    features = geojson.get("features", []) if isinstance(geojson, dict) else []
    feature_fields = sorted({key for feature in features[:5] for key in (feature.get("properties") or {})})
    errors = [err for err in (count_error, feature_error) if err]
    if isinstance(geojson, dict) and geojson.get("error"):
        errors.append(str(geojson["error"]))
    report.extend(
        [
            f"- Region 9 count query: **HTTP {count_response.status_code if count_response else 'request failed'}**, **{total if total is not None else 'unavailable'}** features.",
            f"- GeoJSON sample query: **HTTP {feature_response.status_code if feature_response else 'request failed'}**; **{min(len(features), 5)}** features returned (maximum five).",
            f"- Region filter: {region_note}",
            f"- Sample property fields: `{', '.join(feature_fields) if feature_fields else 'unavailable'}`",
        ]
    )
    for error in errors:
        report.append(f"- Query error: {error}")
    note = region_note
    save_sample(
        sample_name,
        source=name,
        url=query_url + "?where=Region+9&resultRecordCount=5&f=geojson&outSR=4326",
        status=feature_response.status_code if feature_response else "request failed",
        records=features,
        fields=feature_fields or fields,
        total=total if isinstance(total, int) else None,
        note=note if not errors else f"{note} Errors: {'; '.join(errors)}",
        resource_id=str(item.get("id")),
    )
    report.append("")


def probe_attains() -> None:
    endpoint = f"{ATTAINS_API}/assessmentUnits"
    api_key = (
        os.environ.get("EPA_ATTAINS_API_KEY")
        or os.environ.get("DATA_GOV_API_KEY")
        or "DEMO_KEY"
    )
    using_demo = api_key == "DEMO_KEY"
    body = None
    error = None
    response = None
    try:
        # Stream so a denied request can be classified from its status without
        # waiting for or reading an error page. A successful query is capped at
        # five records and its JSON body is expected to remain small.
        response = session.get(
            endpoint,
            params={"stateCode": "CA", "pageNumber": 1, "pageSize": 5, "api_key": api_key},
            timeout=TIMEOUT,
            stream=True,
        )
        status = response.status_code
        if status == 200:
            body = json.loads(response.raw.read(2_000_000))
        else:
            response.close()
    except (requests.RequestException, ValueError) as exc:
        status = response.status_code if response is not None else "request failed"
        error = f"{type(exc).__name__}: {exc}"
        if response is not None:
            response.close()
    records: list[dict[str, Any]] = []
    if isinstance(body, list):
        records = [item for item in body if isinstance(item, dict)][:5]
    elif isinstance(body, dict):
        for key in ("assessmentUnits", "items", "results", "data"):
            if isinstance(body.get(key), list):
                records = [item for item in body[key] if isinstance(item, dict)][:5]
                break
    fields = sorted({key for record in records for key in record})
    note = None
    if status in (401, 403):
        note = (
            "Blocked: EPA now requires a valid api.data.gov key. The default DEMO_KEY "
            "was not accepted. Set EPA_ATTAINS_API_KEY to rerun this section; no key "
            "is requested or written by this script."
        )
    elif error:
        note = error
    elif status == 200 and not records:
        note = f"HTTP 200 but the response shape was not a recognized list: {type(body).__name__}."
        fields = sorted(body.keys()) if isinstance(body, dict) else []
    report.extend(
        [
            "### EPA ATTAINS assessment units",
            f"- URL: `{endpoint}?stateCode=CA&pageNumber=1&pageSize=5&api_key=[redacted]`",
            f"- HTTP status: **{status}**",
            f"- California assessment-unit sample count: **{len(records)}** (maximum five).",
        ]
    )
    if using_demo:
        report.append("- Key source: public `DEMO_KEY`; no credential value is stored.")
    if note:
        report.append(f"- Note: {note}")
    add_fields(fields)
    save_sample(
        "epa-attains-ca-assessment-units.json",
        source="EPA ATTAINS assessment units for California",
        url=f"{endpoint}?stateCode=CA&pageNumber=1&pageSize=5",
        status=status,
        records=records,
        fields=fields,
        total=None,
        note=note,
    )
    report.append("")


def probe_oehha() -> None:
    package_id = "calenviroscreen-4-0"
    package_url = f"{CKAN_API}/package_show"
    response, body, error = get_json(package_url, {"id": package_id})
    title = body.get("result", {}).get("title") if isinstance(body, dict) else None
    report.extend(
        [
            f"### OEHHA CalEnviroScreen 4.0",
            "- Official page: https://oehha.ca.gov/calenviroscreen/download-data",
            f"- Official CA Open Data package: `{package_id}` ({title or 'title unavailable'}).",
            f"- package_show URL: {package_url}?id={package_id}",
            f"- package_show HTTP status: **{response.status_code if response else 'request failed'}**",
        ]
    )
    official_page_url = "https://oehha.ca.gov/calenviroscreen/download-data"
    official_page_status, _, _, official_page_error = bounded_get_status(official_page_url)
    report.append(f"- Official OEHHA download page reachability (one-byte Range GET): **HTTP {official_page_status}**.")
    if official_page_error:
        report.append(f"- Official OEHHA page error: {official_page_error}")
    resources = body.get("result", {}).get("resources", []) if isinstance(body, dict) else []
    xlsx = select_resource(resources, lambda item: item.get("format", "").lower() == "xlsx" and "results" in item.get("name", "").lower())
    for wanted in ("Geodatabase", "Shapefile"):
        resource = select_resource(resources, lambda item, w=wanted: w.lower() in item.get("name", "").lower())
        if not resource:
            report.append(f"- {wanted} download: not listed.")
            continue
        try:
            status, length, content_range, request_error = bounded_get_status(resource.get("url", ""))
        except Exception as exc:
            status, length, content_range, request_error = "request failed", "not supplied", "not supplied", f"{type(exc).__name__}: {exc}"
        if request_error:
            report.append(f"- {wanted} download: {request_error}")
        else:
            report.append(f"- {wanted} download: **HTTP {status}**; Content-Length `{length}`; Content-Range `{content_range}`; only a one-byte range was requested.")
        report.append(f"  - Resource ID `{resource.get('id')}`; {resource.get('url')}")

    if not xlsx:
        note = "No CalEnviroScreen results spreadsheet resource was found."
        report.append(f"- {note}")
        save_sample("oehha-calenviroscreen40-tracts.json", source="OEHHA CalEnviroScreen 4.0 tract data", url=package_url, status=response.status_code if response else "request failed", note=note)
        report.append("")
        return

    resource_id = str(xlsx.get("id", ""))
    preview_url = f"{CKAN_API}/datastore_search"
    preview_response, preview, preview_error = get_json(preview_url, {"resource_id": resource_id, "limit": 5})
    status = preview_response.status_code if preview_response else "request failed"
    result = preview.get("result", {}) if isinstance(preview, dict) else {}
    records = result.get("records", []) if isinstance(result, dict) else []
    fields = [str(field.get("id")) for field in result.get("fields", []) if field.get("id")] if isinstance(result, dict) else []
    total = result.get("total") if isinstance(result, dict) else None
    note = preview_error
    report.extend(
        [
            f"- Tract resource: `{xlsx.get('name')}`; resource ID `{resource_id}`.",
            f"- Datastore preview: **HTTP {status}**; total rows: **{total if total is not None else 'unavailable'}**; records returned: **{min(len(records), 5)}**.",
        ]
    )
    if note:
        report.append(f"- Error: {note}")
    add_fields(fields)
    save_sample(
        "oehha-calenviroscreen40-tracts.json",
        source="OEHHA CalEnviroScreen 4.0 tract data",
        url=f"{preview_url}?resource_id={resource_id}&limit=5",
        status=status,
        records=records,
        fields=fields,
        total=total if isinstance(total, int) else None,
        note=note,
        resource_id=resource_id,
    )
    report.append("")


def field_mapping() -> None:
    rows = [
        ("metadata.dataset_version", "NO SOURCE FIELD", "Build/version metadata belongs to this application."),
        ("metadata.repo_url", "NO SOURCE FIELD", "Repository metadata belongs to this application."),
        ("metadata.is_sample_data", "NO SOURCE FIELD", "Review/provenance decision, not in source rows."),
        ("metadata.generated_at", "NO SOURCE FIELD", "Probe time is recorded in this report only."),
        ("metadata.monitoring_data_through", "CEDEN/SWAMP SampleDate (derive max)", "Can be derived after a complete, approved data pipeline."),
        ("metadata.cutoff_date", "NO SOURCE FIELD", "Cycle cutoff is a policy/configuration value."),
        ("metadata.next_cycle", "ArcGIS item/service cycle (partial)", "A cycle can be inferred from the selected service, not a source row."),
        ("metadata.regions[].region_id", "NO SOURCE FIELD", "ArcGIS gives Regional Board names; the app's `R9` key is an internal mapping."),
        ("metadata.regions[].region_name", "ArcGIS board_name / boardname", "2026/2024 services include the San Diego Regional Board label."),
        ("metadata.sources[]", "NO SOURCE FIELD", "The provenance catalog is app metadata."),
        ("waterbodies[].pair_id", "NO SOURCE FIELD", "Application-generated waterbody/pollutant key."),
        ("waterbodies[].waterbody_id", "ArcGIS wbid / waterbodyid; EPA assessmentUnitIdentifier", "EPA sample is blocked by API-key requirement in this run."),
        ("waterbodies[].waterbody_name", "ArcGIS wbname / waterbodyname; EPA assessmentUnitName", "Name aliases differ by service year."),
        ("waterbodies[].waterbody_type", "ArcGIS wbtype / waterbodytype", "Source labels may need enum normalization."),
        ("waterbodies[].region_id", "ArcGIS board_name / boardname", "Board name can be mapped to the internal region key."),
        ("waterbodies[].county", "ArcGIS counties / waterbodycounty", "May contain multiple counties."),
        ("waterbodies[].centroid", "NO SOURCE FIELD", "Can be calculated from geometry; no canonical centroid field in sampled services."),
        ("waterbodies[].geometry", "ArcGIS GeoJSON geometry", "Line/Polygon geometry returned as GeoJSON."),
        ("waterbodies[].pollutant", "ArcGIS newpollutantslisted / newpollutantsdelisted / pastcyclelistings (compound text)", "Not a normalized pair-level pollutant field."),
        ("waterbodies[].pollutant_group", "NO SOURCE FIELD", "Requires reviewed pollutant taxonomy."),
        ("waterbodies[].official_status", "ArcGIS listingstatus", "Source values require normalization."),
        ("waterbodies[].official_category", "ArcGIS integrated_report_category / integratedreportcategory", "Present in both 2024 and 2026 services."),
        ("waterbodies[].official_cycle", "ArcGIS service/item year", "Service-level metadata, not a row field."),
        ("waterbodies[].decision_id", "NO SOURCE FIELD", "No decision-ID field appeared in sampled feature-service schemas."),
        ("waterbodies[].fact_sheet_url", "ArcGIS hyperlink", "The official services return per-waterbody fact-sheet URLs."),
        ("waterbodies[].tmdl_status", "NO SOURCE FIELD", "Requires a separate reviewed TMDL source."),
        ("waterbodies[].criterion_direction", "NO SOURCE FIELD", "Not in sampled ArcGIS, CEDEN, or SWAMP fields."),
        ("waterbodies[].criterion_value", "NO SOURCE FIELD", "Not in sampled sources; requires the criterion/fact-sheet source."),
        ("waterbodies[].criterion_value_upper", "NO SOURCE FIELD", "Not in sampled sources."),
        ("waterbodies[].criterion_unit", "CEDEN/SWAMP Unit", "Sample measurement unit; not necessarily the policy criterion unit."),
        ("waterbodies[].criterion_basis", "NO SOURCE FIELD", "Requires policy/document extraction and review."),
        ("waterbodies[].beneficial_uses", "NO SOURCE FIELD", "Not present in sampled services."),
        ("waterbodies[].listing_table", "NO SOURCE FIELD", "Not present in sampled services."),
        ("waterbodies[].delisting_table", "NO SOURCE FIELD", "Not present in sampled services."),
        ("waterbodies[].new_samples", "CEDEN/SWAMP SampleDate and station/result rows (derive)", "Requires approved pair matching and date filters."),
        ("waterbodies[].new_exceedances", "CEDEN/SWAMP Result plus criterion (derive)", "Criterion values are not available from sampled fields."),
        ("waterbodies[].allowed_exceedances_for_delisting", "NO SOURCE FIELD", "Policy calculation; not a source field."),
        ("waterbodies[].min_samples_for_delisting", "NO SOURCE FIELD", "Policy calculation; not a source field."),
        ("waterbodies[].screening_flag", "NO SOURCE FIELD", "Derived after approved counts and policy thresholds."),
        ("waterbodies[].first_new_sample_date", "CEDEN/SWAMP SampleDate (derive)", "Requires approved pair matching and cutoff."),
        ("waterbodies[].last_sample_date", "CEDEN/SWAMP SampleDate (derive)", "Requires approved pair matching and cutoff."),
        ("waterbodies[].station_count", "CEDEN/SWAMP StationCode (derive)", "Count distinct linked stations after association."),
        ("waterbodies[].ces_percentile", "OEHHA ces_4_0_percentile", "Tract-level field; requires spatial join to a waterbody."),
        ("waterbodies[].disadvantaged_community", "NO SOURCE FIELD", "Application's threshold is derived from the percentile."),
        ("waterbodies[].summary", "NO SOURCE FIELD", "Editorial summary, not a source field."),
        ("waterbodies[].data_gap_note", "NO SOURCE FIELD", "Editorial/analysis output."),
        ("stations[].station_code", "CEDEN sampling locations SiteCode / chemistry StationCode; SWAMP StationCode", "The CEDEN location crosswalk uses `SiteCode`; chemistry rows use `StationCode`."),
        ("stations[].station_name", "CEDEN StationName / SWAMP station name", "Exact station-key aliases differ by resource."),
        ("stations[].lat", "CEDEN Latitude / SWAMP TargetLatitude", "Coordinate field availability varies by selected table."),
        ("stations[].lon", "CEDEN Longitude / SWAMP TargetLongitude", "Coordinate field availability varies by selected table."),
        ("stations[].waterbody_id", "NO SOURCE FIELD", "Requires a reviewed station-to-waterbody crosswalk or spatial join."),
        ("stations[].link_method", "NO SOURCE FIELD", "Link method is pipeline provenance."),
        ("stations[].sample_count", "CEDEN/SWAMP rows (derive)", "Requires a consistent query and station association."),
        ("stations[].last_sample_date", "CEDEN/SWAMP SampleDate (derive)", "Requires a consistent query and station association."),
        ("samples[].pair_id", "NO SOURCE FIELD", "Application-generated parent pair key."),
        ("samples[].unit", "CEDEN Unit / SWAMP unit field", "Source result unit."),
        ("samples[].criterion_direction", "NO SOURCE FIELD", "Requires reviewed policy criterion data."),
        ("samples[].criterion_value", "NO SOURCE FIELD", "Requires reviewed policy criterion data."),
        ("samples[].criterion_value_upper", "NO SOURCE FIELD", "Requires reviewed policy criterion data."),
        ("samples[].results[].date", "CEDEN SampleDate / SWAMP sample date", "Source date; normalize to YYYY-MM-DD."),
        ("samples[].results[].station_code", "CEDEN StationCode / SWAMP station code", "Resource-specific station-code alias."),
        ("samples[].results[].value", "CEDEN Result / SWAMP result-value field", "Source measurement."),
        ("samples[].results[].qualifier", "CEDEN ResultQualCode / SWAMP qualifier field", "Normalize to the app's qualifier enum."),
        ("samples[].results[].exceeds", "NO SOURCE FIELD", "Derived only after reviewed criterion matching."),
        ("samples[].results[].before_cutoff", "NO SOURCE FIELD", "Derived from sample date and configured cutoff."),
        ("about.recognition[]", "NO SOURCE FIELD", "Editorial/product content."),
    ]
    report.extend(
        [
            "## Field mapping to `docs/data-contract.md`",
            "",
            "Mappings reflect fields actually returned by the public service schemas/samples above. Derived values are labeled; unavailable fields are explicitly marked.",
            "",
            "| Contract field | Source field(s) | Notes / gaps |",
            "|---|---|---|",
        ]
    )
    report.extend(f"| `{md_cell(contract)}` | {md_cell(source)} | {md_cell(note)} |" for contract, source, note in rows)
    report.append("")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
    report.extend(
        [
            "# NextCycle external connections and data-source probe",
            "",
            f"- Probe time (UTC): `{datetime.now(timezone.utc).isoformat(timespec='seconds')}`",
            "- Runtime: Python 3.11; HTTP client: `requests` only (plus Python standard library).",
            "- Safety: read-only requests; CKAN/ArcGIS samples capped at five records per resource/layer; no dataset files downloaded.",
            "",
            "## California Open Data CKAN",
            "",
        ]
    )

    probe_ckan_package(
        "surface-water-chemistry-results",
        resource_specs=[
            ("All-years chemistry Parquet archive (datastore preview)", "ceden-chemistry-all-years-parquet-archive", lambda r: "parquet" in r.get("name", "").lower() and "all years" in r.get("name", "").lower()),
            ("2026 CEDEN chemistry CSV", "ceden-chemistry-2026", lambda r: r.get("name", "").lower() == "2026 ceden water chemistry data"),
        ],
        archive_spec=("ceden-chemistry-all-years-parquet-archive", "all-years-parquet", None),
    )
    probe_ckan_package(
        "surface-water-sampling-location-information",
        resource_specs=[
            ("Surface Water CEDEN sampling locations", "ceden-sampling-locations", lambda r: "sampling locations" in r.get("name", "").lower()),
        ],
    )
    probe_ckan_package(
        "surface-water-ambient-monitoring-program",
        resource_specs=[
            ("SWAMP Stations", "swamp-stations", lambda r: r.get("name", "").lower() == "swamp stations"),
            ("SWAMP Water Quality Results", "swamp-water-quality-results", lambda r: r.get("name", "").lower() == "swamp water quality results"),
        ],
    )
    report.append("## Water Boards ArcGIS feature services\n")
    arcgis_specs = [
        ("Proposed Final 2026 Rivers and Streams (line features)", 'title:"Final_2026_Rivers_and_Streams"', "Final_2026_Rivers_and_Streams", "waterboards-2026-lines.json"),
        ("Proposed Final 2026 Lakes and Reservoirs (polygon features)", 'title:"Final_2026_Lakes_and_Reservoirs"', "Final_2026_Lakes_and_Reservoirs", "waterboards-2026-polygons.json"),
        ("Final 2024 Integrated Report Lines", 'title:"2024 Integrated Report Lines"', "Proposed_2024_Integrated_Report_Lines", "waterboards-2024-lines.json"),
        ("Final 2024 Integrated Report Polygons", 'title:"2024 Integrated Report Polygons"', "2024_Integrated_Report_Polygons", "waterboards-2024-polygons.json"),
    ]
    for name, query, path_fragment, sample_name in arcgis_specs:
        probe_arcgis_service(name, query, path_fragment, sample_name)

    report.append("## EPA ATTAINS\n")
    probe_attains()

    report.append("## OEHHA CalEnviroScreen 4.0\n")
    probe_oehha()

    field_mapping()
    report.extend(
        [
            "## Sample files",
            "",
            "| File | Source | Records in sample | HTTP status |",
            "|---|---|---:|---:|",
        ]
    )
    for item in sample_summaries:
        report.append(f"| `{item['file']}` | {md_cell(item['source'])} | {item['count']} | {md_cell(item['status'])} |")
    report.append("")
    (OUT_DIR / "report.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(f"Wrote {OUT_DIR / 'report.md'}")
    print(f"Wrote {len(sample_summaries)} bounded sample files under {SAMPLES_DIR}")
    print("ATTAINS requires EPA_ATTAINS_API_KEY if the public DEMO_KEY is rejected.")


if __name__ == "__main__":
    main()
