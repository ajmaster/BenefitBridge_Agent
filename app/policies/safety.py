"""Safety triage policy for urgent and safety-sensitive flows."""

from __future__ import annotations

from dataclasses import dataclass

CRISIS_TERMS = (
    "suicide",
    "self harm",
    "self-harm",
    "kill myself",
    "hurt myself",
    "immediate danger",
)
DV_TERMS = (
    "domestic violence",
    "violent partner",
    "partner is violent",
    "tracking my phone",
    "stalking",
    "trafficking",
    "unsafe at home",
)
URGENT_TERMS = (
    "shelter tonight",
    "sleeping outside",
    "sleeping in my car",
    "food today",
    "no food",
    "tonight",
)


@dataclass(slots=True)
class SafetyRoute:
    route: str
    reason: str | None = None
    fixed_handoff_required: bool = False
    suppress_normal_packet: bool = False

    def to_dict(self) -> dict[str, object]:
        return {
            "route": self.route,
            "reason": self.reason,
            "fixed_handoff_required": self.fixed_handoff_required,
            "suppress_normal_packet": self.suppress_normal_packet,
        }


def detect_safety_route(text: str) -> SafetyRoute:
    lowered = text.lower()
    if any(term in lowered for term in CRISIS_TERMS):
        return SafetyRoute(
            route="crisis_handoff",
            reason="crisis_or_self_harm",
            fixed_handoff_required=True,
            suppress_normal_packet=True,
        )
    if any(term in lowered for term in DV_TERMS):
        return SafetyRoute(
            route="dv_safety_handoff",
            reason="domestic_violence_or_stalking",
            fixed_handoff_required=True,
            suppress_normal_packet=True,
        )
    if any(term in lowered for term in URGENT_TERMS):
        return SafetyRoute(route="urgent_handoff", reason="urgent_food_or_shelter")
    return SafetyRoute(route="standard_benefits_prep")


def fixed_handoff_text(route: str) -> str:
    if route == "crisis_handoff":
        return (
            "If there is immediate danger, call 911. For suicide or emotional crisis "
            "support in the U.S., call or text 988. AidAtlasCA cannot provide "
            "crisis counseling."
        )
    if route == "dv_safety_handoff":
        return (
            "If it is safe to do so, contact the National Domestic Violence Hotline "
            "at 1-800-799-7233 or visit thehotline.org. AidAtlasCA will not store "
            "or print your exact address or safety narrative by default."
        )
    return "Local food, shelter, and legal-aid resources can change. Call before going."
