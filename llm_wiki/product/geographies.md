# Geographies

Supported California routing:

- All 58 California counties route by canonical county name, common aliases, and
  selected major city hints from `app/data/source_pack/california_counties.json`.
- Reviewed local handoff depth is currently strongest for Bay Area counties in
  `app/data/source_pack/county_profiles.json`.
- Other California counties use `coverage_level: statewide_core`: statewide
  program prep, official county/source locators, and conservative locator
  handoffs instead of unreviewed local resource cards.

Representative city hints are supported only as county-routing hints. Generic
"California" or "Bay Area" is not enough location information; ask for county,
city, or ZIP instead of pretending local resources can be routed.

Outside California, explain the CA-only scope and route to USA.gov, 211, or
state agencies without inventing local rules.

Core benefits prep uses ZIP/city/county. Exact street addresses are blocked by
default and are session-only if ever used for optional directions.

Local resource output is source-backed and conservative. Do not claim live food,
shelter, legal-aid, WIC, or office availability; mark unstable local resources
call-before-going.
