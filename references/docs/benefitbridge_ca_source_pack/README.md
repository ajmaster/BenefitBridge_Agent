# BenefitBridge CA Source Pack

Prepared: 2026-06-28

This source pack supports **BenefitBridge CA**, a California-only benefits preparation and handoff assistant for **Santa Clara County, San José, and San Francisco**.

The pack is designed for a Kaggle/Google agent capstone using:

- ADK 2.0 graph workflows
- agents-cli evaluation
- Gemini function calling and structured outputs
- Google APIs for geocoding/maps/translation/DLP/deployment
- no-key public sources for benefits and local resources

## Product boundary

BenefitBridge CA is **not** an eligibility determiner. It prepares users for official conversations and applications by producing:

- possible benefit areas worth checking
- missing facts
- documents to prepare
- official application/contact links
- local handoff resources
- caseworker questions
- printable/translated prep packets

It must not:

- guarantee eligibility
- estimate benefit amounts
- submit applications
- collect or store SSNs, case numbers, EBT card/PINs, or credentials
- claim real-time shelter or food availability
- provide legal, tax, medical, or immigration advice

## File map

```text
sources/approved_sources.json       Canonical approved source metadata
sources/approved_sources.csv        Spreadsheet-friendly source index
sources/program_areas.json          Benefit area prep logic and grounding rules
sources/county_profiles.json        Santa Clara/San José/San Francisco routing profiles
sources/local_resources_hsds_seed.* Open Referral-style local resource seed data
sources/mcp_tools_manifest.json     Read-only tool contract for approved sources
schemas/benefitbridge_schemas.json  JSON schemas for agent outputs
eval/gold_profiles.json             Golden synthetic user profiles
eval/red_team_tests.json            Safety and hallucination tests
docs/*.md                           Policy, API, grounding, privacy, and refresh notes
samples/*.md                        Example prep packets
config/approved_domains.txt         Source-domain allowlist
```

## Recommended source priority

1. Official state/county/federal source pages.
2. Public no-key APIs documented in this pack.
3. Official city/county resource pages and service directories.
4. 211/food-bank/legal-aid handoff pages.
5. Google Places/Routes only for location/contact enrichment, not benefit eligibility.

## Freshness policy

Food, shelter, WIC office, county office, and legal-aid handoffs should be refreshed at least weekly during development and should always include **call before going** language. Program pages should be refreshed weekly/monthly depending on risk. Annual references such as HHS poverty guidelines should be refreshed annually.
