# API Notes

## No-key/public sources

- HealthCare.gov Content API: useful for educational health-coverage content.
- Census Geocoder: useful for address/ZIP to geography/FIPS routing.
- HUD Housing Counselor Query Tool: useful for housing counseling referrals.
- Socrata/DataSF: optional open-data access; unauthenticated use can be throttled.
- Official California/county pages: use as cached fixtures with source IDs.

## Google APIs allowed by project scope

- Gemini API: reasoning and generation.
- Gemini File Search or Vertex AI Search: source-pack retrieval.
- Gemini structured output: schema-valid packets.
- Gemini function calling: controlled access to approved tools.
- Google Maps Geocoding/Places/Routes: contact/location enrichment.
- Cloud Translation: English/Spanish MVP.
- Sensitive Data Protection: PII detection/redaction.
- Cloud Storage/BigQuery/Cloud Run/Secret Manager: deployment and telemetry.

## Excluded from MVP

- Census Data API: requires API key.
- HUD FMR/Income Limits API: token required; not needed for prep-only MVP.
- Search.gov Results API: access key/affiliate setup required.
- 211 National Data Platform API: partner/preview access required.
- Findhelp/Unite Us: partner/commercial access required.
- CMS Marketplace plan API: token required and unnecessary for California prep flow.
