"""Sector peer benchmarks for MSME portfolio percentile scoring."""

from __future__ import annotations

# Median metrics by sector for Indian MSMEs (indicative benchmarks)
SECTOR_BENCHMARKS: dict[str, dict[str, float]] = {
    "auto_components": {
        "median_revenue_inr": 35_000_000,
        "median_current_ratio": 1.55,
        "median_debt_ratio": 0.38,
        "median_operating_margin_pct": 12.0,
        "median_dscr": 1.45,
        "median_carbon_intensity": 0.38,
        "cohort_size": 1240,
    },
    "manufacturing": {
        "median_revenue_inr": 28_000_000,
        "median_current_ratio": 1.48,
        "median_debt_ratio": 0.42,
        "median_operating_margin_pct": 10.5,
        "median_dscr": 1.35,
        "median_carbon_intensity": 0.42,
        "cohort_size": 8500,
    },
    "food_processing": {
        "median_revenue_inr": 22_000_000,
        "median_current_ratio": 1.40,
        "median_debt_ratio": 0.45,
        "median_operating_margin_pct": 9.0,
        "median_dscr": 1.30,
        "median_carbon_intensity": 0.35,
        "cohort_size": 3200,
    },
    "textiles": {
        "median_revenue_inr": 18_000_000,
        "median_current_ratio": 1.35,
        "median_debt_ratio": 0.48,
        "median_operating_margin_pct": 8.0,
        "median_dscr": 1.25,
        "median_carbon_intensity": 0.48,
        "cohort_size": 5600,
    },
    "services": {
        "median_revenue_inr": 12_000_000,
        "median_current_ratio": 1.60,
        "median_debt_ratio": 0.30,
        "median_operating_margin_pct": 15.0,
        "median_dscr": 1.55,
        "median_carbon_intensity": 0.15,
        "cohort_size": 12000,
    },
    "general": {
        "median_revenue_inr": 20_000_000,
        "median_current_ratio": 1.45,
        "median_debt_ratio": 0.40,
        "median_operating_margin_pct": 10.0,
        "median_dscr": 1.35,
        "median_carbon_intensity": 0.40,
        "cohort_size": 25000,
    },
}


def get_sector_benchmark(sector: str) -> dict[str, float]:
    key = sector.lower().strip().replace(" ", "_")
    return SECTOR_BENCHMARKS.get(key, SECTOR_BENCHMARKS["general"])


def estimate_percentile(value: float, median: float, higher_is_better: bool = True) -> float:
    """Estimate percentile vs sector median using log-normal proxy."""
    if median <= 0:
        return 50.0
    ratio = value / median
    if not higher_is_better:
        ratio = median / value if value > 0 else 0
    # Map ratio to percentile (simplified sigmoid)
    import math
    pct = 50 + 25 * math.tanh((ratio - 1) * 2)
    return max(1.0, min(99.0, pct))
