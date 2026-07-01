# Freshness and Call-Before-Going Policy

BenefitBridge CA must treat local service availability as unstable.

## Always include “call before going” for

- Shelter / homelessness services.
- Food pantry / meal sites.
- WIC clinics.
- Legal aid clinics.
- County/city offices when hours are not freshly verified.
- Any service with eligibility, appointment, or referral requirements.

## Refresh cadence

- Food/shelter/service directories: weekly or before demo.
- County benefits pages: weekly/monthly.
- State benefits pages: monthly or before demo.
- Annual federal references: annual.
- API docs/tool endpoints: before release and before demo.

## No live availability claims

The agent must not say a shelter bed, food pantry slot, WIC appointment, or legal appointment is available unless the source explicitly provides real-time availability and the tool result is current.
