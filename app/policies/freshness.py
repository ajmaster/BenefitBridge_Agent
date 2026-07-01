"""Freshness and call-before-going rules."""

from __future__ import annotations

import datetime as dt
from typing import Any

URGENT_SERVICE_TYPES = {
    "shelter",
    "food",
    "wic",
    "legal",
    "housing_handoff",
    "benefits_office",
    "crisis",
}
URGENT_CATEGORIES = {"food", "shelter", "housing", "wic", "legal", "crisis", "211"}


def _parse_date(value: str | None) -> dt.date | None:
    if not value:
        return None
    try:
        return dt.date.fromisoformat(value[:10])
    except ValueError:
        return None


def freshness_state(source: dict[str, Any], today: dt.date | None = None) -> str:
    """Return current, stale, or unknown for an approved source record."""

    checked = _parse_date(source.get("last_checked"))
    if checked is None:
        return "unknown"

    today = today or dt.date.today()
    categories = set(str(source.get("category", "")).lower().split(","))
    categories.update(str(item).lower() for item in source.get("use_for", []))
    owner_type = str(source.get("owner_type", "")).lower()
    max_age = 60
    if categories.intersection(URGENT_CATEGORIES) or "hotline" in owner_type:
        max_age = 7
    elif "county" in owner_type or "local" in owner_type:
        max_age = 30

    return "current" if (today - checked).days <= max_age else "stale"


def requires_call_before_going(resource: dict[str, Any]) -> bool:
    service_type = str(resource.get("service_type", "")).lower()
    if any(key in service_type for key in URGENT_SERVICE_TYPES):
        return True
    if resource.get("hours") is None and resource.get("phone"):
        return True
    return bool(resource.get("call_before_going"))
