"""API assessment endpoint tests."""

import pytest

from tests.conftest import api_client  # noqa: F401


@pytest.mark.asyncio
async def test_post_assess_full_payload(api_client):
    import json
    from pathlib import Path

    payload = json.loads(Path("examples/assessment_request.json").read_text())
    payload["auto_enrich"] = False
    r = await api_client.post("/api/v1/assess", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["business_name"] == "Shree Ganesh Auto Components Pvt Ltd"
    assert len(data["dimension_scores"]) == 20
    assert data["advanced_intelligence"] is not None


@pytest.mark.asyncio
async def test_assess_audience_variants(api_client):
    for audience in ("credit_team", "risk_team", "relationship_manager", "portfolio_analyst"):
        r = await api_client.get("/api/v1/assess/demo", params={"audience": audience})
        assert r.status_code == 200
        assert audience.replace("_", " ") in r.json()["audience_summary"].lower() or audience.split("_")[0] in r.json()["audience_summary"].lower()


@pytest.mark.asyncio
async def test_legal_search_endpoint(api_client):
    r = await api_client.post(
        "/api/v1/integrations/legal/search",
        params={"business_name": "Shree Ganesh Auto Components Pvt Ltd"},
    )
    assert r.status_code == 200
    assert r.json()["data"]["pendingCompanyCases"] == 0


@pytest.mark.asyncio
async def test_policies_catalog_sectors(api_client):
    for sector in ("auto_components", "textiles", "general"):
        r = await api_client.get("/api/v1/policies/catalog", params={"sector": sector})
        assert r.status_code == 200
        assert r.json()["count"] >= 1
