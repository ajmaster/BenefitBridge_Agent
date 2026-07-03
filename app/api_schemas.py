"""Pydantic request/response models for the public demo API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class HouseholdSnapshotInput(BaseModel):
    """Privacy-minimized household facts accepted by `/api/prepare`."""

    model_config = ConfigDict(extra="forbid")

    language: Literal["en", "es"] = "en"
    location_text: str = Field(default="", max_length=120)
    household_size: int | None = Field(default=None, ge=1, le=20)
    adults: int | None = Field(default=None, ge=0, le=20)
    children_ages: list[int] = Field(default_factory=list, max_length=12)
    needs: list[str] = Field(default_factory=list, max_length=12)
    income_range_monthly: str | None = Field(default=None, max_length=80)
    housing_status: str = Field(default="unknown", max_length=80)
    utilities_need: bool = False
    food_need_today: bool = False
    safety_sensitive: bool = False

    @field_validator("children_ages")
    @classmethod
    def _valid_child_ages(cls, values: list[int]) -> list[int]:
        return [value for value in values if 0 <= value <= 20]

    @field_validator("needs")
    @classmethod
    def _normalize_needs(cls, values: list[str]) -> list[str]:
        return [value.strip()[:80] for value in values if value.strip()]


class PrepareRequest(BaseModel):
    """Primary packet-preparation request."""

    model_config = ConfigDict(extra="forbid")

    user_text: str = Field(default="", max_length=4000)
    snapshot: HouseholdSnapshotInput = Field(default_factory=HouseholdSnapshotInput)


class ChatMessage(BaseModel):
    """Single public-demo chat message."""

    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"] = "user"
    content: str = Field(default="", max_length=4000)


class ChatRequest(BaseModel):
    """Guided conversation request for collecting prep facts."""

    model_config = ConfigDict(extra="forbid")

    messages: list[ChatMessage] = Field(default_factory=list, max_length=24)
    snapshot: HouseholdSnapshotInput = Field(default_factory=HouseholdSnapshotInput)


class A2UILink(BaseModel):
    """Link rendered inside a validated A2UI item."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(..., min_length=1, max_length=120)
    href: str = Field(..., min_length=1, max_length=1000)


class A2UIAction(BaseModel):
    """Allowlisted client action emitted by the agent."""

    model_config = ConfigDict(extra="forbid")

    type: Literal[
        "open_packet",
        "open_sources",
        "open_resources",
        "copy_call_script",
        "download_markdown",
        "download_calendar",
        "open_resource_url",
        "open_maps_search",
    ]
    label: str = Field(..., min_length=1, max_length=120)
    href: str | None = Field(default=None, max_length=1000)
    target: str | None = Field(default=None, max_length=120)


class A2UICitation(BaseModel):
    """Source citation attached to an A2UI card."""

    model_config = ConfigDict(extra="allow")

    source_id: str = Field(..., min_length=1, max_length=160)
    source_title: str | None = None
    agency_owner: str | None = None
    source_type: str | None = None
    url: str | None = None
    last_checked: str | None = None
    freshness_state: str | None = None


class A2UIItem(BaseModel):
    """Single row/card inside an A2UI template."""

    model_config = ConfigDict(extra="forbid")

    label: str | None = None
    value: str | None = None
    title: str | None = None
    subtitle: str | None = None
    body: str | None = None
    badges: list[str] = Field(default_factory=list, max_length=12)
    links: list[A2UILink] = Field(default_factory=list, max_length=8)


class A2UITemplate(BaseModel):
    """Validated `application/json+a2ui` template returned by `/api/chat`."""

    model_config = ConfigDict(extra="forbid")

    id: str
    type: str
    title: str
    tone: Literal["neutral", "info", "success", "warning", "danger", "accent", "source"]
    subtitle: str | None = None
    body: str | None = None
    items: list[A2UIItem] = Field(default_factory=list, max_length=40)
    actions: list[A2UIAction] = Field(default_factory=list, max_length=12)
    citations: list[A2UICitation] = Field(default_factory=list, max_length=20)


class ChatWorkflowResponse(BaseModel):
    """Normalized guided-chat response shape, including blocked safety routes."""

    model_config = ConfigDict(extra="allow")

    route: str
    message: str
    events: list[str] = Field(default_factory=list)
    snapshot: HouseholdSnapshotInput
    snapshot_patch: dict[str, Any] = Field(default_factory=dict)
    next_questions: list[str] = Field(default_factory=list)
    ui_templates: list[A2UITemplate] = Field(default_factory=list)


class VoiceTurnRequest(BaseModel):
    """Voice turn request: base64 WEBM/Opus audio plus existing chat context.

    Audio is carried as base64 JSON (not multipart) to match the rest of this
    API's plain-JSON contract. The clip is expected to be a single short
    utterance, not a continuous stream.
    """

    model_config = ConfigDict(extra="forbid")

    audio_base64: str = Field(..., min_length=1, max_length=4_000_000)
    messages: list[ChatMessage] = Field(default_factory=list, max_length=24)
    snapshot: HouseholdSnapshotInput = Field(default_factory=HouseholdSnapshotInput)


class PacketRequest(BaseModel):
    """Request containing a packet payload produced by `/api/prepare`."""

    model_config = ConfigDict(extra="forbid")

    packet: dict[str, Any]
    source_metadata: list[dict[str, Any]] | None = None
    household_snapshot: dict[str, Any] | None = None


class ExportRequest(PacketRequest):
    """Session-only export request."""

    formats: list[Literal["html", "json", "md", "pdf", "ics"]] = Field(
        default_factory=lambda: ["html", "json", "md"],
        max_length=4,
    )
    resources: list[dict[str, Any]] | None = None


class TranslateRequest(PacketRequest):
    """Reviewed-language translation request."""

    target_language: Literal["es"] = "es"


class ApiError(BaseModel):
    code: str
    message: str
    blocking: bool = True
    details: dict[str, Any] = Field(default_factory=dict)


class ReadinessResponse(BaseModel):
    app: dict[str, Any]
    source_pack: dict[str, Any]
    evals: dict[str, Any]
    integrations: list[dict[str, Any]]
    release_gates: dict[str, Any]
