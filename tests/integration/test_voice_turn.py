import base64

import pytest
from fastapi.testclient import TestClient
from google.api_core.exceptions import PermissionDenied

import app.fast_api_app as fast_api_module
from app.fast_api_app import app

client = TestClient(app)


@pytest.fixture
def enable_voice(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(fast_api_module, "ENABLE_VOICE", True)


def _voice_payload(audio: bytes = b"fake-audio-bytes") -> dict:
    return {
        "audio_base64": base64.b64encode(audio).decode("ascii"),
        "messages": [],
        "snapshot": {"language": "en"},
    }


def test_voice_turn_disabled_by_default() -> None:
    response = client.post("/api/voice/turn", json=_voice_payload())

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "VOICE_DISABLED"


def test_voice_turn_rejects_bad_base64(enable_voice: None) -> None:
    response = client.post(
        "/api/voice/turn",
        json={
            "audio_base64": "not-valid-base64!!",
            "messages": [],
            "snapshot": {"language": "en"},
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "AUDIO_DECODE_FAILED"


def test_voice_turn_surfaces_transcription_failure(
    enable_voice: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _raise(_audio: bytes, *, language: str) -> str:
        raise RuntimeError("google-cloud-speech is not available.")

    monkeypatch.setattr(fast_api_module, "transcribe_audio", _raise)

    response = client.post("/api/voice/turn", json=_voice_payload())

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "VOICE_UNAVAILABLE"


def test_voice_turn_surfaces_google_service_disabled(
    enable_voice: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    def _raise(_audio: bytes, *, language: str) -> str:
        raise PermissionDenied("403 Cloud Speech-to-Text API has not been used")

    monkeypatch.setattr(fast_api_module, "transcribe_audio", _raise)

    response = client.post("/api/voice/turn", json=_voice_payload())

    assert response.status_code == 503
    body = response.json()
    assert body["detail"]["code"] == "VOICE_UNAVAILABLE"
    assert "Speech-to-Text" in body["detail"]["message"]


def test_voice_status_reports_runtime_mode() -> None:
    response = client.get("/api/voice/status")

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is False
    assert body["available"] is False
    assert body["provider"] == "disabled"


def test_voice_turn_rejects_empty_transcript(
    enable_voice: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(fast_api_module, "transcribe_audio", lambda _audio, **_kw: "")

    response = client.post("/api/voice/turn", json=_voice_payload())

    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "EMPTY_TRANSCRIPT"


def test_voice_turn_reuses_chat_workflow_redaction_path(
    enable_voice: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        fast_api_module,
        "transcribe_audio",
        lambda _audio, **_kw: "My SSN is 123-45-6789 and I need CalFresh.",
    )
    monkeypatch.setattr(fast_api_module, "synthesize_speech", lambda *_a, **_kw: b"")

    response = client.post("/api/voice/turn", json=_voice_payload())

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "privacy_block"
    assert body["redaction"]["blocked"] is True
    assert "123-45-6789" not in str(body)
    assert "[REDACTED_SSN]" in body["transcript"]


def test_voice_turn_returns_packet_and_audio_for_full_request(
    enable_voice: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        fast_api_module,
        "transcribe_audio",
        lambda _audio, **_kw: (
            "I am in San Jose with 3 people and need food, health coverage, "
            "and utility help."
        ),
    )
    monkeypatch.setattr(
        fast_api_module, "synthesize_speech", lambda *_a, **_kw: b"fake-mp3-bytes"
    )

    response = client.post("/api/voice/turn", json=_voice_payload())

    body = response.json()
    assert response.status_code == 200
    assert body["route"] == "packet_ready"
    assert body["transcript"].startswith("I am in San Jose")
    assert body["audio_base64"] == base64.b64encode(b"fake-mp3-bytes").decode("ascii")
    assert (
        body["voice_mode"]["provider"] == "disabled"
    )  # ENABLE_VOICE flag lives in app.config
