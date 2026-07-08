import { v4 as uuidv4 } from "uuid";
import { DIMENSION_MAP } from "./catalog.js";
import type { AgentContext, DimensionAgentResult, DimensionScoreInput } from "./types.js";
import { maybeLlm } from "./types.js";
import { logAgentRun } from "./logger.js";

function countSignals(insights: DimensionScoreInput["insights"]) {
  let positive = 0;
  let negative = 0;
  for (const i of insights) {
    if (i.impact === "positive") positive++;
    else if (i.impact === "negative") negative++;
  }
  return { positive, negative };
}

function deriveRiskFlags(dimId: string, score: number, riskLevel: string): string[] {
  const catalog = DIMENSION_MAP[dimId];
  const flags: string[] = [];
  if (!catalog) return flags;
  for (const t of catalog.risk_triggers) {
    if (score < t.threshold) flags.push(t.message);
  }
  if (["elevated", "high", "critical"].includes(riskLevel)) {
    flags.push(`${catalog.label} risk level: ${riskLevel}`);
  }
  return flags;
}

function ruleBasedDimensionSummary(
  catalog: (typeof DIMENSION_MAP)[string],
  dim: DimensionScoreInput,
  flags: string[]
): string {
  const signals = countSignals(dim.insights);
  const trend = dim.score >= 75 ? "strong" : dim.score >= 60 ? "adequate" : dim.score >= 45 ? "weak" : "critical";
  return (
    `${catalog.label} (${catalog.agent_role}): score ${dim.score.toFixed(1)}/100 (${trend}). ` +
    `Weight ${(dim.weight * 100).toFixed(0)}%, contributes ${(dim.score * dim.weight).toFixed(1)} pts. ` +
    `${signals.positive} positive / ${signals.negative} negative signals. ` +
    (flags.length ? `Flags: ${flags.join("; ")}.` : "No material flags.")
  );
}

function dimensionRecommendations(dimId: string, score: number, flags: string[]): string[] {
  const recs: string[] = [];
  const catalog = DIMENSION_MAP[dimId];
  if (!catalog) return recs;

  if (score < 60) {
    recs.push(`Improve ${catalog.label.toLowerCase()} — priority remediation for credit uplift`);
  }
  if (dimId === "cash_flow_health" && score < 65) {
    recs.push("Implement 13-week cash flow forecasting and receivables optimisation");
  }
  if (dimId === "carbon_transition_risk" && score < 65) {
    recs.push("Commission carbon assessment and document transition roadmap for green finance");
  }
  if (dimId === "tax_compliance" && score < 80) {
    recs.push("Ensure GST/ITR filings current; resolve any outstanding tax demands");
  }
  if (dimId === "credit_history_debt_servicing" && score < 70) {
    recs.push("Maintain EMI discipline; consider debt restructuring if DSCR below 1.25");
  }
  if (dimId === "governance_diversity" && score < 70) {
    recs.push("Document women-led enterprise status for governance score bonus eligibility");
  }
  if (flags.length && recs.length === 0) {
    recs.push(`Address flagged items in ${catalog.label}`);
  }
  if (recs.length === 0 && score >= 75) {
    recs.push(`Maintain current ${catalog.label.toLowerCase()} performance`);
  }
  return recs.slice(0, 3);
}

export async function runDimensionAgent(ctx: AgentContext, dim: DimensionScoreInput): Promise<DimensionAgentResult> {
  const catalog = DIMENSION_MAP[dim.dimension];
  const flags = deriveRiskFlags(dim.dimension, dim.score, dim.risk_level);
  const signals = countSignals(dim.insights);
  const weighted = dim.score * dim.weight;

  const systemPrompt = `You are the ${catalog?.agent_role ?? "dimension analyst"} agent for Indian MSME credit assessment. Analyze one dimension only. Be concise (2-3 sentences).`;
  const insightSummary = dim.insights
    .slice(0, 3)
    .map((i) => `${i.indicator}: ${i.narrative}`)
    .join(" | ");

  const llm = catalog
    ? await maybeLlm(
        systemPrompt,
        `Business: ${ctx.businessName}. Dimension: ${catalog.label}. Score: ${dim.score}/100. Risk: ${dim.risk_level}. Insights: ${insightSummary}`
      )
    : null;

  const result: DimensionAgentResult = {
    agent_type: "dimension_agent",
    run_id: uuidv4(),
    dimension: dim.dimension,
    dimension_label: catalog?.label ?? dim.dimension,
    category: catalog?.category ?? "financial",
    score: dim.score,
    weight: dim.weight,
    weighted_contribution: Math.round(weighted * 10) / 10,
    risk_level: dim.risk_level,
    risk_flags: flags,
    evidence_count: dim.insights.length,
    positive_signals: signals.positive,
    negative_signals: signals.negative,
    summary: llm ?? ruleBasedDimensionSummary(catalog!, dim, flags),
    recommendations: dimensionRecommendations(dim.dimension, dim.score, flags),
    confidence: dim.confidence as DimensionAgentResult["confidence"],
    structured_output: {
      insights: dim.insights,
      data_sources: catalog?.data_sources ?? [],
      weighted_contribution: weighted,
    },
    used_llm: !!llm,
  };

  logAgentRun(`dimension:${dim.dimension}`, ctx, result);
  return result;
}

export async function runAllDimensionAgents(
  ctx: AgentContext,
  dimensions: DimensionScoreInput[]
): Promise<DimensionAgentResult[]> {
  return Promise.all(dimensions.map((dim) => runDimensionAgent(ctx, dim)));
}
