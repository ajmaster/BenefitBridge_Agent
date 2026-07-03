"""California geography routing for AidAtlasCA."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.config import SOURCE_PACK_ROOT

SAN_JOSE_ZIPS = {
    "95110",
    "95112",
    "95113",
    "95116",
    "95117",
    "95118",
    "95119",
    "95120",
    "95121",
    "95122",
    "95123",
    "95124",
    "95125",
    "95126",
    "95127",
    "95128",
    "95129",
    "95130",
    "95131",
    "95132",
    "95133",
    "95134",
    "95135",
    "95136",
    "95138",
    "95139",
    "95148",
}

BAY_AREA_COUNTIES = (
    {
        "county": "Alameda County",
        "fips": "06001",
        "county_aliases": ("alameda county",),
        "cities": {
            "Alameda": ("alameda",),
            "Berkeley": ("berkeley",),
            "Fremont": ("fremont",),
            "Hayward": ("hayward",),
            "Oakland": ("oakland",),
        },
    },
    {
        "county": "Contra Costa County",
        "fips": "06013",
        "county_aliases": ("contra costa county", "contra costa"),
        "cities": {
            "Antioch": ("antioch",),
            "Concord": ("concord",),
            "Pittsburg": ("pittsburg",),
            "Richmond": ("richmond",),
            "Walnut Creek": ("walnut creek",),
        },
    },
    {
        "county": "Marin County",
        "fips": "06041",
        "county_aliases": ("marin county",),
        "cities": {
            "Mill Valley": ("mill valley",),
            "Novato": ("novato",),
            "San Rafael": ("san rafael",),
            "Sausalito": ("sausalito",),
        },
    },
    {
        "county": "Napa County",
        "fips": "06055",
        "county_aliases": ("napa county",),
        "cities": {
            "American Canyon": ("american canyon",),
            "Calistoga": ("calistoga",),
            "Napa": ("napa",),
            "St. Helena": ("st helena", "st. helena"),
        },
    },
    {
        "county": "San Francisco County",
        "fips": "06075",
        "county_aliases": (
            "san francisco county",
            "san francisco city and county",
        ),
        "cities": {
            "San Francisco": ("san francisco", "sf"),
        },
        "zip_prefixes": ("941",),
    },
    {
        "county": "San Mateo County",
        "fips": "06081",
        "county_aliases": ("san mateo county",),
        "cities": {
            "Daly City": ("daly city",),
            "East Palo Alto": ("east palo alto",),
            "Half Moon Bay": ("half moon bay",),
            "Redwood City": ("redwood city",),
            "San Mateo": ("san mateo",),
            "South San Francisco": ("south san francisco",),
        },
    },
    {
        "county": "Santa Clara County",
        "fips": "06085",
        "county_aliases": ("santa clara county",),
        "cities": {
            "Campbell": ("campbell",),
            "Cupertino": ("cupertino",),
            "Gilroy": ("gilroy",),
            "Milpitas": ("milpitas",),
            "Morgan Hill": ("morgan hill",),
            "Mountain View": ("mountain view",),
            "Palo Alto": ("palo alto",),
            "San Jose": ("san jose", "san josé"),
            "Santa Clara": ("santa clara",),
            "Sunnyvale": ("sunnyvale",),
        },
        "zip_codes": tuple(sorted(SAN_JOSE_ZIPS)),
    },
    {
        "county": "Solano County",
        "fips": "06095",
        "county_aliases": ("solano county",),
        "cities": {
            "Benicia": ("benicia",),
            "Fairfield": ("fairfield",),
            "Suisun City": ("suisun city",),
            "Vacaville": ("vacaville",),
            "Vallejo": ("vallejo",),
        },
    },
    {
        "county": "Sonoma County",
        "fips": "06097",
        "county_aliases": ("sonoma county",),
        "cities": {
            "Healdsburg": ("healdsburg",),
            "Petaluma": ("petaluma",),
            "Rohnert Park": ("rohnert park",),
            "Santa Rosa": ("santa rosa",),
            "Sonoma": ("sonoma",),
        },
    },
)

_PILOT_COUNTY_BY_NAME = {
    str(county["county"]).lower(): county for county in BAY_AREA_COUNTIES
}


@dataclass(slots=True)
class GeographyDecision:
    state: str
    county: str | None
    city: str | None
    zip_code: str | None
    fips: str | None
    confidence: float
    in_pilot: bool
    scope_note: str
    coverage_level: str = "unsupported"

    def to_dict(self) -> dict[str, object]:
        return {
            "state": self.state,
            "county": self.county,
            "city": self.city,
            "zip_code": self.zip_code,
            "fips": self.fips,
            "confidence": self.confidence,
            "in_pilot": self.in_pilot,
            "scope_note": self.scope_note,
            "coverage_level": self.coverage_level,
        }


def classify_location(location_text: str) -> GeographyDecision:
    text = location_text.lower()

    if (
        "reno" in text
        or ", nv" in text
        or ("nevada" in text and "nevada county" not in text)
    ):
        return GeographyDecision(
            state="NV",
            county=None,
            city="Reno" if "reno" in text else None,
            zip_code=None,
            fips=None,
            confidence=0.8,
            in_pilot=False,
            scope_note="outside_california",
            coverage_level="unsupported",
        )

    for county_hint in BAY_AREA_COUNTIES:
        zip_code = _matched_zip_code(text, county_hint)
        if _contains_any(text, county_hint.get("county_aliases", ())) or zip_code:
            return GeographyDecision(
                state="CA",
                county=str(county_hint["county"]),
                city=None,
                zip_code=zip_code,
                fips=str(county_hint["fips"]),
                confidence=0.9 if zip_code else 0.86,
                in_pilot=True,
                scope_note="bay_area_county",
                coverage_level="reviewed_local",
            )
        for city, aliases in county_hint.get("cities", {}).items():
            if _contains_any(text, aliases):
                return GeographyDecision(
                    state="CA",
                    county=str(county_hint["county"]),
                    city=str(city),
                    zip_code=None,
                    fips=str(county_hint["fips"]),
                    confidence=0.82,
                    in_pilot=True,
                    scope_note="bay_area_city",
                    coverage_level="reviewed_local",
                )

    if "bay area" in text:
        return GeographyDecision(
            state="CA",
            county=None,
            city=None,
            zip_code=None,
            fips=None,
            confidence=0.25,
            in_pilot=False,
            scope_note="not_enough_location_information",
            coverage_level="unsupported",
        )

    statewide_county = _california_county(location_text)
    if statewide_county:
        return GeographyDecision(
            state="CA",
            county=str(statewide_county["name"]),
            city=None,
            zip_code=None,
            fips=str(statewide_county["fips"]),
            confidence=0.82,
            in_pilot=False,
            scope_note="statewide_core",
            coverage_level=str(
                statewide_county.get("coverage_level", "statewide_core")
            ),
        )

    if "california" in text or ", ca" in text:
        return GeographyDecision(
            state="CA",
            county=None,
            city=None,
            zip_code=None,
            fips=None,
            confidence=0.35,
            in_pilot=False,
            scope_note="not_enough_location_information",
            coverage_level="unsupported",
        )
    return GeographyDecision(
        state="unknown",
        county=None,
        city=None,
        zip_code=None,
        fips=None,
        confidence=0.0,
        in_pilot=False,
        scope_note="not_enough_location_information",
        coverage_level="unsupported",
    )


def classify_geocoded_location(geocode: dict[str, object]) -> GeographyDecision | None:
    """Map sanitized Google Geocoding output to AidAtlasCA geography policy."""

    if geocode.get("provider") == "disabled" or geocode.get("live") is False:
        return None

    state = str(geocode.get("state") or "unknown")
    county = _clean_county_name(geocode.get("county"))
    city = str(geocode.get("city") or "") or None
    zip_code = str(geocode.get("zip_code") or "") or None
    confidence = float(geocode.get("confidence") or 0.88)

    if state != "CA":
        return GeographyDecision(
            state=state,
            county=county,
            city=city,
            zip_code=zip_code,
            fips=None,
            confidence=confidence,
            in_pilot=False,
            scope_note="outside_california",
            coverage_level="unsupported",
        )

    county_hint = _PILOT_COUNTY_BY_NAME.get((county or "").lower())
    if county_hint:
        return GeographyDecision(
            state="CA",
            county=str(county_hint["county"]),
            city=city,
            zip_code=zip_code,
            fips=str(county_hint["fips"]),
            confidence=confidence,
            in_pilot=True,
            scope_note="google_geocoding_pilot",
            coverage_level="reviewed_local",
        )

    statewide_county = _california_county(county or city or "")
    if statewide_county:
        coverage_level = str(statewide_county.get("coverage_level", "statewide_core"))
        return GeographyDecision(
            state="CA",
            county=str(statewide_county["name"]),
            city=city,
            zip_code=zip_code,
            fips=str(statewide_county["fips"]),
            confidence=confidence,
            in_pilot=False,
            scope_note="statewide_core",
            coverage_level=coverage_level,
        )

    return GeographyDecision(
        state="CA",
        county=county,
        city=city,
        zip_code=zip_code,
        fips=None,
        confidence=confidence,
        in_pilot=False,
        scope_note="not_enough_location_information",
        coverage_level="unsupported",
    )


def _clean_county_name(value: object) -> str | None:
    if value in (None, ""):
        return None
    county = str(value).strip()
    if county.lower() == "san francisco city and county":
        return "San Francisco County"
    return county


@lru_cache(maxsize=1)
def _california_counties() -> tuple[dict[str, Any], ...]:
    data = json.loads(
        (SOURCE_PACK_ROOT / "california_counties.json").read_text(encoding="utf-8")
    )
    return tuple(item for item in data if isinstance(item, dict))


def _california_county(location_text: str) -> dict[str, Any] | None:
    text = _normalize_key(location_text)
    if not text:
        return None
    for county in _california_counties():
        aliases = [
            str(county.get("name", "")),
            *[str(alias) for alias in county.get("aliases", [])],
            *[str(city) for city in county.get("major_cities", [])],
        ]
        for alias in aliases:
            normalized_alias = _normalize_key(alias)
            if normalized_alias and _contains_location_alias(text, normalized_alias):
                return county
    return None


def _normalize_key(value: str) -> str:
    return " ".join(value.replace(",", " ").lower().split())


def _contains_location_alias(text: str, alias: str) -> bool:
    return f" {alias} " in f" {text} "


def _contains_any(text: str, aliases: tuple[str, ...]) -> bool:
    return any(_contains_alias(text, alias) for alias in aliases)


def _contains_alias(text: str, alias: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9]){re.escape(alias)}(?![a-z0-9])", text))


def _matched_zip_code(text: str, county_hint: dict[str, object]) -> str | None:
    for zip_code in county_hint.get("zip_codes", ()) or ():
        if _contains_alias(text, str(zip_code)):
            return str(zip_code)
    for prefix in county_hint.get("zip_prefixes", ()) or ():
        match = re.search(
            rf"(?<![0-9]){re.escape(str(prefix))}[0-9]{{2}}(?![0-9])",
            text,
        )
        if match:
            return match.group(0)
    return None
