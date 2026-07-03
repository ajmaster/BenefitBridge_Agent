from app.tools.export import export_packet

VALID_PACKET = {
    "household_snapshot_summary": "San Jose household",
    "potential_benefit_paths": [
        {
            "program_name": "CalFresh",
            "status_label": "likely_worth_checking",
            "source_citations": [
                {
                    "source_id": "cdss_calfresh_home",
                    "url": "https://calfresh.dss.ca.gov/",
                }
            ],
            "missing_facts": ["Monthly income"],
            "documents_to_prepare": ["Proof of income"],
            "warnings": [],
        }
    ],
    "missing_answers": [],
    "document_checklist": [],
    "caseworker_questions": [],
    "call_script": "Call the county office and ask about CalFresh.",
    "safety_notice": "",
    "source_citations": [],
}


def test_export_ics_contains_valid_calendar_structure() -> None:
    result = export_packet(VALID_PACKET, ["ics"])

    assert "error" not in result
    artifacts = {artifact["format"]: artifact for artifact in result["artifacts"]}
    assert "ics" in artifacts

    content = artifacts["ics"]["content"]
    assert content.startswith("BEGIN:VCALENDAR")
    assert content.rstrip().endswith("END:VCALENDAR")
    assert content.count("BEGIN:VEVENT") == 2  # one reminder + one per benefit path
    assert "SUMMARY:Prepare: CalFresh" in content
    assert artifacts["ics"]["storage"] == "session_only"


def test_export_ics_blocked_by_failed_validation() -> None:
    invalid_packet = {
        **VALID_PACKET,
        "potential_benefit_paths": [
            {
                **VALID_PACKET["potential_benefit_paths"][0],
                "warnings": ["You qualify for CalFresh."],
            }
        ],
    }

    result = export_packet(invalid_packet, ["ics"])

    assert "error" in result
    assert result["error"]["code"] == "SAFETY_BLOCK"


def test_export_markdown_contains_document_studio_sections() -> None:
    packet = {
        **VALID_PACKET,
        "document_checklist": ["Proof of income"],
        "caseworker_questions": ["What should I bring to the appointment?"],
        "immediate_help_notes": ["Call before going."],
        "source_citations": [
            {
                "source_id": "cdss_calfresh_home",
                "source_title": "CalFresh",
                "url": "https://calfresh.dss.ca.gov/",
            }
        ],
    }

    result = export_packet(packet, ["md"])

    assert "error" not in result
    artifacts = {artifact["format"]: artifact for artifact in result["artifacts"]}
    content = artifacts["md"]["content"]
    assert "# AidAtlasCA Prep Documents" in content
    assert "## Documents To Bring" in content
    assert "Proof of income" in content
    assert "## Questions To Ask" in content
    assert "## Call Script" in content
    assert "## Official Source Sheet" in content


def test_export_markdown_strips_maps_formatted_address() -> None:
    resources = [
        {
            "organization": "County Office",
            "service_name": "Benefits office routing",
            "jurisdiction": "Santa Clara County",
            "phone": "+1 408-555-0100",
            "call_before_going": True,
            "availability_notice": "Call before going to confirm current availability.",
            "maps_enrichment": {
                "provider": "google_places",
                "display_name": "County Office",
                "formatted_address": "4001 N First St, San Jose, CA 95134",
                "google_maps_uri": "https://maps.google.com/?cid=test",
                "availability_notice": "Google Places details may change. Call before going.",
            },
        }
    ]

    result = export_packet(VALID_PACKET, ["md"], resources=resources)

    assert "error" not in result
    artifacts = {artifact["format"]: artifact for artifact in result["artifacts"]}
    content = artifacts["md"]["content"]
    assert "4001 N First St" not in content
    assert "Google Maps link: https://maps.google.com/?cid=test" in content
