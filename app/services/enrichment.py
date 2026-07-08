"""Orchestrates auto-enrichment from external integrations before scoring."""

from __future__ import annotations

import logging
from typing import Any

from app.models.schemas import (
    CreditBureauProfile,
    FinancialDataInput,
    LegalComplianceProfile,
    TaxComplianceProfile,
)
from app.services.integrations import (
    IntegrationError,
    bureau_client,
    document_client,
    legal_client,
    tax_client,
)

logger = logging.getLogger(__name__)


async def enrich_financial_data(fd: FinancialDataInput) -> tuple[FinancialDataInput, dict[str, Any]]:
    """
    Auto-fetch bureau, tax, legal, and document data when identifiers are present.
    Returns enriched FinancialDataInput and enrichment metadata.
    """
    profile = fd.profile
    enrichment_log: dict[str, Any] = {
        "applied": [],
        "skipped": [],
        "errors": [],
        "mock_mode": True,
    }

    gstin = profile.gstin
    pan = profile.pan
    business_name = profile.business_name

    # Credit bureau pull
    if gstin or pan:
        try:
            bureau = await bureau_client.pull_commercial_report(gstin, pan, business_name)
            enrichment_log["applied"].append("credit_bureau")
            enrichment_log["mock_mode"] = bureau.get("mock", True)
            if bureau.get("data") and not fd.credit_bureau:
                d = bureau["data"]
                fd.credit_bureau = CreditBureauProfile(
                    crisil_rating=d.get("crisilRating"),
                    crisil_outlook=d.get("crisilOutlook"),
                    commercial_credit_score=d.get("cmrRank"),
                )
            elif bureau.get("data") and fd.credit_bureau:
                d = bureau["data"]
                if not fd.credit_bureau.crisil_rating:
                    fd.credit_bureau.crisil_rating = d.get("crisilRating")
                if not fd.credit_bureau.commercial_credit_score:
                    fd.credit_bureau.commercial_credit_score = d.get("cmrRank")
        except IntegrationError as exc:
            enrichment_log["errors"].append({"source": exc.source, "message": str(exc)})
    else:
        enrichment_log["skipped"].append("credit_bureau: no gstin/pan")

    # Tax verification
    if gstin or pan:
        try:
            tax = await tax_client.verify(gstin, pan)
            enrichment_log["applied"].append("tax_verification")
            if tax.get("data"):
                d = tax["data"]
                if not fd.tax_compliance:
                    fd.tax_compliance = TaxComplianceProfile(
                        itr_filed_on_time_3y=d.get("itrFiledOnTime3y"),
                        advance_tax_compliance_pct=100 if d.get("advanceTaxCompliant") else 70,
                        tds_compliance_pct=d.get("tdsCompliancePct"),
                        gst_filing_compliance_pct=d.get("gstFilingCompliancePct"),
                        tax_demand_outstanding_inr=d.get("outstandingDemandInr", 0),
                    )
                if fd.government_policy and not fd.government_policy.gst_filing_compliance_pct:
                    fd.government_policy.gst_filing_compliance_pct = d.get("gstFilingCompliancePct")
        except IntegrationError as exc:
            enrichment_log["errors"].append({"source": exc.source, "message": str(exc)})
    else:
        enrichment_log["skipped"].append("tax_verification: no gstin/pan")

    # Legal search
    directors = []
    if fd.founder and fd.founder.name:
        directors.append(fd.founder.name)
    try:
        legal = await legal_client.search(business_name, directors)
        enrichment_log["applied"].append("legal_search")
        if legal.get("data") and not fd.legal_compliance:
            d = legal["data"]
            fd.legal_compliance = LegalComplianceProfile(
                pending_cases_company=d.get("pendingCompanyCases", 0),
                pending_cases_founders=d.get("pendingDirectorCases", 0),
                resolved_favorable_pct=d.get("resolvedFavorablePct"),
                regulatory_penalties_3y=d.get("regulatoryPenalties3y", 0),
                criminal_cases_pending=d.get("criminalCases", 0),
            )
    except IntegrationError as exc:
        enrichment_log["errors"].append({"source": exc.source, "message": str(exc)})

    # Document intelligence
    if fd.documents:
        try:
            docs = [d.model_dump() if hasattr(d, "model_dump") else d for d in fd.documents]
            doc_result = await document_client.validate_documents(docs)
            enrichment_log["applied"].append("document_intelligence")
            enrichment_log["document_validation"] = doc_result.get("data")
        except IntegrationError as exc:
            enrichment_log["errors"].append({"source": exc.source, "message": str(exc)})
    else:
        enrichment_log["skipped"].append("document_intelligence: no documents")

    return fd, enrichment_log
