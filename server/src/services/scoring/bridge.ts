import { spawn } from "child_process";
import path from "path";
import { config } from "../../config.js";

export interface AssessmentResult {
  assessment_id: string;
  business_name: string;
  msme_id?: string;
  generated_at: string;
  overall_score: number;
  overall_risk_level: string;
  overall_confidence: string;
  grade: string;
  dimension_scores: unknown[];
  risk_indicators: unknown[];
  key_insights: string[];
  green_finance_opportunities: string[];
  carbon_intelligence?: unknown;
  government_policy_assessment?: unknown;
  data_gaps: unknown[];
  recommended_improvements: string[];
  advanced_intelligence?: unknown;
  audience_summary: string;
  metadata: Record<string, unknown>;
}

export function runPythonScoring(payload: Record<string, unknown>): Promise<AssessmentResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.pythonPath, [config.scoringBridgePath], {
      cwd: config.rootPath,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Scoring bridge failed: ${stderr}`));
      try {
        resolve(JSON.parse(stdout) as AssessmentResult);
      } catch (e) {
        reject(new Error(`Invalid scoring output: ${stdout.slice(0, 200)}`));
      }
    });
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

export async function assessDemo(audience = "credit_team", carbonData?: unknown): Promise<AssessmentResult> {
  return runPythonScoring({ mode: "demo", audience, carbon_data: carbonData ?? getMockCarbonData("msme-demo-001") });
}

export async function assessRequest(request: unknown, carbonData?: unknown, enrichmentLog?: unknown): Promise<AssessmentResult> {
  return runPythonScoring({ mode: "assess", request, carbon_data: carbonData, enrichment_log: enrichmentLog });
}

export function getMockCarbonData(msmeId: string) {
  return {
    carbon_summary: { businessName: msmeId === "msme-demo-001" ? "Shree Ganesh Auto Components Pvt Ltd" : `MSME ${msmeId}`, totalEmissionsTco2e: 142.5 },
    transactions_summary: {
      avgMonthlyInflowInr: 4100000,
      avgMonthlyOutflowInr: 3750000,
      inflowVolatilityPct: 18.5,
      onTimePaymentRatePct: 80,
      paymentRecordCount: 5,
    },
    reports_overview: { reportingReadiness: "partial", transitionPlanDocumented: false },
  };
}
