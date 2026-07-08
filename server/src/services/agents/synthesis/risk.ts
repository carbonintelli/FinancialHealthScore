import { v4 as uuidv4 } from "uuid";
import type { AgentContext, DimensionAgentResult, RiskSynthesisResult } from "../types.js";
import { maybeLlm } from "../types.js";
import { logAgentRun } from "../logger.js";

function riskLevelFromScore(score: number): string {
  if (score >= 75) return "low";
  if (score >= 60) return "moderate";
  if (score >= 45) return "elevated";
  if (score >= 30) return "high";
  return "critical";
}

export async function synthesizeRisk(
  ctx: AgentContext,
  dimensionAgents: DimensionAgentResult[],
  assessment: Record<string, unknown>
): Promise<RiskSynthesisResult> {
  const flagged = dimensionAgents
    .filter((d) => d.risk_flags.length > 0 || ["elevated", "high", "critical"].includes(d.risk_level))
    .map((d) => ({
      dimension: d.dimension,
      score: d.score,
      risk_level: d.risk_level,
      flag: d.risk_flags[0] ?? `${d.dimension_label} at ${d.risk_level} risk`,
    }))
    .sort((a, b) => a.score - b.score);

  const riskIndicators = (assessment.risk_indicators as unknown[]) ?? [];
  const avgDimScore = dimensionAgents.length
    ? dimensionAgents.reduce((a, d) => a + d.score, 0) / dimensionAgents.length
    : 50;
  const riskScore = Math.round(100 - avgDimScore + flagged.length * 3);
  const compositeRisk = riskLevelFromScore(100 - Math.min(riskScore, 100));

  const mitigation = flagged.slice(0, 5).map((f) => `Mitigate ${f.dimension.replace(/_/g, " ")}: ${f.flag}`);

  const llm = await maybeLlm(
    "You are a risk synthesis agent for MSME credit portfolios. Summarize composite risk in 2 sentences.",
    `${ctx.businessName}: ${flagged.length} flagged dimensions, composite risk ${compositeRisk}, ${riskIndicators.length} system risk indicators.`
  );

  const result: RiskSynthesisResult = {
    agent_type: "risk_synthesis",
    run_id: uuidv4(),
    summary:
      llm ??
      `Composite risk: ${compositeRisk.toUpperCase()}. ${flagged.length} dimension(s) flagged of ${dimensionAgents.length} analyzed. ${riskIndicators.length} system risk indicator(s) aligned.`,
    recommendations: mitigation.length ? mitigation : ["No immediate mitigation required — maintain monitoring cadence"],
    confidence: flagged.length <= 2 ? "high" : flagged.length <= 5 ? "medium" : "low",
    structured_output: { flagged_count: flagged.length, risk_score: riskScore },
    used_llm: !!llm,
    composite_risk_level: compositeRisk,
    risk_score: Math.min(100, riskScore),
    flagged_dimensions: flagged,
    risk_indicators_aligned: riskIndicators.length,
    mitigation_priorities: mitigation,
  };

  logAgentRun("risk_synthesis", ctx, result);
  return result;
}
