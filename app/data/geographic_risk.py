"""Geographic economic risk indices for Indian states/regions."""

from __future__ import annotations

# Risk index 0-100 (higher = lower geographic risk / stronger economy)
STATE_RISK_INDEX: dict[str, float] = {
    "maharashtra": 82,
    "gujarat": 80,
    "karnataka": 81,
    "tamil_nadu": 78,
    "telangana": 77,
    "haryana": 76,
    "delhi": 79,
    "punjab": 72,
    "rajasthan": 68,
    "uttar_pradesh": 62,
    "madhya_pradesh": 65,
    "west_bengal": 66,
    "bihar": 55,
    "odisha": 64,
    "kerala": 74,
    "andhra_pradesh": 70,
    "jharkhand": 58,
    "chhattisgarh": 60,
    "assam": 58,
    "goa": 75,
}

# Tier classification by typical industrial development
TIER_ADJUSTMENT: dict[str, float] = {
    "tier1": 5,
    "tier2": 0,
    "tier3": -5,
    "rural": -10,
}


def geographic_risk_score(state: str | None, tier: str | None = None) -> float:
    if not state:
        return 65.0
    base = STATE_RISK_INDEX.get(state.lower().strip().replace(" ", "_"), 65.0)
    if tier:
        base += TIER_ADJUSTMENT.get(tier.lower(), 0)
    return max(0.0, min(100.0, base))
