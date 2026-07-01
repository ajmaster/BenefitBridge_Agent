"""Google Cloud integration readiness and deterministic fallbacks."""

from __future__ import annotations

import importlib.util
import os
from dataclasses import asdict, dataclass
from typing import Any

from app.policies.privacy import redact_pii


@dataclass(slots=True)
class IntegrationStatus:
    name: str
    enabled: bool
    available: bool
    mode: str
    notes: list[str]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def google_integration_status() -> list[dict[str, Any]]:
    """Return non-secret readiness for Google-backed integrations."""

    project = bool(os.getenv("GOOGLE_CLOUD_PROJECT"))
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"

    statuses = [
        IntegrationStatus(
            name="vertex_ai_gemini_adk",
            enabled=use_vertex,
            available=project and use_vertex and _module_exists("google.genai"),
            mode="adk_model_runtime" if use_vertex else "local_config_only",
            notes=[
                "ADK model calls are owned by app/agent.py.",
                f"Configured location: {location}.",
            ],
        ),
        IntegrationStatus(
            name="secret_manager",
            enabled=True,
            available=project and _module_exists("google.cloud.secretmanager"),
            mode="deployment_secret_source",
            notes=["Use Cloud Run secret env vars; do not load .env in Cloud Run."],
        ),
        IntegrationStatus(
            name="cloud_translation_advanced",
            enabled=_env_enabled("ENABLE_TRANSLATION"),
            available=project and _module_exists("google.cloud.translate_v3"),
            mode="optional_live_translation_with_template_fallback",
            notes=["MVP accepts reviewed Spanish output only."],
        ),
        IntegrationStatus(
            name="sensitive_data_protection_dlp",
            enabled=_env_enabled("ENABLE_GOOGLE_DLP"),
            available=project and _module_exists("google.cloud.dlp_v2"),
            mode="optional_live_pii_scan_with_regex_fallback",
            notes=["Regex policy remains the deterministic fallback."],
        ),
        IntegrationStatus(
            name="model_armor",
            enabled=_env_enabled("ENABLE_MODEL_ARMOR"),
            available=bool(os.getenv("MODEL_ARMOR_TEMPLATE_NAME")),
            mode="optional_prompt_response_screening",
            notes=[
                "Use local source-grounding and privacy policy fallback when disabled."
            ],
        ),
        IntegrationStatus(
            name="maps_places_geocoding",
            enabled=_env_enabled("ENABLE_GOOGLE_MAPS"),
            available=bool(
                os.getenv("GOOGLE_MAPS_API_KEY_SECRET")
                or os.getenv("GOOGLE_MAPS_API_KEY")
            ),
            mode="resource_enrichment_only",
            notes=[
                "Exact-address and safety-location rules must run before Maps calls."
            ],
        ),
        IntegrationStatus(
            name="firestore_ttl_metadata",
            enabled=_env_enabled("ENABLE_FIRESTORE_TELEMETRY"),
            available=project and _module_exists("google.cloud.firestore"),
            mode="redacted_metadata_only",
            notes=["Never store raw user text or packet contents."],
        ),
        IntegrationStatus(
            name="cloud_storage_artifacts",
            enabled=_env_enabled("ENABLE_CLOUD_STORAGE_ARTIFACTS"),
            available=project and _module_exists("google.cloud.storage"),
            mode="explicit_non_sensitive_artifacts_only",
            notes=["Default packet exports stay browser/session-local."],
        ),
    ]
    return [status.to_dict() for status in statuses]


def detect_sensitive_text(text: str, *, context: str = "standard") -> dict[str, Any]:
    """Return deterministic PII findings, with DLP reserved for enabled deployments."""

    redaction = redact_pii(text, context=context)
    result: dict[str, Any] = {
        "provider": "local_regex",
        "findings": redaction.findings,
        "blocked": redaction.blocked,
        "redacted_text": redaction.redacted_text,
    }
    if not _env_enabled("ENABLE_GOOGLE_DLP"):
        return result

    # The live DLP call is intentionally not made by default. Deployments can wire
    # it here once data-residency, retention, and sampling rules are approved.
    result["provider"] = "google_dlp_configured_with_local_fallback"
    result["notes"] = [
        "Cloud DLP is enabled; local fallback result returned in demo mode."
    ]
    return result


def translation_mode() -> dict[str, Any]:
    """Return current translation integration mode without translating live text."""

    status = next(
        item
        for item in google_integration_status()
        if item["name"] == "cloud_translation_advanced"
    )
    if not status["enabled"]:
        return {"provider": "reviewed_template_fallback", "live": False}
    if status["available"]:
        return {"provider": "cloud_translation_advanced_ready", "live": False}
    return {
        "provider": "reviewed_template_fallback",
        "live": False,
        "warning": "not_available",
    }


def _module_exists(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _env_enabled(name: str) -> bool:
    return os.getenv(name, "false").lower() == "true"
