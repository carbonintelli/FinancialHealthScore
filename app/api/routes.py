"""API route handlers for Financial Health Score."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    AssessmentRequest,
    AudienceRole,
    FinancialHealthScoreResult,
    HealthResponse,
    IntegrationInfo,
)
from app.config import settings
from app.services.carbon_intelligence import CarbonIntelligenceClient, CarbonIntelligenceError, carbon_client
from app.services.scoring_engine import scoring_engine

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1")


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Service health and integration status."""
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        carbon_intelligence_connected=settings.has_carbon_api_key,
        mock_mode=not settings.has_carbon_api_key and settings.use_mock_carbon_data,
    )


@router.get("/integration", response_model=IntegrationInfo, tags=["System"])
async def integration_info():
    """Carbon Intelligence integration details for IDBI Innovate 2026."""
    return IntegrationInfo(
        carbon_intelligence_base_url=settings.carbon_intelligence_base_url,
        openapi_url="/openapi.json",
        partner_catalog_url=f"{settings.carbon_intelligence_base_url.rstrip('/')}/v1/public/integration-catalog",
        description=(
            "Financial Health Score ingests MSME financial and operational data, "
            "enriches with Sustainow Carbon Intelligence (ci.sustainow.in), "
            "and produces explainable credit decision intelligence."
        ),
    )


@router.post(
    "/assess",
    response_model=FinancialHealthScoreResult,
    tags=["Assessment"],
    summary="Generate Financial Health Score",
    description=(
        "Analyse consented MSME financial and operational data—including transactions, "
        "utility bills, accounting records, and business documents—to produce an explainable "
        "Financial Health Score with evidence-linked insights and confidence levels."
    ),
)
async def assess_msme(request: AssessmentRequest):
    """
    Full MSME financial health assessment.

    Tailored for credit teams, risk teams, and relationship managers.
    """
    carbon_data = None
    msme_id = request.financial_data.profile.msme_id

    if request.include_carbon_intelligence and msme_id:
        try:
            carbon_data = await carbon_client.fetch_full_intelligence(msme_id)
        except CarbonIntelligenceError as exc:
            logger.warning("Carbon Intelligence fetch failed for %s: %s", msme_id, exc)
            if exc.status_code == 401:
                raise HTTPException(
                    status_code=502,
                    detail="Carbon Intelligence API authentication failed. Check CARBON_INTELLIGENCE_API_KEY.",
                ) from exc
            if exc.status_code != 404:
                raise HTTPException(
                    status_code=502,
                    detail=f"Carbon Intelligence service error: {exc}",
                ) from exc

    return scoring_engine.assess(request, carbon_data)


@router.get(
    "/assess/demo",
    response_model=FinancialHealthScoreResult,
    tags=["Assessment"],
    summary="Demo assessment with sample MSME data",
)
async def demo_assessment(
    audience: AudienceRole = Query(AudienceRole.CREDIT_TEAM, description="Target audience for summary"),
):
    """Run a demonstration assessment using sample MSME data linked to Carbon Intelligence demo MSME."""
    from app.data.sample_msme import build_demo_request

    request = build_demo_request(audience=audience)
    carbon_data = await carbon_client.fetch_full_intelligence("msme-demo-001")
    return scoring_engine.assess(request, carbon_data)


@router.get(
    "/msme/{msme_id}/carbon",
    tags=["Carbon Intelligence"],
    summary="Fetch Carbon Intelligence data for an MSME",
)
async def get_carbon_intelligence(msme_id: str):
    """Proxy aggregated carbon intelligence from ci.sustainow.in."""
    try:
        return await carbon_client.fetch_full_intelligence(msme_id)
    except CarbonIntelligenceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc


@router.get(
    "/msme/{msme_id}/score",
    response_model=FinancialHealthScoreResult,
    tags=["Assessment"],
    summary="Score MSME using Carbon Intelligence data only",
    description="Generate a score when only Carbon Intelligence MSME ID is known (minimal financial input).",
)
async def score_from_carbon_only(
    msme_id: str,
    audience: AudienceRole = Query(AudienceRole.CREDIT_TEAM),
):
    """Lightweight scoring path for portfolio monitoring when only CI MSME ID is available."""
    from app.data.sample_msme import build_minimal_request

    try:
        carbon_data = await carbon_client.fetch_full_intelligence(msme_id)
    except CarbonIntelligenceError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc

    txn = carbon_data.get("transactions_summary", {})
    request = build_minimal_request(
        msme_id=msme_id,
        business_name=carbon_data.get("carbon_summary", {}).get("businessName", f"MSME {msme_id}"),
        annual_revenue=txn.get("avgMonthlyInflowInr", 5_000_000) * 12,
        audience=audience,
    )
    return scoring_engine.assess(request, carbon_data)


@router.get(
    "/carbon/catalog",
    tags=["Carbon Intelligence"],
    summary="Carbon Intelligence integration catalog",
)
async def carbon_integration_catalog():
    """Fetch public integration catalog from ci.sustainow.in."""
    try:
        return await carbon_client.get_integration_catalog()
    except CarbonIntelligenceError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get(
    "/policies/catalog",
    tags=["Government Policy"],
    summary="Government policy and scheme catalog for MSME assessment",
)
async def government_policy_catalog(sector: str = Query("general", description="MSME sector for filtering")):
    """Return applicable Indian government policies aligned with Financial Health Score."""
    from app.data.government_policies import get_applicable_policies

    policies = get_applicable_policies(sector)
    return {
        "sector": sector,
        "count": len(policies),
        "policies": [
            {
                "code": p.code,
                "name": p.name,
                "ministry": p.ministry,
                "description": p.description,
                "benefits": p.benefits,
                "eligibility_criteria": p.eligibility_criteria,
                "health_score_impact": p.health_score_impact,
            }
            for p in policies
        ],
    }
