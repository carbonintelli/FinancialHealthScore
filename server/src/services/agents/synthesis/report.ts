import { v4 as uuidv4 } from "uuid";
import type {
  AgentContext,
  DimensionAgentResult,
  HealthScoreAgentResult,
  ReportAgentResult,
  RiskSynthesisResult,
} from "../types.js";
import { maybeLlm } from "../types.js";
import { logAgentRun } from "../logger.js";

function creditDecision(score: number, risk: string): string {
  if (score >= 80 && ["low", "moderate"].includes(risk))
    return `RECOMMEND APPROVAL — Score ${score.toFixed(1)}/100 with ${risk} composite risk. Standard MSME terms with optional green-finance pricing.`;
  if (score >= 65)
    return `CONDITIONAL APPROVAL — Score ${score.toFixed(1)}/100. Secured facility or CGTMSE guarantee with covenant monitoring.`;
  if (score >= 50)
    return `ENHANCED DUE DILIGENCE — Score ${score.toFixed(1)}/100. Additional collateral and shorter tenure recommended.`;
  return `DECLINE / DEFER — Score ${score.toFixed(1)}/100 below threshold. Capability building and re-assessment in 6 months.`;
}

export async function synthesizeReport(
  ctx: AgentContext,
  dimensionAgents: DimensionAgentResult[],
  riskSynthesis: RiskSynthesisResult,
  healthScore: HealthScoreAgentResult,
  assessment: Record<string, unknown>
): Promise<ReportAgentResult> {
  const score = healthScore.computed_score;
  const grade = healthScore.grade;
  const sorted = [...dimensionAgents].sort((a, b) => b.score - a.score);
  const strongest = sorted.slice(0, 3).map((d) => d.dimension_label);
  const weakest = sorted.slice(-3).map((d) => d.dimension_label);

  const executive =
    `${ctx.businessName} Financial Health Score: ${score.toFixed(1)}/100 (Grade ${grade}, ${riskSynthesis.composite_risk_level} risk). ` +
    `Analyzed by ${dimensionAgents.length} dimension agents. Strongest: ${strongest.join(", ")}. ` +
    `Attention needed: ${weakest.join(", ")}. ${riskSynthesis.flagged_dimensions.length} dimension risk flag(s).`;

  const llm = await maybeLlm(
    "You are a credit report authoring agent. Write a 3-sentence executive summary for a bank credit committee.",
    executive
  );

  const credit = creditDecision(score, riskSynthesis.composite_risk_level);

  const stakeholderSummaries: Record<string, string> = {
    bank: `Credit exposure assessment complete. ${credit.split("—")[0]}. Review flagged dimensions before sanction.`,
    msme: `Your Financial Health Score is ${score.toFixed(1)}/100 (Grade ${grade}). Focus improvements on: ${weakest.join(", ")}.`,
    government: `MSME eligible for scheme advisory. ${sorted.filter((d) => d.dimension === "government_policy_alignment").map((d) => `Policy alignment score: ${d.score.toFixed(1)}`).join("") || "Policy data pending."}`,
    regulatory: `Compliance review: ${riskSynthesis.flagged_dimensions.filter((f) => ["tax_compliance", "legal_compliance"].includes(f.dimension)).length} compliance dimension flag(s).`,
  };

  const reportSections = [
    "Executive Summary",
    "Credit Decision Recommendation",
    "20-Dimension Agent Analysis",
    "Risk Synthesis & Mitigation Priorities",
    "Health Score Validation",
    "AI Agent Intelligence Log",
    "Data Gaps & Recommended Improvements",
    "Green Finance Opportunities",
    "Stakeholder-Specific Summaries",
  ];

  const result: ReportAgentResult = {
    agent_type: "report_orchestration",
    run_id: uuidv4(),
    summary: llm ?? executive,
    recommendations: ((assessment.recommended_improvements as string[]) ?? []).slice(0, 8),
    confidence: "high",
    structured_output: { sections: reportSections, dimension_agent_count: dimensionAgents.length },
    used_llm: !!llm,
    executive_summary: llm ?? executive,
    credit_decision: credit,
    stakeholder_summaries: stakeholderSummaries,
    report_sections: reportSections,
  };

  logAgentRun("report_orchestration", ctx, result);
  return result;
}
