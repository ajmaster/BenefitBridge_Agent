#!/usr/bin/env bash
set -euo pipefail

# BenefitBridge API smoke tests. These are developer checks; do not store exact-address results.

echo '--- Census Geocoder — geography lookup'
curl -s "https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=70%20W%20Hedding%20St%2C%20San%20Jose%2C%20CA%2095110&benchmark=Public_AR_Current&vintage=Current_Current&format=json" | jq ".result.addressMatches[0].geographies.Counties[0]" || true

echo '--- HealthCare.gov Content API — site index'
curl -s "https://www.healthcare.gov/api/index.json" | jq ".[0] | {title,url,lang}" || true

echo '--- HealthCare.gov Content API — glossary collection'
curl -s "https://www.healthcare.gov/api/glossary.json" | jq ".glossary[0] | {title,url,lang}" || true

echo '--- HUD Housing Counselor API — city/state search'
curl -s "http://data.hud.gov/Housing_Counselor/search?AgencyName=&City=San%20Jose&State=CA" | jq ".[0]" || true

echo '--- HUD Housing Counselor API — location search'
curl -s "http://data.hud.gov/Housing_Counselor/searchByLocation?Lat=37.3382&Long=-121.8863&Distance=10" | jq ".[0]" || true

echo '--- DataSF/Socrata — discovery search'
curl -s "https://api.us.socrata.com/api/catalog/v1?domains=data.sfgov.org&search_context=data.sfgov.org&search=food%20assistance" | jq ".results[0].resource | {id,name,domain}" || true

echo '--- DataSF/Socrata — known dataset mechanics'
curl -s "https://data.sfgov.org/resource/rqzj-sfat.json?$limit=1" | jq ".[0]" || true

