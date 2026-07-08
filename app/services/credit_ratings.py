"""CRISIL and credit rating utilities for MSME assessment."""

from __future__ import annotations

# Long-term CRISIL ratings (investment grade A- and above typically preferred for credit)
CRISIL_LONG_TERM_SCORES: dict[str, float] = {
    "AAA": 98,
    "AA+": 93,
    "AA": 90,
    "AA-": 87,
    "A+": 84,
    "A": 81,
    "A-": 77,
    "BBB+": 72,
    "BBB": 68,
    "BBB-": 63,
    "BB+": 57,
    "BB": 52,
    "BB-": 47,
    "B+": 42,
    "B": 37,
    "B-": 32,
    "C": 22,
    "D": 8,
}

# Short-term CRISIL ratings
CRISIL_SHORT_TERM_SCORES: dict[str, float] = {
    "A1+": 94,
    "A1": 90,
    "A2+": 85,
    "A2": 80,
    "A3+": 74,
    "A3": 68,
    "A4+": 58,
    "A4": 50,
    "D": 8,
}

OUTLOOK_ADJUSTMENTS: dict[str, float] = {
    "positive": 4,
    "stable": 0,
    "negative": -6,
    "developing": -3,
}


def crisil_rating_to_score(rating: str, outlook: str | None = None) -> float:
    """Convert CRISIL rating string to a 0-100 score."""
    normalized = rating.upper().strip().replace(" ", "")
    score = CRISIL_LONG_TERM_SCORES.get(normalized)
    if score is None:
        score = CRISIL_SHORT_TERM_SCORES.get(normalized)
    if score is None:
        # Partial match for variants like "CRISIL A-" or "A- (Stable)"
        for key, val in {**CRISIL_LONG_TERM_SCORES, **CRISIL_SHORT_TERM_SCORES}.items():
            if key in normalized:
                score = val
                break
    if score is None:
        return 55.0

    if outlook:
        score += OUTLOOK_ADJUSTMENTS.get(outlook.lower().strip(), 0)
    return max(0.0, min(100.0, score))
