"""Optional public API client stubs.

The MVP runtime is fixture-backed. These helpers define the boundary for smoke
tests and future refresh jobs without making live data part of packet generation.
"""

from __future__ import annotations

from app.config import ENABLE_LIVE_PUBLIC_APIS


def live_api_disabled_response(api_name: str) -> dict[str, object]:
    return {
        "status": "disabled",
        "api": api_name,
        "message": (
            "Live public APIs are disabled for runtime packet generation. "
            "Use curated fixtures or run smoke/refresh scripts explicitly."
        ),
    }


def ensure_live_api_enabled(api_name: str) -> dict[str, object] | None:
    if not ENABLE_LIVE_PUBLIC_APIS:
        return live_api_disabled_response(api_name)
    return None
