from app.tools.translation import translate_packet


def test_spanish_translation_remains_reviewed_template() -> None:
    packet = {"call_script": "Call the official county office before going."}

    result = translate_packet(packet, target_language="es")

    assert result["lang"] == "es"
    assert result["review_status"] == "reviewed_template"
    assert result["requires_human_review"] is False
    assert result["content"] == packet


def test_non_reviewed_language_returns_draft_envelope_not_error() -> None:
    packet = {"call_script": "Call the official county office before going."}

    result = translate_packet(packet, target_language="vi")

    assert "error" not in result
    assert result["lang"] == "vi"
    assert result["review_status"] == "machine_draft_unreviewed"
    assert result["requires_human_review"] is True
    assert result["content"] == packet
