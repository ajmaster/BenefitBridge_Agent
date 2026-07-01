# Tool Contracts

Tool contracts are defined in
`app/data/contracts/benefitbridge_tool_contracts.json` and implemented in
`app/tools/`.

Required tool names:

- `lookup_county_from_location`
- `get_county_profile`
- `retrieve_approved_source`
- `search_source_snapshot`
- `get_benefit_program_area`
- `match_benefit_paths`
- `find_local_resources`
- `get_healthcare_gov_content`
- `search_hud_housing_counselors`
- `query_datasf_socrata`
- `redact_pii`
- `validate_packet`
- `translate_packet`
- `export_packet`

Contract rules:

- Return dictionaries or dataclass-derived dictionaries.
- Include structured errors instead of raising for expected user/data issues.
- Never require raw sensitive input.
- Keep live public APIs disabled unless explicitly enabled.
- Validate exported packets through `validate_packet`.

