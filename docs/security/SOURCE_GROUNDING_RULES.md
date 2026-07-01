# Source Grounding Rules

Every packet must pass grounding validation before export.

Rules:

- Cite approved source IDs.
- Cite approved domains.
- Prefer official sources for program facts.
- Use partner/nonprofit sources only for support or plain-language handoff.
- Do not copy visual reference text as policy.
- Do not invent URLs, programs, offices, benefit amounts, or availability.
- Block stale critical sources until refreshed.

Implementation:

- Source metadata: `app/data/source_pack/approved_sources.json`
- Domain allowlist: `app/data/source_pack/approved_domains.txt`
- Program references: `app/data/source_pack/program_areas.json`
- Policy checks: `app/policies/source_grounding.py`
- Final validation: `app/tools/validation.py`

