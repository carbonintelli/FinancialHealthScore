"""Carbon Intelligence client for ci.sustainow.in Partner API."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class CarbonIntelligenceError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


class CarbonIntelligenceClient:
    """Client for Sustainow Carbon Intelligence Partner API (ci.sustainow.in)."""

    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        use_mock: bool | None = None,
    ):
        self.base_url = (base_url or settings.carbon_intelligence_base_url).rstrip("/")
        self.api_key = api_key if api_key is not None else settings.carbon_intelligence_api_key
        self.use_mock = use_mock if use_mock is not None else settings.use_mock_carbon_data

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(method, url, headers=self._headers(), **kwargs)
            if response.status_code == 404:
                raise CarbonIntelligenceError("MSME not found in Carbon Intelligence", 404)
            if response.status_code == 401:
                raise CarbonIntelligenceError("Invalid Carbon Intelligence API key", 401)
            if response.status_code >= 400:
                body = response.text[:500]
                raise CarbonIntelligenceError(
                    f"Carbon Intelligence API error ({response.status_code}): {body}",
                    response.status_code,
                )
            return response.json()

    async def get_integration_catalog(self) -> dict[str, Any]:
        return await self._request("GET", "/v1/public/integration-catalog")

    async def list_msmes(self, limit: int = 20) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_msme_list()
        return await self._request("GET", f"/v1/partners/msmes?limit={limit}")

    async def get_carbon_summary(self, msme_id: str) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_carbon_summary(msme_id)
        return await self._request("GET", f"/v1/partners/msmes/{msme_id}/carbon-summary")

    async def get_transactions_summary(self, msme_id: str) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_transactions_summary(msme_id)
        return await self._request("GET", f"/v1/partners/msmes/{msme_id}/transactions/summary")

    async def get_reports_overview(self, msme_id: str) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_reports_overview(msme_id)
        return await self._request("GET", f"/v1/partners/msmes/{msme_id}/reports/overview")

    async def fetch_full_intelligence(self, msme_id: str) -> dict[str, Any]:
        """Aggregate carbon, transaction, and reporting data for scoring."""
        carbon = await self.get_carbon_summary(msme_id)
        transactions = await self.get_transactions_summary(msme_id)
        reports = await self.get_reports_overview(msme_id)
        return {
            "msme_id": msme_id,
            "carbon_summary": carbon.get("data", carbon),
            "transactions_summary": transactions.get("data", transactions),
            "reports_overview": reports.get("data", reports),
            "mock_data": not bool(self.api_key) and self.use_mock,
        }

    def _mock_msme_list(self) -> dict[str, Any]:
        return {
            "success": True,
            "data": {
                "items": [
                    {"id": "msme-demo-001", "name": "Shree Ganesh Auto Components", "sector": "manufacturing"},
                    {"id": "msme-demo-002", "name": "Green Valley Foods Pvt Ltd", "sector": "food_processing"},
                ]
            },
            "mock": True,
        }

    def _mock_carbon_summary(self, msme_id: str) -> dict[str, Any]:
        profiles = {
            "msme-demo-001": {
                "totalEmissionsTco2e": 142.5,
                "scope1Tco2e": 38.2,
                "scope2Tco2e": 52.8,
                "scope3Tco2e": 51.5,
                "carbonIntensityKgPerRevenue": 0.42,
                "energyCostSharePct": 12.4,
                "assessmentDate": "2026-06-15",
                "dataCompletenessPct": 78,
            },
            "msme-demo-002": {
                "totalEmissionsTco2e": 89.3,
                "scope1Tco2e": 22.1,
                "scope2Tco2e": 41.6,
                "scope3Tco2e": 25.6,
                "carbonIntensityKgPerRevenue": 0.28,
                "energyCostSharePct": 8.7,
                "assessmentDate": "2026-06-20",
                "dataCompletenessPct": 85,
            },
        }
        data = profiles.get(
            msme_id,
            {
                "totalEmissionsTco2e": 115.0,
                "scope1Tco2e": 30.0,
                "scope2Tco2e": 45.0,
                "scope3Tco2e": 40.0,
                "carbonIntensityKgPerRevenue": 0.35,
                "energyCostSharePct": 10.5,
                "assessmentDate": "2026-06-01",
                "dataCompletenessPct": 70,
            },
        )
        return {"success": True, "data": data, "mock": True}

    def _mock_transactions_summary(self, msme_id: str) -> dict[str, Any]:
        return {
            "success": True,
            "data": {
                "periodMonths": 12,
                "totalTransactionCount": 1847,
                "avgMonthlyInflowInr": 4_250_000,
                "avgMonthlyOutflowInr": 3_890_000,
                "inflowVolatilityPct": 18.5,
                "outflowVolatilityPct": 14.2,
                "energySpendSharePct": 11.8,
                "supplierConcentrationTop3Pct": 42.0,
                "customerConcentrationTop3Pct": 38.5,
                "latePaymentRatePct": 8.2,
            },
            "mock": True,
        }

    def _mock_reports_overview(self, msme_id: str) -> dict[str, Any]:
        return {
            "success": True,
            "data": {
                "reportingReadiness": "partial",
                "brsrLiteReady": False,
                "ghgProtocolAligned": True,
                "lastReportGenerated": "2026-05-28",
                "missingDataCategories": ["scope3_upstream", "waste_disposal"],
                "transitionPlanDocumented": False,
            },
            "mock": True,
        }


carbon_client = CarbonIntelligenceClient()
