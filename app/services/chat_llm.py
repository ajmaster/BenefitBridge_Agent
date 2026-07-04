"""LLM-backed chat answer synthesis around deterministic BenefitBridge state."""

from __future__ import annotations

import json
import os
from collections.abc import Generator
from typing import Any, Protocol

from google.genai import types

from app.callbacks import sanitize_model_response_text
from app.config import GEMINI_MODEL
from app.services.chat_workflow import run_chat_workflow

BLOCKED_ROUTES = {"privacy_block", "crisis_handoff", "dv_safety_handoff"}
COMPACT_CHAT_TEMPLATE_TYPES = {
    "fact_summary",
    "question_set",
    "benefit_paths",
    "local_resources",
    "source_links",
    "privacy_notice",
    "safety_handoff",
    "route_status",
    "voice_status",
}


class ChatLlmProvider(Protocol):
    """Minimal provider contract used by tests and the ADK adapter."""

    model_name: str

    def generate(
        self,
        *,
        messages: list[dict[str, str]],
        snapshot: dict[str, Any],
        deterministic_result: dict[str, Any],
    ) -> str: ...

    def generate_stream(
        self,
        *,
        messages: list[dict[str, str]],
        snapshot: dict[str, Any],
        deterministic_result: dict[str, Any],
    ) -> Generator[str, None, None]: ...


_CHAT_LLM_PROVIDER: ChatLlmProvider | None = None


def set_chat_llm_provider(provider: ChatLlmProvider | None) -> None:
    """Override chat answer synthesis for tests or explicit runtime wiring."""

    global _CHAT_LLM_PROVIDER
    _CHAT_LLM_PROVIDER = provider


def reset_chat_llm_provider() -> None:
    """Clear the injected chat provider."""

    set_chat_llm_provider(None)


def run_llm_first_chat_workflow(
    messages: list[dict[str, str]], snapshot: dict[str, Any]
) -> dict[str, Any]:
    """Run deterministic safety/source logic, then synthesize the safe reply."""

    result = run_chat_workflow(messages, snapshot)
    if result.get("route") in BLOCKED_ROUTES:
        return _with_diagnostics(
            compact_chat_templates(result),
            response_mode="deterministic_block",
            llm_invoked=False,
            model_name=None,
            fallback_reason=None,
            fallback_code=None,
        )

    provider = active_provider()
    if provider is None:
        return _with_diagnostics(
            compact_chat_templates(result),
            response_mode="deterministic_fallback",
            llm_invoked=False,
            model_name=GEMINI_MODEL,
            fallback_reason="Gemini chat synthesis is not configured for this local run.",
            fallback_code="llm_disabled",
        )

    try:
        raw_text = provider.generate(
            messages=messages,
            snapshot=snapshot,
            deterministic_result=result,
        )
    except Exception as exc:
        return _with_diagnostics(
            compact_chat_templates(result),
            response_mode="deterministic_fallback",
            llm_invoked=True,
            model_name=provider.model_name,
            fallback_reason=str(exc) or exc.__class__.__name__,
            fallback_code=fallback_code_for_error(exc),
        )

    result["message"] = _concise(sanitize_model_response_text(raw_text))
    return _with_diagnostics(
        compact_chat_templates(result),
        response_mode="llm",
        llm_invoked=True,
        model_name=provider.model_name,
        fallback_reason=None,
        fallback_code=None,
    )


def compact_chat_templates(result: dict[str, Any]) -> dict[str, Any]:
    """Keep chat support cards focused; full document cards live in workspace tabs."""

    templates = [
        template
        for template in result.get("ui_templates", [])
        if template.get("type") in COMPACT_CHAT_TEMPLATE_TYPES
    ]
    result["ui_templates"] = templates
    if "a2ui" in result and isinstance(result["a2ui"], dict):
        result["a2ui"]["template_count"] = len(templates)
    return result


def active_provider() -> ChatLlmProvider | None:
    if _CHAT_LLM_PROVIDER is not None:
        return _CHAT_LLM_PROVIDER
    if not _gemini_configured():
        return None
    return _AdkChatLlmProvider()


def chat_llm_status() -> dict[str, Any]:
    """Return non-secret runtime status for the chat LLM provider."""

    enabled = os.getenv("ENABLE_LLM_CHAT", "true").lower() != "false"
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
    configured = _gemini_configured()
    injected = _CHAT_LLM_PROVIDER is not None
    provider_name = None
    model_name = None
    if injected:
        provider_name = type(_CHAT_LLM_PROVIDER).__name__
        model_name = _CHAT_LLM_PROVIDER.model_name
    elif configured:
        provider_name = "_AdkChatLlmProvider"
        model_name = GEMINI_MODEL

    return {
        "enabled": enabled,
        "configured": configured,
        "provider": provider_name,
        "model_name": model_name or GEMINI_MODEL,
        "mode": "vertex_ai" if use_vertex else "api_key_or_adc",
        "live_smoke": "skipped",
        "fallback_code": None if configured else "llm_disabled",
    }


def _gemini_configured() -> bool:
    if os.getenv("ENABLE_LLM_CHAT", "true").lower() == "false":
        return False
    if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true":
        return bool(os.getenv("GOOGLE_CLOUD_PROJECT"))
    return bool(
        os.getenv("GOOGLE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_CLOUD_PROJECT")
    )


def fallback_code_for_error(exc: BaseException) -> str:
    text = f"{exc.__class__.__name__} {exc}".lower()
    quota_markers = ("resource_exhausted", "quota", "429")
    if any(marker in text for marker in quota_markers):
        return "quota_exceeded"
    return "provider_error"


class _AdkChatLlmProvider:
    model_name = GEMINI_MODEL

    def generate(
        self,
        *,
        messages: list[dict[str, str]],
        snapshot: dict[str, Any],
        deterministic_result: dict[str, Any],
    ) -> str:
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService

        from app.agent import root_agent

        prompt = _build_prompt(messages, snapshot, deterministic_result)
        session_service = InMemorySessionService()
        session = session_service.create_session_sync(
            user_id="public_chat", app_name="aidatlasca"
        )
        runner = Runner(
            agent=root_agent, session_service=session_service, app_name="aidatlasca"
        )
        content = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
        chunks: list[str] = []
        for event in runner.run(
            new_message=content,
            user_id="public_chat",
            session_id=session.id,
        ):
            if event.content and event.content.parts:
                chunks.extend(part.text for part in event.content.parts if part.text)
        text = "\n".join(chunk.strip() for chunk in chunks if chunk.strip()).strip()
        if not text:
            raise RuntimeError("Gemini returned no text.")
        return text

    def generate_stream(
        self,
        *,
        messages: list[dict[str, str]],
        snapshot: dict[str, Any],
        deterministic_result: dict[str, Any],
    ) -> Generator[str, None, None]:
        from google.adk.runners import Runner
        from google.adk.sessions import InMemorySessionService

        from app.agent import root_agent

        prompt = _build_prompt(messages, snapshot, deterministic_result)
        session_service = InMemorySessionService()
        session = session_service.create_session_sync(
            user_id="public_chat", app_name="aidatlasca"
        )
        runner = Runner(
            agent=root_agent, session_service=session_service, app_name="aidatlasca"
        )
        content = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
        for event in runner.run(
            new_message=content,
            user_id="public_chat",
            session_id=session.id,
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        yield part.text


def _build_prompt(
    messages: list[dict[str, str]],
    snapshot: dict[str, Any],
    deterministic_result: dict[str, Any],
) -> str:
    context = _deterministic_context(deterministic_result)
    return (
        "You are AidAtlasCA, a California benefits preparation and handoff assistant.\n"
        "Answer the latest user turn naturally in 2-5 concise sentences. "
        "Acknowledge the user's stated city/county/ZIP and help areas when they are safe to mention.\n"
        "Use the deterministic context below only as grounding data for benefits facts, "
        "routes, sources, local resources, missing facts, and next actions. Do not copy "
        "workflow fallback wording or sound like a template.\n"
        "Do not decide eligibility, estimate amounts, submit applications, ask for "
        "SSNs/case numbers/credentials/birthdates/exact addresses, or claim live "
        "availability.\n"
        "Mention official agencies decide eligibility/current rules when discussing "
        "benefits, and include call-before-going for local resources.\n\n"
        f"Messages: {_safe_json(messages)}\n\n"
        f"Snapshot: {_safe_json(snapshot)}\n\n"
        f"Deterministic context: {_safe_json(context)}"
    )


def _deterministic_context(result: dict[str, Any]) -> dict[str, Any]:
    packet = result.get("packet") or {}
    return {
        "route": result.get("route"),
        "events": result.get("events", []),
        "next_questions": result.get("next_questions", []),
        "snapshot": result.get("snapshot", {}),
        "benefit_paths": [
            {
                "program_name": path.get("program_name"),
                "status_label": path.get("status_label"),
                "why_this_is_relevant": path.get("why_this_is_relevant", [])[:2],
                "missing_facts": path.get("missing_facts", [])[:3],
                "source_citations": path.get("source_citations", [])[:2],
            }
            for path in packet.get("potential_benefit_paths", [])[:4]
        ],
        "resources": [
            {
                "organization": resource.get("organization"),
                "service_name": resource.get("service_name"),
                "jurisdiction": resource.get("jurisdiction"),
                "coverage_level": resource.get("coverage_level"),
                "availability_notice": resource.get("availability_notice"),
            }
            for resource in result.get("resources", [])[:5]
        ],
        "source_citations": packet.get("source_citations", [])[:8],
        "packet_summary": packet.get("household_snapshot_summary"),
    }


def _safe_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=True, sort_keys=True, default=str)[:12000]


def _concise(text: str) -> str:
    paragraphs = [part.strip() for part in text.splitlines() if part.strip()]
    if not paragraphs:
        return text.strip()
    return "\n\n".join(paragraphs[:2]).strip()


def _with_diagnostics(
    result: dict[str, Any],
    *,
    response_mode: str,
    llm_invoked: bool,
    model_name: str | None,
    fallback_reason: str | None,
    fallback_code: str | None = None,
) -> dict[str, Any]:
    graph_events = [str(event) for event in result.get("events", [])]
    diagnostics = {
        "response_mode": response_mode,
        "llm_invoked": llm_invoked,
        "model_name": model_name,
        "fallback_reason": fallback_reason,
        "fallback_code": fallback_code,
        "graph_events": graph_events,
    }
    result.update(diagnostics)
    result["diagnostics"] = diagnostics
    return result
