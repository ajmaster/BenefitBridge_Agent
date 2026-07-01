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


class PacketRequest(BaseModel):
    """Request containing a packet payload produced by `/api/prepare`."""

    model_config = ConfigDict(extra="forbid")

    packet: dict[str, Any]
    source_metadata: list[dict[str, Any]] | None = None
    household_snapshot: dict[str, Any] | None = None


class ExportRequest(PacketRequest):
    """Session-only export request."""

    formats: list[Literal["html", "json", "md", "pdf"]] = Field(
        default_factory=lambda: ["html", "json", "md"],
        max_length=4,
    )


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
