import { config } from "../../config.js";

export class CarbonIntelligenceError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CarbonFullIntelligence {
  msme_id: string;
  carbon_summary: Record<string, unknown>;
  transactions_summary: Record<string, unknown>;
  reports_overview: Record<string, unknown>;
  mock_data: boolean;
  source: string;
}

export interface SustainabilityReport {
  msme_id: string;
  source: string;
  generated_at: string;
  sustainability_score: number;
  grade: string;
  carbon_footprint: {
    total_emissions_tco2e: number | null;
    scope1_tco2e: number | null;
    scope2_tco2e: number | null;
    scope3_tco2e: number | null;
    carbon_intensity_kg_per_revenue: number | null;
    energy_cost_share_pct: number | null;
  };
  reporting: {
    readiness: string | null;
    ghg_protocol_aligned: boolean;
    brsr_lite_ready: boolean;
    transition_plan_documented: boolean;
    missing_data_categories: string[];
    last_report_generated: string | null;
  };
  transition_risk_score: number;
  recommendations: string[];
  mock_data: boolean;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (config.carbonApiKey) h["X-API-Key"] = config.carbonApiKey;
  return h;
}

async function ciRequest(path: string): Promise<Record<string, unknown>> {
  const url = `${config.carbonBaseUrl.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, { headers: headers() });
  if (res.status === 404) throw new CarbonIntelligenceError("MSME not found in Carbon Intelligence", 404);
  if (res.status === 401) throw new CarbonIntelligenceError("Invalid Carbon Intelligence API key", 401);
  if (!res.ok) {
    const body = await res.text();
    throw new CarbonIntelligenceError(`Carbon Intelligence API error (${res.status}): ${body.slice(0, 300)}`, res.status);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

function unwrap(data: Record<string, unknown>): Record<string, unknown> {
  return (data.data as Record<string, unknown>) ?? data;
}

function mockCarbonSummary(msmeId: string) {
  const profiles: Record<string, Record<string, unknown>> = {
    "msme-demo-001": {
      totalEmissionsTco2e: 142.5,
      scope1Tco2e: 38.2,
      scope2Tco2e: 52.8,
      scope3Tco2e: 51.5,
      carbonIntensityKgPerRevenue: 0.42,
      energyCostSharePct: 12.4,
      assessmentDate: "2026-06-15",
      dataCompletenessPct: 78,
    },
    "msme-demo-002": {
      totalEmissionsTco2e: 89.3,
      scope1Tco2e: 22.1,
      scope2Tco2e: 41.6,
      scope3Tco2e: 25.6,
      carbonIntensityKgPerRevenue: 0.28,
      energyCostSharePct: 8.7,
      assessmentDate: "2026-06-20",
      dataCompletenessPct: 85,
    },
  };
  return profiles[msmeId] ?? {
    totalEmissionsTco2e: 115.0,
    scope1Tco2e: 30.0,
    scope2Tco2e: 45.0,
    scope3Tco2e: 40.0,
    carbonIntensityKgPerRevenue: 0.35,
    energyCostSharePct: 10.5,
    assessmentDate: "2026-06-01",
    dataCompletenessPct: 70,
  };
}

function mockTransactions() {
  return {
    periodMonths: 12,
    totalTransactionCount: 1847,
    avgMonthlyInflowInr: 4_250_000,
    avgMonthlyOutflowInr: 3_890_000,
    inflowVolatilityPct: 18.5,
    outflowVolatilityPct: 14.2,
    energySpendSharePct: 11.8,
    supplierConcentrationTop3Pct: 42.0,
    customerConcentrationTop3Pct: 38.5,
    latePaymentRatePct: 8.2,
    onTimePaymentRatePct: 91.8,
    paymentRecordCount: 5,
  };
}

function mockReports() {
  return {
    reportingReadiness: "partial",
    brsrLiteReady: false,
    ghgProtocolAligned: true,
    lastReportGenerated: "2026-05-28",
    missingDataCategories: ["scope3_upstream", "waste_disposal"],
    transitionPlanDocumented: false,
  };
}

export async function getIntegrationCatalog() {
  if (!config.carbonApiKey) {
    return {
      success: true,
      mock: true,
      data: {
        version: "v1",
        authentication: { type: "api_key", header: "X-API-Key" },
        endpoints: [
          "GET /v1/partners/msmes/:id/carbon-summary",
          "GET /v1/partners/msmes/:id/transactions/summary",
          "GET /v1/partners/msmes/:id/reports/overview",
        ],
      },
    };
  }
  return ciRequest("/v1/public/integration-catalog");
}

export async function fetchFullIntelligence(msmeId: string): Promise<CarbonFullIntelligence> {
  if (!config.carbonApiKey) {
    return {
      msme_id: msmeId,
      carbon_summary: mockCarbonSummary(msmeId),
      transactions_summary: mockTransactions(),
      reports_overview: mockReports(),
      mock_data: true,
      source: "ci.sustainow.in",
    };
  }

  const [carbon, transactions, reports] = await Promise.all([
    ciRequest(`/v1/partners/msmes/${encodeURIComponent(msmeId)}/carbon-summary`),
    ciRequest(`/v1/partners/msmes/${encodeURIComponent(msmeId)}/transactions/summary`),
    ciRequest(`/v1/partners/msmes/${encodeURIComponent(msmeId)}/reports/overview`),
  ]);

  return {
    msme_id: msmeId,
    carbon_summary: unwrap(carbon),
    transactions_summary: unwrap(transactions),
    reports_overview: unwrap(reports),
    mock_data: false,
    source: "ci.sustainow.in",
  };
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  return "C";
}

/** Composite sustainability score from ci.sustainow.in carbon + reporting signals. */
export function buildSustainabilityReport(msmeId: string, intel: CarbonFullIntelligence): SustainabilityReport {
  const carbon = intel.carbon_summary;
  const reports = intel.reports_overview;
  const txn = intel.transactions_summary;

  const intensity = Number(carbon.carbonIntensityKgPerRevenue ?? 0.35);
  const completeness = Number(carbon.dataCompletenessPct ?? 70);
  const transitionRisk = Math.max(0, Math.min(100, 100 - intensity * 80));
  const reportingBonus =
    reports.reportingReadiness === "complete" ? 15 : reports.reportingReadiness === "partial" ? 8 : 0;
  const ghgBonus = reports.ghgProtocolAligned ? 10 : 0;
  const planBonus = reports.transitionPlanDocumented ? 8 : 0;
  const paymentBonus = Math.min(10, Number(txn.onTimePaymentRatePct ?? 80) / 10);

  const sustainabilityScore = Math.round(
    Math.min(100, transitionRisk * 0.45 + completeness * 0.25 + reportingBonus + ghgBonus + planBonus + paymentBonus)
  );

  const recommendations: string[] = [];
  if (!reports.transitionPlanDocumented) recommendations.push("Document a carbon transition plan for green finance eligibility");
  if (reports.reportingReadiness !== "complete") recommendations.push("Complete BRSR-lite / GHG inventory for higher sustainability score");
  if (intensity > 0.4) recommendations.push("Reduce carbon intensity below 0.40 kgCO₂/₹ through energy efficiency");
  if (Array.isArray(reports.missingDataCategories) && reports.missingDataCategories.length) {
    recommendations.push(`Close data gaps: ${(reports.missingDataCategories as string[]).join(", ")}`);
  }

  return {
    msme_id: msmeId,
    source: "ci.sustainow.in",
    generated_at: new Date().toISOString(),
    sustainability_score: sustainabilityScore,
    grade: scoreToGrade(sustainabilityScore),
    carbon_footprint: {
      total_emissions_tco2e: (carbon.totalEmissionsTco2e as number) ?? null,
      scope1_tco2e: (carbon.scope1Tco2e as number) ?? null,
      scope2_tco2e: (carbon.scope2Tco2e as number) ?? null,
      scope3_tco2e: (carbon.scope3Tco2e as number) ?? null,
      carbon_intensity_kg_per_revenue: intensity,
      energy_cost_share_pct: (carbon.energyCostSharePct as number) ?? (txn.energySpendSharePct as number) ?? null,
    },
    reporting: {
      readiness: (reports.reportingReadiness as string) ?? null,
      ghg_protocol_aligned: Boolean(reports.ghgProtocolAligned),
      brsr_lite_ready: Boolean(reports.brsrLiteReady),
      transition_plan_documented: Boolean(reports.transitionPlanDocumented),
      missing_data_categories: (reports.missingDataCategories as string[]) ?? [],
      last_report_generated: (reports.lastReportGenerated as string) ?? null,
    },
    transition_risk_score: Math.round(transitionRisk * 10) / 10,
    recommendations,
    mock_data: intel.mock_data,
  };
}
