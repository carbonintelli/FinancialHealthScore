import { v4 as uuidv4 } from "uuid";
import { DIMENSION_CATALOG } from "../agents/catalog.js";
import { DIMENSION_SCORERS } from "./dimensions/index.js";
import type { DimensionScore, ScoringContext } from "./types.js";

export interface ScoringAgentResult {
  agent_id: string;
  dimension: string;
  dimension_label: string;
  agent_role: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  risk_level: string;
  confidence: string;
  insight_count: number;
  duration_ms: number;
}

export interface ScoringOrchestrationResult {
  orchestration_id: string;
  phase: "dimension_scoring";
  agents_run: number;
  parallel: true;
  dimension_scores: DimensionScore[];
  agent_results: ScoringAgentResult[];
  total_duration_ms: number;
}

/**
 * Phase 0 of agentic assessment: run 20 dimension scoring agents in parallel.
 * Each agent computes deterministic dimension score + evidence insights.
 */
export async function runScoringAgents(ctx: ScoringContext): Promise<ScoringOrchestrationResult> {
  const orchestrationId = uuidv4();
  const started = Date.now();

  const agentResults = await Promise.all(
    DIMENSION_SCORERS.map(async (entry) => {
      const catalog = DIMENSION_CATALOG.find((d) => d.id === entry.id)!;
      const t0 = Date.now();
      const dimensionScore = entry.score(ctx);
      const duration = Date.now() - t0;
      return {
        agent_id: `scoring_agent:${entry.id}`,
        dimension: entry.id,
        dimension_label: catalog.label,
        agent_role: catalog.agent_role,
        score: dimensionScore.score,
        weight: dimensionScore.weight,
        weighted_contribution: dimensionScore.score * dimensionScore.weight,
        risk_level: dimensionScore.risk_level,
        confidence: dimensionScore.confidence,
        insight_count: dimensionScore.insights.length,
        duration_ms: duration,
        dimensionScore,
      };
    }),
  );

  const dimensionScores = agentResults.map((r) => r.dimensionScore);

  return {
    orchestration_id: orchestrationId,
    phase: "dimension_scoring",
    agents_run: agentResults.length,
    parallel: true,
    dimension_scores: dimensionScores,
    agent_results: agentResults.map(({ dimensionScore: _, ...rest }) => rest),
    total_duration_ms: Date.now() - started,
  };
}
