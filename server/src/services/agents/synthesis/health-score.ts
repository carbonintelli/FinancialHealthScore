import { v4 as uuidv4 } from "uuid";
import type { AgentContext, DimensionAgentResult, HealthScoreAgentResult } from "../types.js";
import { maybeLlm } from "../types.js";
import { logAgentRun } from "../logger.js";

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  if (score >= 50) return "C+";
  if (score >= 40) return "C";
  if (score >= 30) return "D";
  return "F";
}

export async function synthesizeHealthScore(
  ctx: AgentContext,
  dimensionAgents: DimensionAgentResult[],
  assessment: Record<string, unknown>
): Promise<HealthScoreAgentResult> {
  const computed = (assessment.overall_score as number) ?? 0;
  const grade = (assessment.grade as string) ?? scoreToGrade(computed);
  const metadata = (assessment.metadata as Record<string, unknown>) ?? {};
  const governanceBonus = (metadata.governance_score_bonus as number) ?? 0;

  const contributions = dimensionAgents.map((d) => ({
    dimension: d.dimension,
    contribution: d.weighted_contribution,
  }));

  const agentSum = dimensionAgents.reduce((a, d) => a + d.weighted_contribution, 0);
  const agentValidated = Math.round((agentSum + governanceBonus) * 10) / 10;
  const delta = Math.abs(computed - agentValidated);

  const validationNotes: string[] = [];
  if (delta < 0.5) validationNotes.push("Agent-validated score matches computed score within tolerance");
  else validationNotes.push(`Score delta ${delta.toFixed(1)} pts — review dimension weight alignment`);

  const lowConfDims = dimensionAgents.filter((d) => d.confidence === "low");
  if (lowConfDims.length > 3) validationNotes.push(`${lowConfDims.length} dimensions have low confidence — data gaps may affect score`);

  if (governanceBonus > 0) validationNotes.push(`Governance diversity bonus +${governanceBonus.toFixed(1)} applied`);

  const weakest = [...dimensionAgents].sort((a, b) => a.score - b.score).slice(0, 3);
  const llm = await maybeLlm(
    "You are a Financial Health Score validation agent. Confirm score integrity in 2 sentences.",
    `${ctx.businessName}: computed ${computed}, agent sum ${agentValidated.toFixed(1)}, grade ${grade}. Weakest: ${weakest.map((d) => d.dimension_label).join(", ")}.`
  );

  const confLevels = dimensionAgents.map((d) => d.confidence);
  const avgConf = confLevels.filter((c) => c === "high").length / confLevels.length;

  const result: HealthScoreAgentResult = {
    agent_type: "health_score_synthesis",
    run_id: uuidv4(),
    summary:
      llm ??
      `Financial Health Score ${computed.toFixed(1)}/100 (Grade ${grade}) validated across ${dimensionAgents.length} dimension agents. Agent recomputation: ${agentValidated.toFixed(1)}.`,
    recommendations: weakest.map((d) => `Strengthen ${d.dimension_label} (current: ${d.score.toFixed(1)})`),
    confidence: avgConf >= 0.6 ? "high" : avgConf >= 0.4 ? "medium" : "low",
    structured_output: { delta, agent_sum: agentSum },
    used_llm: !!llm,
    computed_score: computed,
    agent_validated_score: agentValidated,
    grade,
    governance_bonus: governanceBonus,
    dimension_contributions: contributions,
    score_confidence: (assessment.overall_confidence as string) ?? "medium",
    validation_notes: validationNotes,
  };

  logAgentRun("health_score_synthesis", ctx, result);
  return result;
}
