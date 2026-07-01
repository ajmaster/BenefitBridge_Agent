"""FastAPI surface for the BenefitBridge CA public demo."""

from __future__ import annotations

import json
import os
import time
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api_schemas import (
    ChatRequest,
    ExportRequest,
    PacketRequest,
    PrepareRequest,
    ReadinessResponse,
    TranslateRequest,
)
from app.config import (
    APP_ENV,
    ENABLE_GOOGLE_MAPS_EMBED,
    PROJECT_ROOT,
    SOURCE_PACK_VERSION,
)
from app.graph import run_benefitbridge_graph
from app.policies.privacy import redact_pii
from app.services.chat_workflow import run_chat_workflow
from app.services.google_integrations import (
    google_integration_status,
    translation_mode,
)
from app.services.source_store import DEFAULT_STORE
from app.tools.export import export_packet
from app.tools.local_resources import find_local_resources
from app.tools.sources import retrieve_approved_source, search_source_snapshot
from app.tools.translation import translate_packet
from app.tools.validation import validate_packet

REQUEST_SIZE_LIMIT_BYTES = int(os.getenv("REQUEST_SIZE_LIMIT_BYTES", "65536"))
RATE_LIMIT_REQUESTS_PER_MINUTE = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "80"))
FRONTEND_OUT = PROJECT_ROOT / "frontend" / "out"


def _cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(
    title="BenefitBridge CA",
    version="0.1.0",
    description="Privacy-preserving benefits prep and handoff public demo API.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["content-type", "authorization"],
)

_rate_limit_buckets: dict[str, list[float]] = {}


@app.middleware("http")
async def public_demo_guardrails(request: Request, call_next: Any) -> Any:
    """Apply request-size, basic rate, and security-header guardrails."""

    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > REQUEST_SIZE_LIMIT_BYTES:
        return _error_response(
            "REQUEST_TOO_LARGE",
            "Request body is too large for the public demo.",
            status_code=413,
        )

    client_key = request.client.host if request.client else "unknown"
    if _rate_limited(client_key):
        return _error_response(
            "RATE_LIMITED",
            "Too many requests. Please wait before trying again.",
            status_code=429,
        )

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
    )
    response.headers["Content-Security-Policy"] = _content_security_policy()
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    del request
    return _error_response(
        "REQUEST_VALIDATION_FAILED",
        "The request shape is not supported by the public demo API.",
        status_code=422,
        details={"error_count": len(exc.errors())},
    )


@app.get("/healthz")
def healthz() -> dict[str, Any]:
    return {
        "status": "ok",
        "app": "benefitbridge-ca",
        "environment": APP_ENV,
        "source_pack_version": SOURCE_PACK_VERSION,
        "approved_sources": len(DEFAULT_STORE.approved_sources),
        "program_areas": len(DEFAULT_STORE.program_areas),
    }


@app.post("/api/prepare")
def prepare(request: PrepareRequest) -> dict[str, Any]:
    snapshot = request.snapshot.model_dump()
    privacy_scan = _scan_payload_for_sensitive_text(
        {"user_text": request.user_text, "snapshot": snapshot}
    )
    if privacy_scan["blocked"]:
        return {
            "route": "privacy_block",
            "message": "Sensitive values were detected. Do not upload SSNs, credentials, case numbers, payment cards, real documents, or exact shelter/safety locations.",
            "redaction": privacy_scan,
            "events": ["consent_privacy"],
        }

    return run_benefitbridge_graph(request.user_text, snapshot)


@app.post("/api/chat")
def chat(request: ChatRequest) -> dict[str, Any]:
    return run_chat_workflow(
        [message.model_dump() for message in request.messages],
        request.snapshot.model_dump(),
    )


@app.post("/api/validate")
def validate(request: PacketRequest) -> dict[str, Any]:
    privacy_scan = _scan_payload_for_sensitive_text(request.packet)
    report = validate_packet(
        request.packet,
        source_metadata=request.source_metadata,
        household_snapshot=request.household_snapshot,
    )
    if privacy_scan["blocked"]:
        report["pass"] = False
        report["blocking_failures"] = sorted(
            set(report["blocking_failures"]) | {"PII_DETECTED_IN_PACKET"}
        )
        report["failures"] = sorted(
            set(report["failures"]) | {"PII_DETECTED_IN_PACKET"}
        )
    return {"validation": report, "privacy_scan": _scan_public_fields(privacy_scan)}


@app.post("/api/export")
def export(request: ExportRequest) -> dict[str, Any]:
    privacy_scan = _scan_payload_for_sensitive_text(request.packet)
    if privacy_scan["blocked"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PII_DETECTED_IN_PACKET",
                "message": "Packet export is blocked until sensitive values are removed.",
                "findings": privacy_scan["findings"],
            },
        )

    result = export_packet(request.packet, list(request.formats))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/translate")
def translate(request: TranslateRequest) -> dict[str, Any]:
    privacy_scan = _scan_payload_for_sensitive_text(request.packet)
    if privacy_scan["blocked"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PII_DETECTED_IN_PACKET",
                "message": "Translation is blocked until sensitive values are removed.",
                "findings": privacy_scan["findings"],
            },
        )

    validation = validate_packet(
        request.packet,
        source_metadata=request.source_metadata,
        household_snapshot=request.household_snapshot,
    )
    if not validation["pass"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PACKET_VALIDATION_FAILED",
                "message": "Translation is blocked until packet validation passes.",
                "blocking_failures": validation["blocking_failures"],
            },
        )

    translated = translate_packet(request.packet, request.target_language)
    translated["translation_mode"] = translation_mode()
    translated["validation"] = validation
    return translated


@app.get("/api/sources")
def sources(
    source_id: str | None = Query(default=None, max_length=120),
    query: str = Query(default="", max_length=200),
    jurisdiction: str | None = Query(default=None, max_length=120),
    program_area: str | None = Query(default=None, max_length=120),
    source_type: str | None = Query(default=None, max_length=80),
) -> dict[str, Any]:
    if source_id:
        result = retrieve_approved_source(source_id)
        if result.get("code") == "SOURCE_NOT_FOUND":
            raise HTTPException(status_code=404, detail=result)
        return {"source": result}

    results = search_source_snapshot(
        query,
        jurisdiction=jurisdiction,
        program_area=program_area,
        source_type=source_type,
    )
    return {
        "sources": results,
        "approved_domain_count": len(DEFAULT_STORE.approved_domains),
        "freshness_policy": "Critical sources must be checked before release; UI shows freshness state.",
    }


@app.get("/api/resources")
def resources(
    jurisdiction: str = Query(..., max_length=120),
    need_type: str = Query(default="", max_length=80),
    radius: int | None = Query(default=None, ge=1, le=50),
    language: str | None = Query(default=None, max_length=20),
) -> dict[str, Any]:
    privacy_scan = _scan_payload_for_sensitive_text(
        {"jurisdiction": jurisdiction, "need_type": need_type, "language": language}
    )
    if privacy_scan["blocked"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "PII_DETECTED_IN_RESOURCE_QUERY",
                "message": "Use city, county, or ZIP only. Do not submit exact addresses.",
                "findings": privacy_scan["findings"],
            },
        )

    return {
        "resources": find_local_resources(jurisdiction, need_type, radius, language),
        "availability_notice": "Local resource details can change. Call before going.",
    }


@app.get("/api/eval/readiness", response_model=ReadinessResponse)
def readiness() -> dict[str, Any]:
    latest_grade = _latest_grade_summary()
    source_pack = {
        "version": SOURCE_PACK_VERSION,
        "approved_sources": len(DEFAULT_STORE.approved_sources),
        "approved_domains": len(DEFAULT_STORE.approved_domains),
        "program_areas": len(DEFAULT_STORE.program_areas),
        "county_profiles": len(DEFAULT_STORE.county_profiles),
        "local_resources": len(DEFAULT_STORE.local_resources),
    }
    evals = {
        "datasets": _dataset_counts(),
        "latest_grade_summary": latest_grade,
        "metric_config": "deterministic_local_code_metrics",
    }
    release_gates = {
        "latest_eval_scores_valid": latest_grade.get("out_of_range_scores", 0) == 0,
        "latest_eval_grounding_clean": _metric_mean_at_least(
            latest_grade, "benefitbridge_grounding_gate", 1.0
        ),
        "source_pack_loaded": source_pack["approved_sources"] > 0,
        "no_cloud_deploy_inferred": True,
        "ready_for_public_deploy": False,
        "reason": "Deployment and live Google API smoke remain explicit approval-gated steps.",
    }
    return {
        "app": {
            "name": "benefitbridge-ca",
            "environment": APP_ENV,
            "source_pack_version": SOURCE_PACK_VERSION,
            "api_routes": [
                "/healthz",
                "/api/chat",
                "/api/prepare",
                "/api/validate",
                "/api/export",
                "/api/translate",
                "/api/sources",
                "/api/resources",
                "/api/eval/readiness",
            ],
        },
        "source_pack": source_pack,
        "evals": evals,
        "integrations": google_integration_status(),
        "release_gates": release_gates,
    }


if FRONTEND_OUT.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_OUT, html=True), name="frontend")


def _rate_limited(client_key: str) -> bool:
    now = time.monotonic()
    window_start = now - 60
    bucket = [
        stamp
        for stamp in _rate_limit_buckets.get(client_key, [])
        if stamp >= window_start
    ]
    if len(bucket) >= RATE_LIMIT_REQUESTS_PER_MINUTE:
        _rate_limit_buckets[client_key] = bucket
        return True
    bucket.append(now)
    _rate_limit_buckets[client_key] = bucket
    return False


def _scan_payload_for_sensitive_text(payload: Any) -> dict[str, Any]:
    findings: set[str] = set()
    blocked = False
    for text in _walk_strings(payload):
        result = redact_pii(text, context="standard")
        findings.update(result.findings)
        blocked = blocked or result.blocked or "exact_address" in result.findings
    return {
        "provider": "local_regex",
        "findings": sorted(findings),
        "blocked": blocked,
    }


def _walk_strings(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        values: list[str] = []
        for item in value.values():
            values.extend(_walk_strings(item))
        return values
    if isinstance(value, (list, tuple, set)):
        values = []
        for item in value:
            values.extend(_walk_strings(item))
        return values
    return [str(value)]


def _scan_public_fields(scan: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": scan["provider"],
        "findings": scan["findings"],
        "blocked": scan["blocked"],
    }


def _content_security_policy() -> str:
    img_src = "'self' data:"
    script_src = "'self' 'unsafe-inline'"
    connect_src = "'self' http://127.0.0.1:* http://localhost:*"
    frame_src = "'self'"
    if ENABLE_GOOGLE_MAPS_EMBED:
        img_src = f"{img_src} https://*.google.com https://*.googleapis.com https://*.gstatic.com"
        script_src = f"{script_src} https://*.google.com https://*.googleapis.com"
        connect_src = f"{connect_src} https://*.google.com https://*.googleapis.com"
        frame_src = f"{frame_src} https://www.google.com https://maps.google.com"

    return (
        "default-src 'self'; "
        f"img-src {img_src}; "
        f"script-src {script_src}; "
        "style-src 'self' 'unsafe-inline'; "
        f"connect-src {connect_src}; "
        f"frame-src {frame_src}; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )


def _dataset_counts() -> dict[str, Any]:
    dataset_dir = PROJECT_ROOT / "tests" / "eval" / "datasets"
    counts: dict[str, Any] = {}
    for path in sorted(dataset_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)
        counts[path.name] = len(data.get("eval_cases", []))
    return counts


def _latest_grade_summary() -> dict[str, Any]:
    results_dir = PROJECT_ROOT / "artifacts" / "grade_results"
    paths = sorted(results_dir.glob("results_*.json"))
    if not paths:
        return {"present": False, "metrics": [], "out_of_range_scores": 0}
    latest = paths[-1]
    with latest.open(encoding="utf-8") as handle:
        data = json.load(handle)

    metrics = data.get("summary_metrics", [])
    out_of_range = 0
    for metric in metrics:
        score = metric.get("mean_score")
        if isinstance(score, (int, float)) and not 0 <= float(score) <= 1:
            out_of_range += 1
            metric["score_status"] = "out_of_range"
        else:
            metric["score_status"] = "valid"

    return {
        "present": True,
        "file": latest.name,
        "metrics": metrics,
        "out_of_range_scores": out_of_range,
    }


def _metric_mean_at_least(summary: dict[str, Any], name: str, target: float) -> bool:
    for metric in summary.get("metrics", []):
        if metric.get("metric_name") == name:
            score = metric.get("mean_score")
            return isinstance(score, (int, float)) and float(score) >= target
    return False


def _error_response(
    code: str,
    message: str,
    *,
    status_code: int,
    details: dict[str, Any] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "blocking": status_code >= 400,
                "details": details or {},
            }
        },
    )
