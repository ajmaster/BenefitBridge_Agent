"""Google Cloud integration readiness and deterministic fallbacks."""

from __future__ import annotations

import importlib.util
import json
import os
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any, Protocol

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


class DlpProvider(Protocol):
    def inspect_text(self, text: str, *, context: str) -> dict[str, object]: ...


class ModelArmorProvider(Protocol):
    def screen_text(self, text: str, *, stage: str) -> dict[str, object]: ...


class MapsPlacesProvider(Protocol):
    def enrich_place(
        self,
        *,
        query: str,
        jurisdiction: str | None = None,
        language: str = "en",
    ) -> dict[str, object]: ...


_DLP_PROVIDER: DlpProvider | None = None
_MODEL_ARMOR_PROVIDER: ModelArmorProvider | None = None
_MAPS_PLACES_PROVIDER: MapsPlacesProvider | None = None

_GOOGLE_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json"
_GOOGLE_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
_GOOGLE_TEXT_SEARCH_FIELD_MASKS = {
    # No-charge/unlimited IDs-only tier per the Google Maps pricing table.
    "ids_only": ("places.id", "places.name"),
    # Text Search Pro free usage cap tier: useful for visual handoff links without
    # pulling phone, website, ratings, hours, reviews, or live availability fields.
    "pro": (
        "places.id",
        "places.name",
        "places.displayName",
        "places.businessStatus",
        "places.googleMapsUri",
    ),
    # Optional richer free-cap tier. Keep it opt-in because these fields bill at
    # higher SKUs if traffic exceeds the current free usage cap.
    "enterprise": (
        "places.id",
        "places.name",
        "places.displayName",
        "places.businessStatus",
        "places.googleMapsUri",
        "places.nationalPhoneNumber",
        "places.websiteUri",
        "places.rating",
    ),
}
_MAPS_AVAILABILITY_NOTICE = "Google Places details may change. Call before going."
_SPECIFIC_GEOCODE_TYPES = {"street_address", "premise", "subpremise"}


def google_integration_status() -> list[dict[str, Any]]:
    """Return non-secret readiness for Google-backed integrations."""

    project = bool(os.getenv("GOOGLE_CLOUD_PROJECT"))
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
    dlp_mode = _dlp_mode()
    model_armor_mode = _model_armor_mode()

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
            enabled=dlp_mode != "off",
            available=project and _module_exists("google.cloud.dlp_v2"),
            mode=f"{dlp_mode}_with_regex_fallback",
            notes=[
                "Regex policy remains the deterministic fallback.",
                "Only finding types/counts and block decisions are recorded.",
            ],
        ),
        IntegrationStatus(
            name="model_armor",
            enabled=model_armor_mode != "off",
            available=bool(os.getenv("MODEL_ARMOR_TEMPLATE_NAME")),
            mode=f"{model_armor_mode}_prompt_response_screening",
            notes=[
                "Use local source-grounding and privacy policy fallback when disabled."
            ],
        ),
        IntegrationStatus(
            name="speech_to_text",
            enabled=_env_enabled("ENABLE_VOICE"),
            available=project and _module_exists("google.cloud.speech"),
            mode="cascaded_transcript_feeds_existing_chat_workflow",
            notes=[
                "Transcript is screened by the same redaction/safety path as /api/chat."
            ],
        ),
        IntegrationStatus(
            name="text_to_speech",
            enabled=_env_enabled("ENABLE_VOICE"),
            available=project and _module_exists("google.cloud.texttospeech"),
            mode="reply_audio_only_text_stays_source_of_truth",
            notes=["Synthesis failure still returns the text reply."],
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
            name="cloud_storage_artifacts",
            enabled=_env_enabled("ENABLE_CLOUD_STORAGE_ARTIFACTS"),
            available=project and _module_exists("google.cloud.storage"),
            mode="explicit_non_sensitive_artifacts_only",
            notes=["Default packet exports stay browser/session-local."],
        ),
    ]
    return [status.to_dict() for status in statuses]


def set_dlp_provider(provider: DlpProvider | None) -> None:
    """Override the DLP provider for tests or explicit runtime wiring."""

    global _DLP_PROVIDER
    _DLP_PROVIDER = provider


def set_model_armor_provider(provider: ModelArmorProvider | None) -> None:
    """Override the Model Armor provider for tests or explicit runtime wiring."""

    global _MODEL_ARMOR_PROVIDER
    _MODEL_ARMOR_PROVIDER = provider


def set_maps_places_provider(provider: MapsPlacesProvider | None) -> None:
    """Override the Maps/Places provider for tests or explicit runtime wiring."""

    global _MAPS_PLACES_PROVIDER
    _MAPS_PLACES_PROVIDER = provider


def reset_integration_providers() -> None:
    """Clear test/runtime provider overrides."""

    set_dlp_provider(None)
    set_model_armor_provider(None)
    set_maps_places_provider(None)


def detect_sensitive_text(text: str, *, context: str = "standard") -> dict[str, Any]:
    """Return PII findings with local regex default and optional DLP hardening."""

    redaction = redact_pii(text, context=context)
    findings = set(redaction.findings)
    finding_counts = _finding_counts(redaction.findings)
    result: dict[str, Any] = {
        "provider": "local_regex",
        "findings": sorted(findings),
        "finding_counts": finding_counts,
        "blocked": redaction.blocked,
        "redacted_text": redaction.redacted_text,
    }
    mode = _dlp_mode()
    if mode == "off":
        return result

    provider = _get_dlp_provider()
    result["provider"] = f"google_dlp_{mode}_configured_with_local_fallback"
    if provider is None:
        result["notes"] = [
            "Cloud DLP is enabled but no provider is available; local fallback returned."
        ]
        return result

    try:
        dlp_result = provider.inspect_text(text, context=context)
    except Exception as exc:  # pragma: no cover - defensive fallback
        result["notes"] = [f"Cloud DLP failed; local fallback returned: {exc}"]
        return result

    cloud_findings = _normalize_findings(dlp_result.get("findings", []))
    findings.update(cloud_findings)
    cloud_counts = _normalize_finding_counts(
        dlp_result.get("finding_counts"), cloud_findings
    )
    finding_counts = _merge_counts(finding_counts, cloud_counts)
    result.update(
        {
            "provider": f"google_dlp_{mode}_with_local_fallback",
            "findings": sorted(findings),
            "finding_counts": finding_counts,
        }
    )
    if mode == "block" and cloud_findings:
        result["blocked"] = True
        result["redacted_text"] = "[REDACTED_BY_DLP]"
    return result


def screen_model_text(text: str, *, stage: str) -> dict[str, Any]:
    """Screen model-bound or model-produced text with optional Model Armor."""

    mode = _model_armor_mode()
    if mode == "off" or not text:
        return {
            "provider": "disabled",
            "mode": "off",
            "stage": stage,
            "blocked": False,
            "findings": [],
        }

    provider = _get_model_armor_provider()
    if provider is None:
        return {
            "provider": "model_armor_configured_without_provider",
            "mode": mode,
            "stage": stage,
            "blocked": False,
            "findings": [],
            "warning": "not_available",
        }

    decision = provider.screen_text(text, stage=stage)
    findings = _normalize_findings(decision.get("findings", []))
    provider_blocked = bool(decision.get("blocked", False))
    blocked = mode == "block" and provider_blocked
    result: dict[str, Any] = {
        "provider": f"model_armor_{mode}",
        "mode": mode,
        "stage": stage,
        "blocked": blocked,
        "findings": findings,
    }
    if blocked:
        result["code"] = "MODEL_ARMOR_BLOCKED"
    return result


def maps_place_enrichment(
    *, query: str, jurisdiction: str | None = None, language: str = "en"
) -> dict[str, Any]:
    """Return sanitized optional Google Places enrichment for a curated query."""

    if not _env_enabled("ENABLE_GOOGLE_MAPS") or not query:
        return {"provider": "disabled", "live": False}

    provider = _get_maps_places_provider()
    if provider is None:
        return {
            "provider": "google_places_configured_without_provider",
            "live": False,
            "warning": "not_available",
        }

    try:
        raw = _provider_enrich_place(
            provider,
            query=query,
            jurisdiction=jurisdiction,
            language=language,
        )
    except Exception as exc:  # pragma: no cover - defensive live API fallback
        return {
            "provider": "google_places",
            "live": False,
            "warning": "api_unavailable",
            "message": str(exc),
            "availability_notice": _MAPS_AVAILABILITY_NOTICE,
        }

    business_status = _first_present(raw, "business_status", "businessStatus")
    if business_status and business_status != "OPERATIONAL":
        return {
            "provider": "google_places",
            "live": False,
            "warning": "not_operational_filtered",
            "availability_notice": _MAPS_AVAILABILITY_NOTICE,
        }

    allowed_keys = {
        "display_name",
        "google_maps_uri",
        "national_phone_number",
        "place_id",
        "rating",
        "website_uri",
    }
    enrichment = {
        key: value
        for key, value in raw.items()
        if key in allowed_keys and value not in (None, "")
    }
    enrichment.update(_camel_case_place_fields(raw))
    return {
        "provider": "google_places",
        "live": True,
        "field_tier": _maps_places_field_tier(),
        **enrichment,
        "availability_notice": _MAPS_AVAILABILITY_NOTICE,
    }


def maps_geocode_location(location_text: str) -> dict[str, Any]:
    """Return coarse Google Geocoding output without exact address details."""

    if not _env_enabled("ENABLE_GOOGLE_MAPS") or not location_text:
        return {"provider": "disabled", "live": False}

    provider = _get_maps_places_provider()
    geocode = getattr(provider, "geocode_location", None) if provider else None
    if not callable(geocode):
        return {
            "provider": "google_geocoding_configured_without_provider",
            "live": False,
            "warning": "not_available",
        }

    try:
        raw = geocode(location_text)
    except Exception as exc:  # pragma: no cover - defensive live API fallback
        return {
            "provider": "google_geocoding",
            "live": False,
            "warning": "api_unavailable",
            "message": str(exc),
        }

    return _coarse_geocode_result(raw)


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


def _dlp_mode() -> str:
    if not _env_enabled("ENABLE_GOOGLE_DLP"):
        return "off"
    mode = os.getenv("DLP_MODE", "audit").lower()
    return mode if mode in {"audit", "block", "off"} else "audit"


def _model_armor_mode() -> str:
    if not _env_enabled("ENABLE_MODEL_ARMOR"):
        return "off"
    mode = os.getenv("MODEL_ARMOR_MODE", "block").lower()
    return mode if mode in {"audit", "block", "off"} else "block"


def _get_dlp_provider() -> DlpProvider | None:
    if _DLP_PROVIDER is not None:
        return _DLP_PROVIDER
    if not bool(os.getenv("GOOGLE_CLOUD_PROJECT")):
        return None
    if not _module_exists("google.cloud.dlp_v2"):
        return None
    return _GoogleDlpProvider()


def _get_model_armor_provider() -> ModelArmorProvider | None:
    return _MODEL_ARMOR_PROVIDER


def _get_maps_places_provider() -> MapsPlacesProvider | None:
    if _MAPS_PLACES_PROVIDER is not None:
        return _MAPS_PLACES_PROVIDER
    api_key = _maps_api_key()
    if not api_key:
        return None
    return _GoogleMapsPlacesProvider(api_key)


def _finding_counts(findings: list[str]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for finding in _normalize_findings(findings):
        counts[finding] = counts.get(finding, 0) + 1
    return dict(sorted(counts.items()))


def _normalize_findings(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    findings: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        normalized = item.strip().lower()
        if normalized:
            findings.append(normalized)
    return sorted(set(findings))


def _normalize_finding_counts(
    counts: object, fallback_findings: list[str]
) -> dict[str, int]:
    if not isinstance(counts, dict):
        return _finding_counts(fallback_findings)
    normalized: dict[str, int] = {}
    for key, value in counts.items():
        if not isinstance(key, str) or not isinstance(value, int):
            continue
        normalized_key = key.strip().lower()
        if normalized_key:
            normalized[normalized_key] = normalized.get(normalized_key, 0) + value
    return dict(sorted(normalized.items())) or _finding_counts(fallback_findings)


def _merge_counts(
    first: dict[str, int], second: dict[str, int] | object
) -> dict[str, int]:
    merged = dict(first)
    if not isinstance(second, dict):
        return dict(sorted(merged.items()))
    for key, value in second.items():
        if isinstance(key, str) and isinstance(value, int):
            merged[key] = merged.get(key, 0) + value
    return dict(sorted(merged.items()))


def _walk_strings(value: object) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        strings: list[str] = []
        for item in value.values():
            strings.extend(_walk_strings(item))
        return strings
    if isinstance(value, (list, tuple, set)):
        strings = []
        for item in value:
            strings.extend(_walk_strings(item))
        return strings
    return []


def _maps_api_key() -> str | None:
    direct = os.getenv("GOOGLE_MAPS_API_KEY")
    if direct:
        return direct

    secret_name = os.getenv("GOOGLE_MAPS_API_KEY_SECRET")
    if not secret_name:
        return None
    if not _module_exists("google.cloud.secretmanager"):
        return None

    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not secret_name.startswith("projects/"):
        if not project:
            return None
        secret_name = f"projects/{project}/secrets/{secret_name}/versions/latest"

    try:
        from google.cloud import secretmanager

        client = secretmanager.SecretManagerServiceClient()
        response = client.access_secret_version(request={"name": secret_name})
    except Exception:
        return None
    return response.payload.data.decode("utf-8").strip()


def _maps_places_field_tier() -> str:
    tier = os.getenv("GOOGLE_MAPS_PLACES_FIELD_TIER", "pro").strip().lower()
    if tier not in _GOOGLE_TEXT_SEARCH_FIELD_MASKS:
        return "pro"
    return tier


def _google_text_search_field_mask() -> str:
    return ",".join(_GOOGLE_TEXT_SEARCH_FIELD_MASKS[_maps_places_field_tier()])


def _maps_language_code(language: str) -> str:
    return "es" if language.lower().startswith("es") else "en"


def _provider_enrich_place(
    provider: MapsPlacesProvider,
    *,
    query: str,
    jurisdiction: str | None,
    language: str,
) -> dict[str, object]:
    try:
        return provider.enrich_place(
            query=query,
            jurisdiction=jurisdiction,
            language=_maps_language_code(language),
        )
    except TypeError:
        # Compatibility with older test doubles and runtime providers.
        return provider.enrich_place(query=query, jurisdiction=jurisdiction)


def _first_present(value: dict[str, object], *keys: str) -> object | None:
    for key in keys:
        item = value.get(key)
        if item not in (None, ""):
            return item
    return None


def _camel_case_place_fields(raw: dict[str, object]) -> dict[str, object]:
    display_name = raw.get("displayName")
    if isinstance(display_name, dict):
        display_name = display_name.get("text")

    mapped = {
        "place_id": raw.get("id"),
        "display_name": display_name,
        "google_maps_uri": raw.get("googleMapsUri"),
        "national_phone_number": raw.get("nationalPhoneNumber"),
        "website_uri": raw.get("websiteUri"),
        "rating": raw.get("rating"),
    }
    return {key: value for key, value in mapped.items() if value not in (None, "")}


def _coarse_geocode_result(raw: dict[str, object]) -> dict[str, Any]:
    if "results" not in raw:
        return {
            "provider": raw.get("provider", "google_geocoding"),
            "live": True,
            "status": raw.get("status", "OK"),
            "types": list(raw.get("types", []))
            if isinstance(raw.get("types"), list)
            else [],
            "state": raw.get("state"),
            "county": raw.get("county"),
            "city": raw.get("city"),
            "zip_code": raw.get("zip_code"),
            "specific_location_discarded": bool(
                raw.get("specific_location_discarded", False)
            ),
            "confidence": raw.get("confidence", 0.92),
        }

    status = str(raw.get("status", "UNKNOWN"))
    results = raw.get("results")
    if status != "OK" or not isinstance(results, list) or not results:
        return {
            "provider": "google_geocoding",
            "live": False,
            "status": status,
            "warning": "no_match",
        }

    first = results[0]
    if not isinstance(first, dict):
        return {
            "provider": "google_geocoding",
            "live": False,
            "status": status,
            "warning": "invalid_response",
        }

    components = first.get("address_components")
    if not isinstance(components, list):
        components = []
    result_types = first.get("types")
    types = (
        [str(item) for item in result_types] if isinstance(result_types, list) else []
    )
    return {
        "provider": "google_geocoding",
        "live": True,
        "status": status,
        "types": types,
        "state": _address_component(
            components, "administrative_area_level_1", short=True
        ),
        "county": _address_component(components, "administrative_area_level_2"),
        "city": _address_component(components, "locality")
        or _address_component(components, "postal_town")
        or _address_component(components, "sublocality"),
        "zip_code": _address_component(components, "postal_code", short=True),
        "specific_location_discarded": bool(
            _SPECIFIC_GEOCODE_TYPES.intersection(types)
        ),
        "confidence": 0.92 if not _SPECIFIC_GEOCODE_TYPES.intersection(types) else 0.88,
    }


def _address_component(
    components: list[object], component_type: str, *, short: bool = False
) -> str | None:
    key = "short_name" if short else "long_name"
    for component in components:
        if not isinstance(component, dict):
            continue
        types = component.get("types")
        if isinstance(types, list) and component_type in types:
            value = component.get(key) or component.get("long_name")
            return str(value) if value else None
    return None


class _GoogleMapsPlacesProvider:
    """Live Google Geocoding and Places adapter with minimal field requests."""

    def __init__(self, api_key: str, *, timeout: float = 2.5) -> None:
        self._api_key = api_key
        self._timeout = timeout

    def geocode_location(self, location_text: str) -> dict[str, object]:
        params = urllib.parse.urlencode(
            {
                "address": location_text,
                "components": "administrative_area:CA|country:US",
                "region": "us",
                "key": self._api_key,
            }
        )
        request = urllib.request.Request(f"{_GOOGLE_GEOCODING_URL}?{params}")
        return self._request_json(request)

    def enrich_place(
        self,
        *,
        query: str,
        jurisdiction: str | None = None,
        language: str = "en",
    ) -> dict[str, object]:
        text_query = _places_text_query(query, jurisdiction)
        body = json.dumps(
            {
                "textQuery": text_query,
                "pageSize": 3,
                "regionCode": "US",
                "languageCode": _maps_language_code(language),
            }
        ).encode("utf-8")
        request = urllib.request.Request(
            _GOOGLE_TEXT_SEARCH_URL,
            data=body,
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": self._api_key,
                "X-Goog-FieldMask": _google_text_search_field_mask(),
            },
            method="POST",
        )
        response = self._request_json(request)
        places = response.get("places")
        if not isinstance(places, list):
            return {}
        for place in places:
            if not isinstance(place, dict):
                continue
            if place.get("businessStatus") == "OPERATIONAL":
                return place
        if _maps_places_field_tier() == "ids_only":
            first = places[0]
            return first if isinstance(first, dict) else {}
        return {"business_status": "NO_OPERATIONAL_RESULT"}

    def _request_json(self, request: urllib.request.Request) -> dict[str, object]:
        with urllib.request.urlopen(request, timeout=self._timeout) as response:
            raw = response.read().decode("utf-8")
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}


def _places_text_query(query: str, jurisdiction: str | None) -> str:
    clean_query = " ".join(query.split())
    clean_jurisdiction = " ".join((jurisdiction or "").split())
    if not clean_jurisdiction:
        return clean_query
    if clean_jurisdiction.lower() in clean_query.lower():
        return clean_query
    return f"{clean_query} {clean_jurisdiction}"


class _GoogleDlpProvider:
    """Small live DLP adapter; local regex remains authoritative fallback."""

    _INFO_TYPES = (
        "CREDIT_CARD_NUMBER",
        "DATE_OF_BIRTH",
        "EMAIL_ADDRESS",
        "IP_ADDRESS",
        "PHONE_NUMBER",
        "STREET_ADDRESS",
        "US_SOCIAL_SECURITY_NUMBER",
    )

    def inspect_text(self, text: str, *, context: str) -> dict[str, object]:
        del context
        from google.cloud import dlp_v2

        project = os.getenv("GOOGLE_CLOUD_PROJECT")
        location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
        parent = f"projects/{project}/locations/{location}"
        client = dlp_v2.DlpServiceClient()
        response = client.inspect_content(
            request={
                "parent": parent,
                "inspect_config": {
                    "info_types": [{"name": item} for item in self._INFO_TYPES],
                    "include_quote": False,
                    "min_likelihood": dlp_v2.Likelihood.POSSIBLE,
                },
                "item": {"value": text},
            }
        )
        findings = [
            finding.info_type.name
            for finding in response.result.findings
            if finding.info_type and finding.info_type.name
        ]
        return {
            "provider": "google_cloud_dlp",
            "findings": findings,
            "finding_counts": _finding_counts(findings),
        }
