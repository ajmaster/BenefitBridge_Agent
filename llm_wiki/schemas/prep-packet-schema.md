# Prep Packet Schema

The runtime schema is implemented in `app/schemas.py`; the source-pack schema
snapshot is in `app/data/schemas/benefitbridge_schemas.json`.

Core packet fields:

- `packet_id`
- `generated_at`
- `language`
- `jurisdiction`
- `household_summary`
- `benefit_paths`
- `immediate_help_notes`
- `documents_to_prepare`
- `questions_for_caseworker`
- `official_next_steps`
- `source_citations`
- `safety_notice`

Rules:

- `benefit_paths` must cite approved sources.
- `source_citations` must use approved source IDs and approved domains.
- `household_summary` must not include raw sensitive identifiers.
- `official_next_steps` must be link-out only.
- Export must fail if validation reports blocking failures.

