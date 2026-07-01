# Public API Notes

Public APIs are integration-ready but not required for runtime packet generation.
They are smoke-test or refresh helpers unless explicitly enabled.

Candidates:

- Census Geocoder: city/ZIP/county confirmation and FIPS hints.
- HealthCare.gov Content API: health coverage glossary/article snapshots.
- HUD Housing Counselor search: housing counselor discovery.
- DataSF/Socrata: San Francisco dataset mechanics and optional refresh.
- Google Maps/Places/Routes: future enrichment only, after privacy review.
- Cloud Translation: future translation productionization after QA.
- Cloud DLP: future server-side PII detection, not needed for prototype tests.

Run `scripts/smoke_public_apis.sh` only when network use is explicitly approved.

