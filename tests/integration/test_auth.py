import pytest
from fastapi.testclient import TestClient

import app.services.auth as auth_module
from app.fast_api_app import app

client = TestClient(app)


@pytest.fixture
def enable_auth(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_module, "ENABLE_AUTH", True)


def test_readiness_open_when_auth_disabled() -> None:
    response = client.get("/api/eval/readiness")

    assert response.status_code == 200


def test_readiness_requires_token_when_auth_enabled(enable_auth: None) -> None:
    response = client.get("/api/eval/readiness")

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_REQUIRED"


def test_readiness_rejects_invalid_token_when_auth_enabled(
    enable_auth: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _raise(_token: str) -> dict:
        raise ValueError("bad token")

    monkeypatch.setattr(auth_module, "_verify_id_token", _raise)

    response = client.get(
        "/api/eval/readiness", headers={"Authorization": "Bearer not-a-real-token"}
    )

    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "AUTH_INVALID"


def test_readiness_accepts_valid_token_when_auth_enabled(
    enable_auth: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        auth_module,
        "_verify_id_token",
        lambda _token: {"uid": "test-uid", "email": "demo@example.com"},
    )

    response = client.get(
        "/api/eval/readiness", headers={"Authorization": "Bearer good-token"}
    )

    assert response.status_code == 200
