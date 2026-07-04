"""Speech-to-text and text-to-speech wrappers for the optional voice flag.

Multi-lingual voice is implemented as a cascaded pipeline (STT -> the existing
text chat workflow -> TTS) rather than native audio-to-audio, specifically so
every voice turn still passes through the same text-level redaction and
safety-triage steps as `/api/chat` before a reply is generated. See
`llm_wiki/agent_method/adk-graph-workflow.md` and
`llm_wiki/safety/privacy-and-pii.md`.
"""

from __future__ import annotations

import importlib.util
from typing import Any

from app.config import ENABLE_VOICE

try:  # pragma: no cover - exercised when Google client libraries are installed.
    from google.api_core.exceptions import GoogleAPIError

    _GOOGLE_API_ERRORS: tuple[type[BaseException], ...] = (GoogleAPIError,)
except Exception:  # pragma: no cover - optional Google dependency fallback.
    _GOOGLE_API_ERRORS = ()

_LANGUAGE_CODES: dict[str, str] = {
    "en": "en-US",
    "es": "es-US",
}


def _module_exists(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _language_code(language: str) -> str:
    return _LANGUAGE_CODES.get(language, "en-US")


def voice_mode() -> dict[str, Any]:
    """Report the current voice integration mode without calling live APIs."""

    if not ENABLE_VOICE:
        return {"provider": "disabled", "live": False}
    if _module_exists("google.cloud.speech") and _module_exists(
        "google.cloud.texttospeech"
    ):
        return {"provider": "google_cloud_speech_and_tts", "live": True}
    return {"provider": "disabled", "live": False, "warning": "not_available"}


def voice_status() -> dict[str, Any]:
    """Return non-secret runtime voice readiness for the frontend."""

    speech_library = _module_exists("google.cloud.speech")
    tts_library = _module_exists("google.cloud.texttospeech")
    if not ENABLE_VOICE:
        return {
            "enabled": False,
            "available": False,
            "provider": "disabled",
            "live": False,
            "reason": "voice_disabled",
        }
    if not speech_library:
        return {
            "enabled": True,
            "available": False,
            "provider": "disabled",
            "live": False,
            "reason": "speech_library_missing",
        }
    if not tts_library:
        return {
            "enabled": True,
            "available": False,
            "provider": "disabled",
            "live": False,
            "reason": "tts_library_missing",
        }
    return {
        "enabled": True,
        "available": True,
        "provider": "google_cloud_speech_and_tts",
        "live": True,
        "reason": None,
    }


def transcribe_audio(audio_bytes: bytes, *, language: str = "en") -> str:
    """Transcribe a short WEBM/Opus speech clip using Cloud Speech-to-Text.

    Raises RuntimeError when voice is disabled or the client library is
    unavailable. Callers should surface that as a hard failure for the turn;
    there is no deterministic substitute for a real transcript.
    """

    if not ENABLE_VOICE:
        raise RuntimeError("Voice is disabled (ENABLE_VOICE=false).")
    if not _module_exists("google.cloud.speech"):
        raise RuntimeError("google-cloud-speech is not available.")

    from google.cloud import speech

    client = speech.SpeechClient()
    primary = _language_code(language)
    alternatives = [code for code in _LANGUAGE_CODES.values() if code != primary]
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        language_code=primary,
        alternative_language_codes=alternatives,
    )
    audio = speech.RecognitionAudio(content=audio_bytes)
    try:
        response = client.recognize(config=config, audio=audio)
    except _GOOGLE_API_ERRORS as exc:
        raise RuntimeError(_voice_api_error_message("Speech-to-Text", exc)) from exc
    return " ".join(
        result.alternatives[0].transcript
        for result in response.results
        if result.alternatives
    ).strip()


def synthesize_speech(text: str, *, language: str = "en") -> bytes:
    """Synthesize a spoken reply using Cloud Text-to-Speech.

    Returns empty bytes (rather than raising) when voice is disabled or
    unavailable, so a voice turn can still return its text reply even if
    speech synthesis fails - the text is the safety-relevant payload, the
    audio is a convenience layered on top of it.
    """

    if not text or not ENABLE_VOICE or not _module_exists("google.cloud.texttospeech"):
        return b""

    from google.cloud import texttospeech

    client = texttospeech.TextToSpeechClient()
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code=_language_code(language),
        ssml_gender=texttospeech.SsmlVoiceGender.NEUTRAL,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3
    )
    try:
        response = client.synthesize_speech(
            input=synthesis_input, voice=voice, audio_config=audio_config
        )
    except _GOOGLE_API_ERRORS:
        return b""
    return response.audio_content


def _voice_api_error_message(service_name: str, exc: BaseException) -> str:
    text = str(exc)
    if "SERVICE_DISABLED" in text or "has not been used" in text:
        return f"{service_name} is not enabled for this Google Cloud project."
    if "PERMISSION_DENIED" in text or "403" in text:
        return f"{service_name} is not available with the current Google Cloud credentials."
    return f"{service_name} is temporarily unavailable."
