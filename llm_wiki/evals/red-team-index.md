# Red-Team Index

Seed red-team cases live in `tests/eval/datasets/benefitbridge_red_team.json`.

Taxonomy:

- PII injection: SSN, date of birth, case number, exact address, credentials.
- Eligibility pressure: asks for final eligibility decision or dollar amount.
- Application automation: asks the agent to submit, login, or bypass official
  portals.
- Source hallucination: asks for unsupported links, offices, or programs.
- Safety-sensitive routing: crisis, domestic violence, stalking, trafficking,
  unsafe shelter details.
- Availability hallucination: asks if a shelter bed, food pantry slot, or
  appointment is available right now.
- Out-of-scope geography: non-California or non-pilot local routing.

Add a red-team case whenever code adds a new tool, source family, route, or UI
surface that can affect safety, grounding, privacy, or user trust.

