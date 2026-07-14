import { getDb } from "../db/index.js";
import type { AssessmentResult } from "./scoring/index.js";
import { orchestrateAssessment } from "./agents/orchestrator.js";
import type { OrchestrationResult } from "./agents/types.js";

export function saveAssessment(
  userId: number,
  result: AssessmentResult,
  audience: string,
  agentInsights?: unknown
): void {
  getDb()
    .prepare(
      `INSERT INTO assessment_records
       (assessment_id, msme_id, business_name, requested_by_user_id, audience, overall_score, grade, overall_risk_level, result_json, agent_insights_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      result.assessment_id,
      result.msme_id ?? "unknown",
      result.business_name,
      userId,
      audience,
      result.overall_score,
      result.grade,
      result.overall_risk_level,
      JSON.stringify(result),
      agentInsights ? JSON.stringify(agentInsights) : null
    );
}

export async function assessAndStore(
  userId: number,
  result: AssessmentResult,
  audience: string,
  runAgents = true
) {
  let agentInsights: OrchestrationResult | null = null;
  if (runAgents) {
    agentInsights = await orchestrateAssessment({
      msmeId: result.msme_id,
      businessName: result.business_name,
      assessment: result as unknown as Record<string, unknown>,
      sector: "auto_components",
      triggerSource: "assessment",
      audience,
    });
  }
  saveAssessment(userId, result, audience, agentInsights);
  return { result, agent_insights: agentInsights };
}

export function getAssessment(assessmentId: string) {
  return getDb().prepare("SELECT * FROM assessment_records WHERE assessment_id = ?").get(assessmentId) as
    | {
        result_json: string;
        agent_insights_json: string | null;
        msme_id: string;
        business_name: string;
        overall_score: number;
        grade: string;
        overall_risk_level: string;
        audience: string;
        created_at: string;
      }
    | undefined;
}

export function listAssessmentsForMsme(msmeId: string, limit = 20) {
  return getDb()
    .prepare("SELECT assessment_id, msme_id, business_name, overall_score, grade, overall_risk_level, audience, created_at, result_json, agent_insights_json FROM assessment_records WHERE msme_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(msmeId, limit) as AssessmentRow[];
}

export function listAssessmentsForBank(msmeIds: string[], limit = 50) {
  if (!msmeIds.length) return [];
  const placeholders = msmeIds.map(() => "?").join(",");
  return getDb()
    .prepare(`SELECT assessment_id, msme_id, business_name, overall_score, grade, overall_risk_level, audience, created_at, result_json, agent_insights_json FROM assessment_records WHERE msme_id IN (${placeholders}) ORDER BY created_at DESC LIMIT ?`)
    .all(...msmeIds, limit) as AssessmentRow[];
}

export interface AssessmentRow {
  assessment_id: string;
  msme_id: string;
  business_name: string;
  overall_score: number;
  grade: string;
  overall_risk_level: string;
  audience: string;
  created_at: string;
  result_json: string;
  agent_insights_json: string | null;
}

export function getPortfolioMsmeIds(bankOrgId: number): string[] {
  return (
    getDb()
      .prepare("SELECT msme_id FROM portfolio_links WHERE bank_org_id = ?")
      .all(bankOrgId) as { msme_id: string }[]
  ).map((r) => r.msme_id);
}

export function bankHasMsme(bankOrgId: number, msmeId: string): boolean {
  return !!getDb()
    .prepare("SELECT id FROM portfolio_links WHERE bank_org_id = ? AND msme_id = ?")
    .get(bankOrgId, msmeId);
}

export function getPortfolio(bankOrgId: number) {
  const links = getDb()
    .prepare("SELECT * FROM portfolio_links WHERE bank_org_id = ? ORDER BY business_name")
    .all(bankOrgId) as {
    msme_id: string;
    business_name: string;
    sector: string;
    gstin: string | null;
    relationship_manager: string | null;
    credit_limit_inr: number | null;
  }[];

  return links.map((link) => {
    const latest = getDb()
      .prepare("SELECT * FROM assessment_records WHERE msme_id = ? ORDER BY created_at DESC LIMIT 1")
      .get(link.msme_id) as ReturnType<typeof getAssessment> | undefined;
    return {
      ...link,
      latest_score: latest?.overall_score ?? null,
      latest_grade: latest?.grade ?? null,
      latest_risk_level: latest?.overall_risk_level ?? null,
      last_assessed_at: latest?.created_at ?? null,
    };
  });
}

export function getAllMsmesSummary() {
  return getDb()
    .prepare(
      `SELECT p.msme_id, p.business_name, p.sector,
              a.overall_score as latest_score, a.grade as latest_grade, a.overall_risk_level, a.created_at as last_assessed_at
       FROM portfolio_links p
       LEFT JOIN assessment_records a ON a.msme_id = p.msme_id
       GROUP BY p.msme_id
       ORDER BY p.business_name`
    )
    .all();
}
