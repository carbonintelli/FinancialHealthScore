import { config } from "../../config.js";

export interface AgentResult {
  agent_type: string;
  run_id: string;
  summary: string;
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  structured_output: Record<string, unknown>;
  used_llm: boolean;
}

export interface DimensionInsight {
  indicator: string;
  category: string;
  value?: string | number | null;
  impact: string;
  narrative: string;
  confidence: string;
  data_source: string;
}

export interface DimensionScoreInput {
  dimension: string;
  score: number;
  weight: number;
  risk_level: string;
  confidence: string;
  insights: DimensionInsight[];
}

export interface DimensionAgentResult extends AgentResult {
  agent_type: "dimension_agent";
  dimension: string;
  dimension_label: string;
  category: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  risk_level: string;
  risk_flags: string[];
  evidence_count: number;
  positive_signals: number;
  negative_signals: number;
}

export interface RiskSynthesisResult extends AgentResult {
  agent_type: "risk_synthesis";
  composite_risk_level: string;
  risk_score: number;
  flagged_dimensions: { dimension: string; score: number; risk_level: string; flag: string }[];
  risk_indicators_aligned: number;
  mitigation_priorities: string[];
}

export interface HealthScoreAgentResult extends AgentResult {
  agent_type: "health_score_synthesis";
  computed_score: number;
  agent_validated_score: number;
  grade: string;
  governance_bonus: number;
  dimension_contributions: { dimension: string; contribution: number }[];
  score_confidence: string;
  validation_notes: string[];
}

export interface ReportAgentResult extends AgentResult {
  agent_type: "report_orchestration";
  executive_summary: string;
  credit_decision: string;
  stakeholder_summaries: Record<string, string>;
  report_sections: string[];
}

export interface OrchestrationPhase {
  phase: string;
  status: "completed" | "skipped" | "failed";
  duration_ms: number;
  agents_run: number;
}

export interface OrchestrationResult {
  orchestration_id: string;
  assessment_id: string;
  business_name: string;
  msme_id?: string;
  trigger_source: string;
  phases: OrchestrationPhase[];
  enrichment: AgentResult;
  dimension_agents: DimensionAgentResult[];
  risk_synthesis: RiskSynthesisResult;
  health_score: HealthScoreAgentResult;
  reporting: ReportAgentResult;
  stakeholder_agents: AgentResult[];
  summary: {
    overall_score: number;
    grade: string;
    composite_risk_level: string;
    top_strengths: string[];
    top_risks: string[];
    credit_recommendation: string;
    dimensions_analyzed: number;
    total_agents_run: number;
  };
  completed_at: string;
}

export interface AgentContext {
  msmeId?: string;
  businessName?: string;
  assessment?: Record<string, unknown>;
  sector?: string;
  triggerSource: string;
  audience?: string;
}

export async function maybeLlm(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (!config.openaiApiKey) return null;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}
