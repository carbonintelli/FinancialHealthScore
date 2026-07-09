import { v4 as uuidv4 } from "uuid";
import { avgConfidence, clamp, round1, scoreToGrade, scoreToRisk } from "./utils.js";
import { runScoringAgents } from "./scoring-agents.js";
import { governanceOverallBonus, assemblePostProcess } from "./post-process.js";
import { detectBorrowerSegment, applyThinFileWeights } from "./thin-file.js";
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
  const thinFileProfile = detectBorrowerSegment(request.financial_data);
  const useThinFile =
    request.thin_file_mode === true || (request.thin_file_mode !== false && thinFileProfile.is_thin_file);

  const ctx: ScoringContext = {
    financialData: request.financial_data,
    carbonData: options.carbonData,
    enrichmentLog: options.enrichmentLog,
    audience: request.audience,
    thinFileProfile: useThinFile ? thinFileProfile : null,
  };

  const scoringRun = await runScoringAgents(ctx);
  let dimensions = scoringRun.dimension_scores;

  let weightAdjustments: Record<string, { from: number; to: number }> = {};
  if (useThinFile) {
    const adjusted = applyThinFileWeights(dimensions, thinFileProfile);
    dimensions = adjusted.dimensions;
    weightAdjustments = adjusted.adjustments;
  }

  const governanceBonus = governanceOverallBonus(
    ctx.financialData.governance_diversity as Record<string, unknown> | undefined,
    dimensions,
  );
  const post = assemblePostProcess(request, dimensions, options.carbonData, options.enrichmentLog, governanceBonus, thinFileProfile);
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
      borrower_segment: thinFileProfile,
      thin_file_scoring: useThinFile,
      weight_adjustments: weightAdjustments,
    },
  };
}

export { runScoringAgents } from "./scoring-agents.js";
