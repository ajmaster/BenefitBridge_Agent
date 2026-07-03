"""Validated A2UI template contract for BenefitBridge responses."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator

A2UI_MIME_TYPE = "application/json+a2ui"

ALLOWED_A2UI_TEMPLATE_TYPES: set[str] = {
    "progress",
    "fact_summary",
    "question_set",
    "benefit_paths",
    "resource_cards",
    "local_resources",
    "source_sheet",
    "source_links",
    "packet_summary",
    "document_checklist",
    "document_kit",
    "document_summary",
    "caseworker_questions",
    "call_script",
    "local_handoff_sheet",
    "privacy_notice",
    "safety_handoff",
    "route_status",
    "voice_status",
}

ALLOWED_A2UI_ACTION_TYPES: set[str] = {
    "open_packet",
    "open_sources",
    "open_resources",
    "copy_call_script",
    "download_markdown",
    "download_calendar",
    "open_resource_url",
    "open_maps_search",
}

ALLOWED_A2UI_TONES = {
    "neutral",
    "info",
    "success",
    "warning",
    "danger",
    "accent",
    "source",
}


class A2UILink(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str = Field(..., min_length=1, max_length=120)
    href: str = Field(..., min_length=1, max_length=1000)


class A2UIAction(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str = Field(..., min_length=1, max_length=80)
    label: str = Field(..., min_length=1, max_length=120)
    href: str | None = Field(default=None, max_length=1000)
    target: str | None = Field(default=None, max_length=120)

    @field_validator("type")
    @classmethod
    def _allowed_action_type(cls, value: str) -> str:
        if value not in ALLOWED_A2UI_ACTION_TYPES:
            raise ValueError(f"Unsupported A2UI action type: {value}")
        return value


class A2UICitation(BaseModel):
    model_config = ConfigDict(extra="allow")

    source_id: str = Field(..., min_length=1, max_length=160)
    source_title: str | None = Field(default=None, max_length=240)
    agency_owner: str | None = Field(default=None, max_length=240)
    source_type: str | None = Field(default=None, max_length=160)
    url: str | None = Field(default=None, max_length=1000)
    last_checked: str | None = Field(default=None, max_length=40)
    freshness_state: str | None = Field(default=None, max_length=80)


class A2UIItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str | None = Field(default=None, max_length=120)
    value: str | None = Field(default=None, max_length=1000)
    title: str | None = Field(default=None, max_length=180)
    subtitle: str | None = Field(default=None, max_length=240)
    body: str | None = Field(default=None, max_length=2000)
    badges: list[str] = Field(default_factory=list, max_length=12)
    links: list[A2UILink] = Field(default_factory=list, max_length=8)


class A2UITemplate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(..., min_length=1, max_length=120)
    type: str = Field(..., min_length=1, max_length=80)
    title: str = Field(..., min_length=1, max_length=180)
    tone: Literal["neutral", "info", "success", "warning", "danger", "accent", "source"]
    subtitle: str | None = Field(default=None, max_length=240)
    body: str | None = Field(default=None, max_length=4000)
    items: list[A2UIItem] = Field(default_factory=list, max_length=40)
    actions: list[A2UIAction] = Field(default_factory=list, max_length=12)
    citations: list[A2UICitation] = Field(default_factory=list, max_length=20)

    @field_validator("type")
    @classmethod
    def _allowed_template_type(cls, value: str) -> str:
        if value not in ALLOWED_A2UI_TEMPLATE_TYPES:
            raise ValueError(f"Unsupported A2UI template type: {value}")
        return value


def a2ui_action(
    action_type: str,
    label: str,
    *,
    href: str | None = None,
    target: str | None = None,
) -> dict[str, str]:
    """Build an allowlisted A2UI action dictionary."""

    action = A2UIAction(type=action_type, label=label, href=href, target=target)
    return action.model_dump(exclude_none=True)


def validate_a2ui_templates(templates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Validate and normalize A2UI templates before returning them to clients."""

    normalized = []
    for template in templates:
        try:
            normalized.append(A2UITemplate.model_validate(template).model_dump())
        except ValidationError as exc:
            messages = "; ".join(error["msg"] for error in exc.errors())
            raise ValueError(messages) from exc
    return normalized


def a2ui_readiness_summary() -> dict[str, Any]:
    """Expose the A2UI contract surface for readiness checks."""

    return {
        "valid": True,
        "mime_type": A2UI_MIME_TYPE,
        "template_types": sorted(ALLOWED_A2UI_TEMPLATE_TYPES),
        "action_types": sorted(ALLOWED_A2UI_ACTION_TYPES),
        "server_validation": "pydantic",
    }
