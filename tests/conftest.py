"""Shared pytest fixtures.

Tests must be hermetic and pass regardless of the developer's local `.env`
values. Individual tests that need `ENABLE_AUTH` / `ENABLE_VOICE` on already
opt in explicitly via their own `monkeypatch` fixtures (see
`tests/integration/test_auth.py` and `tests/integration/test_voice_turn.py`).

`ENABLE_GOOGLE_MAPS` is forced off via `monkeypatch.setenv` rather than
`setattr`, because `app/services/google_integrations.py` reads it live from
`os.environ` on every call instead of caching it at import time; otherwise a
developer's local `.env` with live Maps credentials would make unit tests
call the real Google Geocoding/Places APIs.
"""

from __future__ import annotations

import pytest


@pytest.fixture(autouse=True)
def _default_feature_flags_off(monkeypatch: pytest.MonkeyPatch) -> None:
    import app.fast_api_app as fast_api_module
    import app.services.auth as auth_module
    import app.tools.voice as voice_module

    monkeypatch.setattr(auth_module, "ENABLE_AUTH", False)
    monkeypatch.setattr(fast_api_module, "ENABLE_VOICE", False)
    monkeypatch.setattr(voice_module, "ENABLE_VOICE", False)
    monkeypatch.setenv("ENABLE_GOOGLE_MAPS", "false")
