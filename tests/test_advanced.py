"""Tests for advanced scoring dimensions."""

import pytest

from app.data.sample_msme import build_demo_request
from app.services.advanced_scoring import advanced_scoring
from app.services.scoring_engine import ScoringEngine


def test_dimension_weights_sum_to_one():
    assert abs(sum(ScoringEngine.DIMENSION_WEIGHTS.values()) - 1.0) < 0.001
    assert len(ScoringEngine.DIMENSION_WEIGHTS) == 20


def test_peer_benchmark_scoring():
    request = build_demo_request()
    fd = request.financial_data
    dim = advanced_scoring.score_peer_benchmark(
        fd.profile, fd.accounting, fd.credit_bureau, None, 0.03
    )
    assert dim.score > 0
    assert dim.dimension == "peer_benchmark"


def test_geographic_risk_maharashtra():
    from app.models.schemas import GeographicProfile

    dim = advanced_scoring.score_geographic_risk(
        GeographicProfile(state="maharashtra", tier="tier2", industrial_cluster_presence=True),
        build_demo_request().financial_data.profile,
        0.03,
    )
    assert dim.score >= 75


def test_supply_chain_stress():
    from app.models.schemas import SupplyChainProfile

    dim = advanced_scoring.score_supply_chain_resilience(
        SupplyChainProfile(stress_scenario_survival_months=4.5, alternate_suppliers_identified_pct=75),
        None, None, 0.04,
    )
    assert dim.score > 60
