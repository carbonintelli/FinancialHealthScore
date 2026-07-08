import { v4 as uuidv4 } from "uuid";
import type {
  AgentContext,
  AgentResult,
  DimensionAgentResult,
  DimensionScoreInput,
  HealthScoreAgentResult,
  OrchestrationPhase,
  OrchestrationResult,
  ReportAgentResult,
  RiskSynthesisResult,
} from "./types.js";
import { runAllDimensionAgents } from "./dimension-agent.js";
import { runEnrichmentAgent, runCreditAgent, runPolicyAgent, runRegulatoryAgent } from "./legacy-agents.js";
import { synthesizeRisk } from "./synthesis/risk.js";
import { synthesizeHealthScore } from "./synthesis/health-score.js";
import { synthesizeReport } from "./synthesis/report.js";
import { logOrchestration } from "./logger.js";
import { DIMENSION_CATALOG } from "./catalog.js";

export interface OrchestrateOptions {
  runEnrichment?: boolean;
  runDimensionAgents?: boolean;
  runRiskSynthesis?: boolean;
  runHealthScore?: boolean;
  runReporting?: boolean;
  runStakeholderAgents?: boolean;
  audience?: string;
}

const DEFAULT_OPTIONS: OrchestrateOptions = {
  runEnrichment: true,
  runDimensionAgents: true,
  runRiskSynthesis: true,
  runHealthScore: true,
  runReporting: true,
  runStakeholderAgents: true,
};

function phase(name: string, start: number, agentsRun: number): OrchestrationPhase {
  return { phase: name, status: "completed", duration_ms: Date.now() - start, agents_run: agentsRun };
}

function extractDimensions(assessment: Record<string, unknown>): DimensionScoreInput[] {
  const dims = (assessment.dimension_scores as DimensionScoreInput[]) ?? [];
  return dims.map((d) => ({
    dimension: d.dimension,
    score: d.score,
    weight: d.weight,
    risk_level: d.risk_level,
    confidence: d.confidence,
    insights: d.insights ?? [],
  }));
}

export async function orchestrateAssessment(
  ctx: AgentContext,
  options: OrchestrateOptions = {}
): Promise<OrchestrationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const orchestrationId = uuidv4();
  const assessment = ctx.assessment ?? {};
  const phases: OrchestrationPhase[] = [];

  const t1 = Date.now();
  const enrichment = opts.runEnrichment
    ? await runEnrichmentAgent(ctx)
    : ({ agent_type: "data_enrichment", run_id: uuidv4(), summary: "Skipped", recommendations: [], confidence: "low" as const, structured_output: {}, used_llm: false });
  phases.push(phase("enrichment", t1, 1));

  const t2 = Date.now();
  let dimensionAgents: DimensionAgentResult[] = [];
  if (opts.runDimensionAgents) {
    const dims = extractDimensions(assessment);
    dimensionAgents = await runAllDimensionAgents(
      ctx,
      dims.length
        ? dims
        : DIMENSION_CATALOG.map((c) => ({
            dimension: c.id,
            score: 55,
            weight: c.weight,
            risk_level: "moderate",
            confidence: "low",
            insights: [],
          }))
    );
  }
  phases.push(phase("dimension_analysis", t2, dimensionAgents.length));

  const t3 = Date.now();
  const riskSynthesis: RiskSynthesisResult = opts.runRiskSynthesis
    ? await synthesizeRisk(ctx, dimensionAgents, assessment)
    : {
        agent_type: "risk_synthesis",
        run_id: uuidv4(),
        summary: "Skipped",
        recommendations: [],
        confidence: "low",
        structured_output: {},
        used_llm: false,
        composite_risk_level: "moderate",
        risk_score: 50,
        flagged_dimensions: [],
        risk_indicators_aligned: 0,
        mitigation_priorities: [],
      };
  phases.push(phase("risk_synthesis", t3, 1));

  const t4 = Date.now();
  const healthScore: HealthScoreAgentResult = opts.runHealthScore
    ? await synthesizeHealthScore(ctx, dimensionAgents, assessment)
    : {
        agent_type: "health_score_synthesis",
        run_id: uuidv4(),
        summary: "Skipped",
        recommendations: [],
        confidence: "low",
        structured_output: {},
        used_llm: false,
        computed_score: 0,
        agent_validated_score: 0,
        grade: "N/A",
        governance_bonus: 0,
        dimension_contributions: [],
        score_confidence: "low",
        validation_notes: [],
      };
  phases.push(phase("health_score_synthesis", t4, 1));

  const t5 = Date.now();
  const reporting: ReportAgentResult = opts.runReporting
    ? await synthesizeReport(ctx, dimensionAgents, riskSynthesis, healthScore, assessment)
    : {
        agent_type: "report_orchestration",
        run_id: uuidv4(),
        summary: "Skipped",
        recommendations: [],
        confidence: "low",
        structured_output: {},
        used_llm: false,
        executive_summary: "",
        credit_decision: "",
        stakeholder_summaries: {},
        report_sections: [],
      };
  phases.push(phase("report_orchestration", t5, 1));

  const t6 = Date.now();
  const stakeholderAgents: AgentResult[] = [];
  if (opts.runStakeholderAgents) {
    const [credit, policy, regulatory] = await Promise.all([
      runCreditAgent(ctx),
      runPolicyAgent(ctx),
      runRegulatoryAgent(ctx, "rbi"),
    ]);
    stakeholderAgents.push(credit, policy, regulatory);
  }
  phases.push(phase("stakeholder_agents", t6, stakeholderAgents.length));

  const sorted = [...dimensionAgents].sort((a, b) => b.score - a.score);
  const totalAgents = 1 + dimensionAgents.length + 3 + stakeholderAgents.length;

  const result: OrchestrationResult = {
    orchestration_id: orchestrationId,
    assessment_id: (assessment.assessment_id as string) ?? "",
    business_name: ctx.businessName ?? "MSME",
    msme_id: ctx.msmeId,
    trigger_source: ctx.triggerSource,
    phases,
    enrichment,
    dimension_agents: dimensionAgents,
    risk_synthesis: riskSynthesis,
    health_score: healthScore,
    reporting,
    stakeholder_agents: stakeholderAgents,
    summary: {
      overall_score: (assessment.overall_score as number) ?? healthScore.agent_validated_score,
      grade: (assessment.grade as string) ?? healthScore.grade,
      composite_risk_level: riskSynthesis.composite_risk_level,
      top_strengths: sorted.slice(0, 3).map((d) => d.dimension_label),
      top_risks: sorted.slice(-3).map((d) => d.dimension_label),
      credit_recommendation:
        reporting.credit_decision ||
        stakeholderAgents.find((a) => a.agent_type === "credit_analysis")?.summary ||
        "",
      dimensions_analyzed: dimensionAgents.length,
      total_agents_run: totalAgents,
    },
    completed_at: new Date().toISOString(),
  };

  logOrchestration(orchestrationId, result.assessment_id, result);
  return result;
}

export function getArchitecture() {
  return {
    version: "2.1.0",
    pattern: "multi-phase agentic orchestration",
    phases: [
      { id: "enrichment", name: "Data Enrichment", agents: ["data_enrichment"], parallel: false },
      {
        id: "dimension_analysis",
        name: "Per-Dimension Analysis",
        agents: DIMENSION_CATALOG.map((d) => `dimension:${d.id}`),
        parallel: true,
        count: 20,
      },
      { id: "risk_synthesis", name: "Risk Synthesis", agents: ["risk_synthesis"], parallel: false },
      { id: "health_score_synthesis", name: "Health Score Validation", agents: ["health_score_synthesis"], parallel: false },
      { id: "report_orchestration", name: "Report Generation", agents: ["report_orchestration"], parallel: false },
      {
        id: "stakeholder_agents",
        name: "Stakeholder Intelligence",
        agents: ["credit_analysis", "policy_advisory", "regulatory_compliance"],
        parallel: true,
      },
    ],
    dimension_agents: DIMENSION_CATALOG.map((d) => ({
      dimension: d.id,
      label: d.label,
      weight: d.weight,
      category: d.category,
      agent_role: d.agent_role,
    })),
    total_agents_per_full_run: 1 + 20 + 1 + 1 + 1 + 3,
    llm_enhanced: !!process.env.OPENAI_API_KEY,
  };
}

// Backward-compatible wrapper
export async function orchestrateAgents(ctx: AgentContext, _agents?: string[]) {
  const result = await orchestrateAssessment(ctx);
  return [
    result.enrichment,
    ...result.dimension_agents,
    result.risk_synthesis,
    result.health_score,
    result.reporting,
    ...result.stakeholder_agents,
  ];
}

export { runCreditAgent, runPolicyAgent, runRegulatoryAgent, runEnrichmentAgent } from "./legacy-agents.js";
export type { AgentContext, AgentResult, OrchestrationResult } from "./types.js";
