# Gold Profile Index

Seed gold profiles live in `tests/eval/datasets/benefitbridge_gold_profiles.json`.
The expanded corpus lives in
`tests/eval/datasets/benefitbridge_expanded_profiles.json`.

MVP coverage:

- San Jose or Santa Clara County household needing food and health coverage.
- Spanish-speaking family workflow.
- San Francisco adult workflow.
- WIC uncertainty when child age or pregnancy/postpartum facts are missing.
- Utility/phone support workflow.
- Urgent food or shelter handoff before normal prep.

Gold outputs should test structure, citations, safety, and prohibited-claim
absence. They should not test exact wording except for fixed crisis/DV handoff
language.

