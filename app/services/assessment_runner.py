"""Shared assessment execution for platform routes."""

from __future__ import annotations

import logging

from fastapi import HTTPException

from app.data.sample_msme import build_demo_request
from app.models.schemas import AssessmentRequest, AudienceRole, FinancialHealthScoreResult
from app.services.carbon_intelligence import CarbonIntelligenceError, carbon_client
from app.services.enrichment import enrich_financial_data
from app.services.scoring_engine import scoring_engine

logger = logging.getLogger(__name__)


async def run_assessment(request: AssessmentRequest) -> FinancialHealthScoreResult:
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
                    detail="Carbon Intelligence API authentication failed.",
                ) from exc
            if exc.status_code != 404:
                raise HTTPException(status_code=502, detail=f"Carbon Intelligence error: {exc}") from exc

    enrichment_log = None
    if request.auto_enrich:
        request.financial_data, enrichment_log = await enrich_financial_data(request.financial_data)
    return scoring_engine.assess(request, carbon_data, enrichment_log)


async def run_demo_assessment_for_msme(msme_id: str, audience: AudienceRole) -> FinancialHealthScoreResult:
    """Run assessment using demo data for known MSME IDs."""
    if msme_id == "msme-demo-001":
        request = build_demo_request(audience=audience)
    else:
        from app.data.sample_msme import build_minimal_request

        request = build_minimal_request(
            msme_id=msme_id,
            business_name=f"Portfolio MSME {msme_id}",
            annual_revenue=25_000_000,
            audience=audience,
        )
    return await run_assessment(request)
