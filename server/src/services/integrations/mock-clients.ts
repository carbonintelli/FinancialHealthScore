import { config } from "../../config.js";

export function pullBureauReport(
  gstin: string | undefined,
  pan: string | undefined,
  businessName: string
) {
  if (!config.useMockIntegrations) {
    throw new Error("Live bureau integration not configured — set USE_MOCK_INTEGRATIONS=true for demo");
  }
  return {
    success: true,
    mock: true,
    source: "cibil_crisil_mock",
    data: {
      businessName,
      gstin,
      pan,
      crisilRating: "BBB+",
      crisilOutlook: "stable",
      cmrRank: 3,
      totalExposureInr: 12_000_000,
      activeAccounts: 3,
      overdueAccounts: 0,
      lastPullDate: "2026-07-01",
    },
  };
}

export function verifyTax(gstin: string | undefined, pan: string | undefined) {
  if (!config.useMockIntegrations) {
    throw new Error("Live tax integration not configured — set USE_MOCK_INTEGRATIONS=true for demo");
  }
  return {
    success: true,
    mock: true,
    source: "gstn_itr_mock",
    data: {
      gstin,
      pan,
      gstFilingCompliancePct: 96.0,
      itrFiledOnTime3y: 3,
      advanceTaxCompliant: true,
      tdsCompliancePct: 97.0,
      outstandingDemandInr: 0,
      lastVerified: "2026-07-05",
    },
  };
}
