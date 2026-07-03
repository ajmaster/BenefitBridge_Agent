import pytest

import app.tools.voice as voice_module


def test_voice_mode_reports_disabled_by_default() -> None:
    assert voice_module.voice_mode() == {"provider": "disabled", "live": False}


def test_transcribe_audio_raises_when_voice_disabled() -> None:
    with pytest.raises(RuntimeError, match="disabled"):
        voice_module.transcribe_audio(b"fake-audio", language="en")


def test_synthesize_speech_returns_empty_bytes_when_voice_disabled() -> None:
    assert voice_module.synthesize_speech("hello", language="en") == b""


def test_transcribe_audio_raises_when_library_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(voice_module, "ENABLE_VOICE", True)
    monkeypatch.setattr(voice_module, "_module_exists", lambda _name: False)

    with pytest.raises(RuntimeError, match="not available"):
        voice_module.transcribe_audio(b"fake-audio", language="en")


def test_synthesize_speech_returns_empty_bytes_for_blank_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(voice_module, "ENABLE_VOICE", True)

    assert voice_module.synthesize_speech("", language="en") == b""
