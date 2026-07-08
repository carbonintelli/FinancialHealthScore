import { v4 as uuidv4 } from "uuid";
import { avgConfidence, clamp, round1, scoreToGrade, scoreToRisk } from "./utils.js";
import { runScoringAgents } from "./scoring-agents.js";
import { governanceOverallBonus, assemblePostProcess } from "./post-process.js";
import type { AssessmentRequest, AssessmentResult, ScoringContext } from "./types.js";

export interface AssessOptions {
  carbonData?: Record<string, unknown> | null;
  enrichmentLog?: Record<string, unknown> | null;
}

/**
 * Node.js Financial Health Score engine using agentic dimension scoring.
 * Phase 0: 20 parallel scoring agents compute dimension scores.
 * Post-process: aggregate overall score, risks, gaps, and recommendations.
 */
export async function assess(request: AssessmentRequest, options: AssessOptions = {}): Promise<AssessmentResult> {
  const ctx: ScoringContext = {
    financialData: request.financial_data,
    carbonData: options.carbonData,
    enrichmentLog: options.enrichmentLog,
    audience: request.audience,
  };

  const scoringRun = await runScoringAgents(ctx);
  const dimensions = scoringRun.dimension_scores;
  const governanceBonus = governanceOverallBonus(
    ctx.financialData.governance_diversity as Record<string, unknown> | undefined,
    dimensions,
  );
  const post = assemblePostProcess(request, dimensions, options.carbonData, options.enrichmentLog, governanceBonus);
  const confidences = dimensions.map((d) => d.confidence);

  const profile = request.financial_data.profile as Record<string, unknown>;

  return {
    assessment_id: uuidv4(),
    business_name: String(profile.business_name ?? "MSME"),
    msme_id: profile.msme_id as string | undefined,
    generated_at: new Date().toISOString(),
    overall_score: round1(post.overall),
    overall_risk_level: scoreToRisk(post.overall),
    overall_confidence: avgConfidence(confidences),
    grade: scoreToGrade(post.overall),
    dimension_scores: dimensions,
    risk_indicators: post.riskIndicators,
    key_insights: post.keyInsights,
    green_finance_opportunities: post.greenOpportunities,
    carbon_intelligence: post.carbonSummary,
    government_policy_assessment: post.policyAssessment,
    data_gaps: post.dataGaps,
    recommended_improvements: post.recommended,
    advanced_intelligence: post.advancedSummary,
    audience_summary: post.audienceSummary,
    metadata: {
      ...post.metadata,
      scoring_engine: "nodejs",
      scoring_agents_run: scoringRun.agents_run,
      scoring_orchestration_id: scoringRun.orchestration_id,
    },
  };
}

export { runScoringAgents } from "./scoring-agents.js";
