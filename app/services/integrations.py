"""External data integration clients with mock mode for demo."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class IntegrationError(Exception):
    def __init__(self, message: str, source: str):
        super().__init__(message)
        self.source = source


class CreditBureauClient:
    """CIBIL / CRISIL commercial bureau pull (mock when no API key)."""

    def __init__(self, api_key: str | None = None, use_mock: bool | None = None):
        self.api_key = api_key if api_key is not None else settings.credit_bureau_api_key
        self.base_url = settings.credit_bureau_base_url
        self.use_mock = use_mock if use_mock is not None else settings.use_mock_integrations

    async def pull_commercial_report(self, gstin: str | None, pan: str | None, business_name: str) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_report(gstin, pan, business_name)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/v1/commercial-report",
                headers={"X-API-Key": self.api_key, "Accept": "application/json"},
                json={"gstin": gstin, "pan": pan, "businessName": business_name},
            )
            if response.status_code >= 400:
                raise IntegrationError(f"Bureau API error: {response.status_code}", "credit_bureau")
            return response.json()

    def _mock_report(self, gstin: str | None, pan: str | None, business_name: str) -> dict[str, Any]:
        return {
            "success": True,
            "mock": True,
            "source": "cibil_crisil_mock",
            "data": {
                "businessName": business_name,
                "gstin": gstin,
                "pan": pan,
                "crisilRating": "BBB+",
                "crisilOutlook": "stable",
                "cmrRank": 3,
                "totalExposureInr": 12_000_000,
                "activeAccounts": 3,
                "overdueAccounts": 0,
                "lastPullDate": "2026-07-01",
            },
        }


class TaxVerificationClient:
    """GSTN / Income Tax verification (mock when no API key)."""

    def __init__(self, api_key: str | None = None, use_mock: bool | None = None):
        self.api_key = api_key if api_key is not None else settings.tax_api_key
        self.use_mock = use_mock if use_mock is not None else settings.use_mock_integrations

    async def verify(self, gstin: str | None, pan: str | None) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_verification(gstin, pan)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.tax_api_base_url}/v1/verify",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"gstin": gstin, "pan": pan},
            )
            if response.status_code >= 400:
                raise IntegrationError(f"Tax API error: {response.status_code}", "tax_verification")
            return response.json()

    def _mock_verification(self, gstin: str | None, pan: str | None) -> dict[str, Any]:
        return {
            "success": True,
            "mock": True,
            "source": "gstn_itr_mock",
            "data": {
                "gstin": gstin,
                "pan": pan,
                "gstFilingCompliancePct": 96.0,
                "itrFiledOnTime3y": 3,
                "advanceTaxCompliant": True,
                "tdsCompliancePct": 97.0,
                "outstandingDemandInr": 0,
                "lastVerified": "2026-07-05",
            },
        }


class LegalSearchClient:
    """e-Courts / MCA litigation search (mock when no API key)."""

    def __init__(self, api_key: str | None = None, use_mock: bool | None = None):
        self.api_key = api_key if api_key is not None else settings.legal_api_key
        self.use_mock = use_mock if use_mock is not None else settings.use_mock_integrations

    async def search(self, business_name: str, directors: list[str] | None = None) -> dict[str, Any]:
        if not self.api_key and self.use_mock:
            return self._mock_search(business_name, directors)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.legal_api_base_url}/v1/litigation-search",
                headers={"X-API-Key": self.api_key},
                json={"entityName": business_name, "directors": directors or []},
            )
            if response.status_code >= 400:
                raise IntegrationError(f"Legal API error: {response.status_code}", "legal_search")
            return response.json()

    def _mock_search(self, business_name: str, directors: list[str] | None) -> dict[str, Any]:
        return {
            "success": True,
            "mock": True,
            "source": "ecourts_mca_mock",
            "data": {
                "entityName": business_name,
                "pendingCompanyCases": 0,
                "pendingDirectorCases": 0,
                "criminalCases": 0,
                "resolvedLast3y": 1,
                "resolvedFavorablePct": 100.0,
                "regulatoryPenalties3y": 0,
                "lastSearchDate": "2026-07-06",
            },
        }


class DocumentIntelligenceClient:
    """OCR validation for ITR, audit reports, bank statements."""

    def __init__(self, api_key: str | None = None, use_mock: bool | None = None):
        self.api_key = api_key if api_key is not None else settings.document_api_key
        self.use_mock = use_mock if use_mock is not None else settings.use_mock_integrations

    async def validate_documents(self, documents: list[dict[str, Any]]) -> dict[str, Any]:
        if not documents:
            return {"success": True, "data": {"validated": 0, "results": []}}
        if not self.api_key and self.use_mock:
            return self._mock_validation(documents)
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{settings.document_api_base_url}/v1/validate",
                headers={"X-API-Key": self.api_key},
                json={"documents": documents},
            )
            if response.status_code >= 400:
                raise IntegrationError(f"Document API error: {response.status_code}", "document_intelligence")
            return response.json()

    def _mock_validation(self, documents: list[dict[str, Any]]) -> dict[str, Any]:
        results = []
        for doc in documents:
            doc_type = doc.get("document_type", "unknown")
            results.append({
                "documentType": doc_type,
                "fileName": doc.get("file_name", "document.pdf"),
                "extracted": True,
                "confidence": 0.92,
                "fieldsMatched": 8,
                "fieldsTotal": 9,
                "anomalies": [],
                "status": "verified",
            })
        return {
            "success": True,
            "mock": True,
            "source": "document_intelligence_mock",
            "data": {
                "validated": len(results),
                "overallConfidence": 0.92,
                "results": results,
            },
        }


bureau_client = CreditBureauClient()
tax_client = TaxVerificationClient()
legal_client = LegalSearchClient()
document_client = DocumentIntelligenceClient()
