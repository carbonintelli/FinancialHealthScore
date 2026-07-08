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
    assert len(result.dimension_scores) == 15
    assert result.carbon_intelligence is not None
    assert result.carbon_intelligence.source == "ci.sustainow.in"
    assert len(result.key_insights) > 0
    assert result.government_policy_assessment is not None
    assert result.government_policy_assessment.enrolled_count >= 1
    assert isinstance(result.data_gaps, list)


def test_credit_history_dimension(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)
    credit_dim = next(d for d in result.dimension_scores if d.dimension == "credit_history_debt_servicing")
    assert credit_dim.score > 0
    assert any(i.indicator == "CRISIL Rating" for i in credit_dim.insights)
    assert any(i.indicator == "Past Debt Repayment" for i in credit_dim.insights)
    assert any(i.indicator == "EMI Repayment Discipline" for i in credit_dim.insights)


def test_data_gaps_identified_for_minimal_input():
    from app.data.sample_msme import build_minimal_request

    result = scoring_engine.assess(build_minimal_request("x", "Test Co", 5_000_000))
    assert len(result.data_gaps) > 0
    gap_fields = {g.field for g in result.data_gaps}
    assert "credit_bureau" in gap_fields
    assert "founder" in gap_fields
    assert any(g.severity == "high" for g in result.data_gaps)


def test_crisil_rating_scoring():
    from app.services.credit_ratings import crisil_rating_to_score

    assert crisil_rating_to_score("AAA") > crisil_rating_to_score("BBB+")
    assert crisil_rating_to_score("A-", "positive") > crisil_rating_to_score("A-", "negative")


def test_legal_tax_governance_dimensions(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)
    legal = next(d for d in result.dimension_scores if d.dimension == "legal_compliance")
    tax = next(d for d in result.dimension_scores if d.dimension == "tax_compliance")
    certs = next(d for d in result.dimension_scores if d.dimension == "operational_certifications")
    gov = next(d for d in result.dimension_scores if d.dimension == "governance_diversity")
    assert legal.score > 0
    assert tax.score > 0
    assert certs.score > 0
    assert gov.score > 0
    assert any(i.indicator == "ITR Filing Compliance" for i in tax.insights)
    assert any(i.indicator == "Female Directors" for i in gov.insights)
    assert result.metadata.get("governance_score_bonus", 0) > 0
    assert len(result.recommended_improvements) > 0


def test_founder_capability_dimension(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)
    founder_dim = next(d for d in result.dimension_scores if d.dimension == "founder_capability")
    assert founder_dim.score > 0
    assert any(i.indicator == "Industry Experience" for i in founder_dim.insights)


def test_market_sentiment_dimension(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)
    sentiment_dim = next(d for d in result.dimension_scores if d.dimension == "market_sentiment")
    assert sentiment_dim.score > 0
    assert any(i.indicator == "Customer NPS" for i in sentiment_dim.insights)


def test_product_demand_dimension(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)
    product_dim = next(d for d in result.dimension_scores if d.dimension == "product_demand_outlook")
    assert product_dim.score > 0
    assert any(i.indicator == "Product Portfolio" for i in product_dim.insights)


def test_government_policy_alignment(demo_request, mock_carbon_data):
    result = scoring_engine.assess(demo_request, mock_carbon_data)
    policy = result.government_policy_assessment
    assert policy.overall_alignment_score > 0
    assert len(policy.policy_insights) > 0
    assert any(p.code == "PLI_AUTO" for p in policy.policy_insights)
    policy_dim = next(d for d in result.dimension_scores if d.dimension == "government_policy_alignment")
    assert policy_dim.score >= policy.overall_alignment_score


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
    assert data["government_policy_assessment"] is not None
    assert len(data["dimension_scores"]) == 15
    assert "recommended_improvements" in data
    assert "data_gaps" in data
    credit_dim = next(d for d in data["dimension_scores"] if d["dimension"] == "credit_history_debt_servicing")
    assert credit_dim["score"] > 0


@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
    assert response.status_code == 200
    assert response.json()["competition"] == "IDBI Innovate 2026"
