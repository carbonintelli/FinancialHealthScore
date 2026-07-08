export type { AssessmentResult } from "./types.js";
export { assess } from "./engine.js";
export { buildDemoRequest } from "./demo-request.js";
export { runScoringAgents } from "./scoring-agents.js";
export { validateScorerCatalog } from "./dimensions/index.js";

import { assess } from "./engine.js";
import { buildDemoRequest } from "./demo-request.js";
import type { AssessmentResult } from "./types.js";

export function getMockCarbonData(msmeId: string) {
  return {
    carbon_summary: {
      businessName: msmeId === "msme-demo-001" ? "Shree Ganesh Auto Components Pvt Ltd" : `MSME ${msmeId}`,
      totalEmissionsTco2e: 142.5,
      scope1Tco2e: 38.2,
      scope2Tco2e: 52.8,
      scope3Tco2e: 51.5,
      carbonIntensityKgPerRevenue: 0.42,
      energyCostSharePct: 12.4,
      assessmentDate: "2026-06-15",
      dataCompletenessPct: 78,
    },
    transactions_summary: {
      avgMonthlyInflowInr: 4_100_000,
      avgMonthlyOutflowInr: 3_750_000,
      inflowVolatilityPct: 18.5,
      onTimePaymentRatePct: 80,
      paymentRecordCount: 5,
      latePaymentRatePct: 8.2,
      supplierConcentrationTop3Pct: 42,
      customerConcentrationTop3Pct: 38.5,
    },
    reports_overview: { reportingReadiness: "partial", brsrLiteReady: false, transitionPlanDocumented: false },
    mock_data: true,
  };
}

export async function assessDemo(audience = "credit_team", carbonData?: unknown): Promise<AssessmentResult> {
  return assess(buildDemoRequest(audience), {
    carbonData: (carbonData ?? getMockCarbonData("msme-demo-001")) as Record<string, unknown>,
  });
}

export async function assessRequest(
  request: unknown,
  carbonData?: unknown,
  enrichmentLog?: unknown,
): Promise<AssessmentResult> {
  return assess(request as Parameters<typeof assess>[0], {
    carbonData: carbonData as Record<string, unknown> | undefined,
    enrichmentLog: enrichmentLog as Record<string, unknown> | undefined,
  });
}
