# Session Handoff Template

Use this when handing work to another agent or future session.

## Current Objective

Describe the exact implementation or review task.

## Files To Read First

- `AGENTS.md`
- `.agents-cli-spec.md`
- `llm_wiki/README.md`
- Relevant runtime modules under `app/`

## Current Constraints

- No eligibility decisions.
- No benefit amounts.
- No application submission.
- No credentials or sensitive documents.
- Approved sources only.

## Verification Required

- `agents-cli info`
- `uv run pytest tests/unit tests/integration`
- `python scripts/validate_source_pack.py`
- Relevant agents-cli evals if model/data export is approved.

## Open Questions

List unresolved source, product, safety, or deployment questions.

