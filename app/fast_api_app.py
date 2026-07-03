"""FastAPI surface for the AidAtlasCA public demo."""

from __future__ import annotations

import base64
import binascii
import json
import os
import time
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request
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
    VoiceTurnRequest,
)
from app.config import (
    APP_ENV,
    ENABLE_GOOGLE_MAPS_EMBED,
    ENABLE_VOICE,
    PROJECT_ROOT,
    SOURCE_PACK_VERSION,
)
from app.graph import run_benefitbridge_graph
from app.graph_workflow import graph_workflow_readiness_summary
from app.policies.privacy import redact_pii
from app.services.auth import verify_firebase_id_token
from app.services.a2ui_contract import a2ui_readiness_summary, validate_a2ui_templates
from app.services.chat_workflow import run_chat_workflow
from app.services.google_integrations import (
    detect_sensitive_text,
    google_integration_status,
    screen_model_text,
    translation_mode,
)
from app.services.source_store import DEFAULT_STORE
from app.tools.export import export_packet
from app.tools.local_resources import find_local_resources
from app.tools.sources import retrieve_approved_source, search_source_snapshot
from app.tools.translation import translate_packet
from app.tools.validation import validate_packet
from app.tools.voice import synthesize_speech, transcribe_audio, voice_mode

REQUEST_SIZE_LIMIT_BYTES = int(os.getenv("REQUEST_SIZE_LIMIT_BYTES", "65536"))
VOICE_REQUEST_SIZE_LIMIT_BYTES = int(
    os.getenv("VOICE_REQUEST_SIZE_LIMIT_BYTES", "6000000")
)
RATE_LIMIT_REQUESTS_PER_MINUTE = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "80"))
FRONTEND_OUT = PROJECT_ROOT / "frontend" / "out"


def _cors_origins() -> list[str]:
    raw = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000",
    )
    return [item.strip() for item in raw.split(",") if item.strip()]


app = FastAPI(
    title="AidAtlasCA",
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

    size_limit = (
        VOICE_REQUEST_SIZE_LIMIT_BYTES
        if request.url.path == "/api/voice/turn"
        else REQUEST_SIZE_LIMIT_BYTES
    )
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > size_limit:
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
        "app": "aidatlasca",
        "environment": APP_ENV,
        "source_pack_version": SOURCE_PACK_VERSION,
        "approved_sources": len(DEFAULT_STORE.approved_sources),
        "program_areas": len(DEFAULT_STORE.program_areas),
    }


@app.post("/api/prepare", dependencies=[Depends(verify_firebase_id_token)])
def prepare(request: PrepareRequest) -> dict[str, Any]:
    snapshot = request.snapshot.model_dump()
    privacy_scan = _scan_payload_for_sensitive_text(
        {"user_text": request.user_text, "snapshot": snapshot}
    )
    if privacy_scan["blocked"]:
        return _privacy_block_response(privacy_scan, snapshot=snapshot)

    model_armor = _screen_payload_with_model_armor(
        {"user_text": request.user_text, "snapshot": snapshot}, stage="input"
    )
    if model_armor["blocked"]:
        return _model_armor_block_response(model_armor, snapshot=snapshot)

    result = run_benefitbridge_graph(request.user_text, snapshot)
    output_screen = _screen_payload_with_model_armor(
        {"message": result.get("message", "")}, stage="output"
    )
    if output_screen["blocked"]:
        return _model_armor_block_response(output_screen, snapshot=snapshot)
    return result


@app.post("/api/chat", dependencies=[Depends(verify_firebase_id_token)])
def chat(request: ChatRequest) -> dict[str, Any]:
    messages = [message.model_dump() for message in request.messages]
    snapshot = request.snapshot.model_dump()
    privacy_scan = _scan_payload_for_sensitive_text(
        {"messages": messages, "snapshot": snapshot}
    )
    if privacy_scan["blocked"]:
        return _privacy_block_response(privacy_scan, snapshot=snapshot)

    model_armor = _screen_payload_with_model_armor(
        {"messages": messages, "snapshot": snapshot}, stage="input"
    )
    if model_armor["blocked"]:
        return _model_armor_block_response(model_armor, snapshot=snapshot)

    result = run_chat_workflow(messages, snapshot)
    output_screen = _screen_payload_with_model_armor(
        {"message": result.get("message", "")}, stage="output"
    )
    if output_screen["blocked"]:
        return _model_armor_block_response(
            output_screen, snapshot=result.get("snapshot", snapshot)
        )
    return result


@app.post("/api/voice/turn", dependencies=[Depends(verify_firebase_id_token)])
def voice_turn(request: VoiceTurnRequest) -> dict[str, Any]:
    if not ENABLE_VOICE:
        raise HTTPException(
            status_code=404,
            detail={
                "code": "VOICE_DISABLED",
                "message": "Voice is not enabled for this deployment.",
            },
        )

    try:
        audio_bytes = base64.b64decode(request.audio_base64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "AUDIO_DECODE_FAILED",
                "message": "Audio could not be decoded.",
            },
        ) from exc

    try:
        transcript = transcribe_audio(audio_bytes, language=request.snapshot.language)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail={"code": "VOICE_UNAVAILABLE", "message": str(exc)},
        ) from exc

    if not transcript:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "EMPTY_TRANSCRIPT",
                "message": "No speech was recognized in the audio.",
            },
        )

    transcript_scan = _scan_payload_for_sensitive_text(
        {"transcript": transcript, "snapshot": request.snapshot.model_dump()}
    )
    if transcript_scan["blocked"]:
        result = _privacy_block_response(
            transcript_scan, snapshot=request.snapshot.model_dump()
        )
        local_redaction = redact_pii(transcript, context="standard")
        result["transcript"] = (
            local_redaction.redacted_text
            if local_redaction.redacted_text != transcript
            else "[REDACTED_BY_PRIVACY_SCAN]"
        )
        result["audio_base64"] = ""
        result["voice_mode"] = voice_mode()
        return result

    # Identical redaction/safety/grounding path as `/api/chat`: the transcript
    # is treated as an ordinary user message, not a privileged input.
    messages = [message.model_dump() for message in request.messages]
    messages.append({"role": "user", "content": transcript})
    result = run_chat_workflow(messages, request.snapshot.model_dump())

    reply_text = str(result.get("message", ""))
    reply_language = str(result.get("snapshot", {}).get("language", "en"))
    audio_reply = synthesize_speech(reply_text, language=reply_language)

    # Only the redacted transcript is ever returned to the client; the raw
    # transcript must not be echoed back once sensitive text is detected.
    result["transcript"] = redact_pii(transcript, context="standard").redacted_text
    result["audio_base64"] = (
        base64.b64encode(audio_reply).decode("ascii") if audio_reply else ""
    )
    result["voice_mode"] = voice_mode()
    return result


@app.post("/api/validate", dependencies=[Depends(verify_firebase_id_token)])
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


@app.post("/api/export", dependencies=[Depends(verify_firebase_id_token)])
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

    result = export_packet(
        request.packet,
        list(request.formats),
        resources=request.resources,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.post("/api/translate", dependencies=[Depends(verify_firebase_id_token)])
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


@app.get("/api/sources", dependencies=[Depends(verify_firebase_id_token)])
def sources(
    source_id: str | None = Query(default=None, max_length=120),
    query: str = Query(default="", max_length=200),
    jurisdiction: str | None = Query(default=None, max_length=120),
    program_area: str | None = Query(default=None, max_length=120),
    source_type: str | None = Query(default=None, max_length=80),
    owner_type: str | None = Query(default=None, max_length=80),
    freshness_state: str | None = Query(default=None, max_length=40),
    coverage_level: str | None = Query(default=None, max_length=40),
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
        owner_type=owner_type,
        freshness_state=freshness_state,
        coverage_level=coverage_level,
    )
    return {
        "sources": results,
        "approved_domain_count": len(DEFAULT_STORE.approved_domains),
        "freshness_policy": "Critical sources must be checked before release; UI shows freshness state.",
    }


@app.get("/api/resources", dependencies=[Depends(verify_firebase_id_token)])
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


@app.get("/api/california/counties", dependencies=[Depends(verify_firebase_id_token)])
def california_counties() -> dict[str, Any]:
    """Return source-pack-derived California county coverage summaries."""

    return {
        "counties": DEFAULT_STORE.california_county_summaries(),
        "source_pack_version": SOURCE_PACK_VERSION,
        "counts": DEFAULT_STORE.california_coverage_counts(),
    }


@app.get("/api/california/resources", dependencies=[Depends(verify_firebase_id_token)])
def california_resources(
    county: str = Query(..., max_length=120),
    need_type: str = Query(default="", max_length=80),
    coverage: str = Query(default="all", max_length=24),
    limit: int = Query(default=12, ge=1, le=50),
    language: str | None = Query(default=None, max_length=20),
) -> dict[str, Any]:
    """Return reviewed or statewide-core resource handoffs for one California county."""

    if coverage not in {"all", "reviewed_local", "statewide_locator"}:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "UNSUPPORTED_COVERAGE_FILTER",
                "message": "coverage must be all, reviewed_local, or statewide_locator.",
            },
        )

    privacy_scan = _scan_payload_for_sensitive_text(
        {"county": county, "need_type": need_type, "language": language}
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

    resources = find_local_resources(
        county,
        _coarse_resource_need_type(need_type),
        language=language,
        safety_sensitive=_is_safety_sensitive_resource_query(county, need_type),
    )
    if coverage != "all":
        resources = [
            resource
            for resource in resources
            if resource.get("coverage_level", "reviewed_local") == coverage
        ]
    return {
        "resources": resources[:limit],
        "availability_notice": "Call before going to confirm current availability.",
        "coverage_filter": coverage,
        "source_pack_version": SOURCE_PACK_VERSION,
    }


@app.get(
    "/api/eval/readiness",
    response_model=ReadinessResponse,
    dependencies=[Depends(verify_firebase_id_token)],
)
def readiness() -> dict[str, Any]:
    latest_grade = _latest_grade_summary()
    source_pack = {
        "version": SOURCE_PACK_VERSION,
        "approved_sources": len(DEFAULT_STORE.approved_sources),
        "approved_domains": len(DEFAULT_STORE.approved_domains),
        "program_areas": len(DEFAULT_STORE.program_areas),
        "california_counties": len(DEFAULT_STORE.california_counties),
        "county_profiles": len(DEFAULT_STORE.county_profiles),
        "local_resources": len(DEFAULT_STORE.local_resources),
    }
    evals = {
        "datasets": _dataset_counts(),
        "latest_grade_summary": latest_grade,
        "metric_config": "deterministic_local_code_metrics",
    }
    a2ui = a2ui_readiness_summary()
    graph_workflow = graph_workflow_readiness_summary()
    release_gates = {
        "latest_eval_scores_valid": latest_grade.get("out_of_range_scores", 0) == 0,
        "latest_eval_grounding_clean": _metric_mean_at_least(
            latest_grade, "benefitbridge_grounding_gate", 1.0
        ),
        "a2ui_contract_valid": a2ui["valid"],
        "graph_workflow_loaded": graph_workflow["node_count"] >= 12,
        "source_pack_loaded": source_pack["approved_sources"] > 0,
        "statewide_core_counties_loaded": source_pack["california_counties"] == 58,
        "no_cloud_deploy_inferred": True,
        "ready_for_public_deploy": False,
        "reason": "Deployment and live Google API smoke remain explicit approval-gated steps.",
    }
    return {
        "app": {
            "name": "aidatlasca",
            "environment": APP_ENV,
            "source_pack_version": SOURCE_PACK_VERSION,
            "api_routes": [
                "/healthz",
                "/api/chat",
                "/api/voice/turn",
                "/api/prepare",
                "/api/validate",
                "/api/export",
                "/api/translate",
                "/api/sources",
                "/api/resources",
                "/api/california/counties",
                "/api/california/resources",
                "/api/eval/readiness",
            ],
            "a2ui": a2ui,
            "graph_workflow": graph_workflow,
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
    finding_counts: dict[str, int] = {}
    blocked = False
    provider = "local_regex"
    for text in _walk_strings(payload):
        result = detect_sensitive_text(text, context="standard")
        if result["provider"] != "local_regex":
            provider = str(result["provider"])
        findings.update(result["findings"])
        finding_counts = _merge_counts(finding_counts, result.get("finding_counts", {}))
        blocked = blocked or result["blocked"] or "exact_address" in result["findings"]
    return {
        "provider": provider,
        "findings": sorted(findings),
        "finding_counts": finding_counts,
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
        "finding_counts": scan.get("finding_counts", {}),
        "blocked": scan["blocked"],
    }


def _is_safety_sensitive_resource_query(*values: str | None) -> bool:
    text = " ".join(value or "" for value in values).lower()
    return any(
        phrase in text
        for phrase in (
            "domestic violence",
            "dv",
            "stalking",
            "trafficking",
            "crisis",
            "safe house",
            "safety",
        )
    )


def _coarse_resource_need_type(value: str | None) -> str:
    text = (value or "").lower()
    for phrase in (
        "near me",
        "nearby",
        "open now",
        "available now",
        "availability",
        "current",
        "right now",
    ):
        text = text.replace(phrase, " ")
    return " ".join(text.split())


def _screen_payload_with_model_armor(payload: Any, *, stage: str) -> dict[str, Any]:
    for text in _walk_strings(payload):
        result = screen_model_text(text, stage=stage)
        if result["blocked"]:
            return result
    return {
        "provider": "disabled",
        "mode": "off",
        "stage": stage,
        "blocked": False,
        "findings": [],
    }


def _redact_blocked_snapshot(snapshot: dict[str, Any] | None) -> dict[str, Any]:
    redacted: dict[str, Any] = {}
    for key, value in (snapshot or {}).items():
        if isinstance(value, str):
            redacted[key] = redact_pii(value, context="standard").redacted_text
        elif isinstance(value, list):
            redacted[key] = [
                redact_pii(item, context="standard").redacted_text
                if isinstance(item, str)
                else item
                for item in value
            ]
        else:
            redacted[key] = value
    return redacted


def _blocked_chat_defaults(snapshot: dict[str, Any] | None) -> dict[str, Any]:
    templates = validate_a2ui_templates(
        [
            {
                "id": "blocked-privacy-boundary",
                "type": "privacy_notice",
                "title": "Privacy Boundary",
                "tone": "warning",
                "body": "Remove sensitive identifiers before continuing.",
                "items": [
                    {
                        "label": "Safe details",
                        "value": "City/county/ZIP, general household size, broad income range, and benefit needs.",
                    }
                ],
                "actions": [],
                "citations": [],
            }
        ]
    )
    return {
        "snapshot": _redact_blocked_snapshot(snapshot),
        "snapshot_patch": {},
        "next_questions": [
            "Share only city/county/ZIP, general household size, broad income range, and benefit needs."
        ],
        "ui_templates": templates,
        "a2ui": {
            "mime_type": "application/json+a2ui",
            "validated": True,
            "template_count": len(templates),
        },
    }


def _privacy_block_response(
    scan: dict[str, Any], *, snapshot: dict[str, Any] | None = None
) -> dict[str, Any]:
    return {
        "route": "privacy_block",
        "message": "Sensitive values were detected. Do not upload SSNs, credentials, case numbers, payment cards, real documents, or exact shelter/safety locations.",
        "redaction": _scan_public_fields(scan),
        "events": ["consent_privacy"],
        **_blocked_chat_defaults(snapshot),
    }


def _model_armor_block_response(
    model_armor: dict[str, Any], *, snapshot: dict[str, Any] | None = None
) -> dict[str, Any]:
    return {
        "route": "safety_block",
        "message": "This request was blocked by configured safety guardrails. I can still help with source-backed benefits preparation if you rephrase without unsafe instructions.",
        "events": ["model_armor_screen"],
        "model_armor": {
            "provider": model_armor["provider"],
            "mode": model_armor["mode"],
            "stage": model_armor["stage"],
            "blocked": model_armor["blocked"],
            "code": model_armor.get("code", "MODEL_ARMOR_BLOCKED"),
            "findings": model_armor["findings"],
        },
        **_blocked_chat_defaults(snapshot),
    }


def _merge_counts(first: dict[str, int], second: object) -> dict[str, int]:
    merged = dict(first)
    if not isinstance(second, dict):
        return merged
    for key, value in second.items():
        if isinstance(key, str) and isinstance(value, int):
            merged[key] = merged.get(key, 0) + value
    return dict(sorted(merged.items()))


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
