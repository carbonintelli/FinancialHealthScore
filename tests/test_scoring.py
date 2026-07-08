"""Tests for Financial Health Score scoring engine and API."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.data.sample_msme import build_demo_request
from app.main import app
from app.services.scoring_engine import scoring_engine


@pytest.fixture
def demo_request():
    return build_demo_request()


@pytest.fixture
def mock_carbon_data():
    return {
        "msme_id": "msme-demo-001",
        "carbon_summary": {
            "totalEmissionsTco2e": 142.5,
            "scope1Tco2e": 38.2,
            "scope2Tco2e": 52.8,
            "scope3Tco2e": 51.5,
            "carbonIntensityKgPerRevenue": 0.42,
            "energyCostSharePct": 12.4,
            "assessmentDate": "2026-06-15",
            "dataCompletenessPct": 78,
        },
        "transactions_summary": {
            "avgMonthlyInflowInr": 4_250_000,
            "avgMonthlyOutflowInr": 3_890_000,
            "inflowVolatilityPct": 18.5,
            "latePaymentRatePct": 8.2,
            "supplierConcentrationTop3Pct": 42.0,
            "customerConcentrationTop3Pct": 38.5,
            "energySpendSharePct": 11.8,
        },
        "reports_overview": {
            "reportingReadiness": "partial",
            "brsrLiteReady": False,
            "transitionPlanDocumented": False,
        },
        "mock_data": True,
    }


def test_scoring_engine_produces_valid_score(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)

    assert 0 <= result.overall_score <= 100
    assert result.grade in {"A+", "A", "B+", "B", "C+", "C", "D", "F"}
    assert len(result.dimension_scores) == 6
    assert result.carbon_intelligence is not None
    assert result.carbon_intelligence.source == "ci.sustainow.in"
    assert len(result.key_insights) > 0


def test_dimension_weights_sum_to_one():
    from app.services.scoring_engine import ScoringEngine

    assert abs(sum(ScoringEngine.DIMENSION_WEIGHTS.values()) - 1.0) < 0.001


@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


@pytest.mark.asyncio
async def test_demo_assessment_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/assess/demo")
    assert response.status_code == 200
    data = response.json()
    assert "overall_score" in data
    assert data["business_name"] == "Shree Ganesh Auto Components Pvt Ltd"
    assert data["carbon_intelligence"]["mock_data"] is True


@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["competition"] == "IDBI Innovate 2026"
