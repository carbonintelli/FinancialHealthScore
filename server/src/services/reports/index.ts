import type { AssessmentResult } from "../scoring/index.js";
import type { OrchestrationResult } from "../agents/types.js";

function isOrchestration(obj: unknown): obj is OrchestrationResult {
  return !!obj && typeof obj === "object" && "orchestration_id" in obj && "dimension_agents" in obj;
}

export function buildDetailedReport(result: AssessmentResult, agentInsights?: unknown) {
  const score = result.overall_score;
  const grade = result.grade;
  const risk = result.overall_risk_level;

  let creditRec = "DECLINE / DEFER";
  if (score >= 80 && ["low", "moderate"].includes(risk)) creditRec = "RECOMMEND APPROVAL";
  else if (score >= 65) creditRec = "CONDITIONAL APPROVAL";
  else if (score >= 50) creditRec = "ENHANCED DUE DILIGENCE";

  let executive = `${result.business_name} scored ${score.toFixed(1)}/100 (Grade ${grade}, ${risk} risk). ${result.key_insights?.[0] ?? ""}`;
  let agentOrchestration = null;

  if (isOrchestration(agentInsights)) {
    executive = agentInsights.reporting.executive_summary || executive;
    creditRec = agentInsights.reporting.credit_decision || agentInsights.summary.credit_recommendation || creditRec;
    agentOrchestration = {
      orchestration_id: agentInsights.orchestration_id,
      phases: agentInsights.phases,
      summary: agentInsights.summary,
      dimension_agents: agentInsights.dimension_agents.map((d) => ({
        dimension: d.dimension,
        label: d.dimension_label,
        score: d.score,
        weight: d.weight,
        contribution: d.weighted_contribution,
        risk_level: d.risk_level,
        risk_flags: d.risk_flags,
        agent_summary: d.summary,
        recommendations: d.recommendations,
      })),
      risk_synthesis: {
        composite_risk_level: agentInsights.risk_synthesis.composite_risk_level,
        summary: agentInsights.risk_synthesis.summary,
        mitigation_priorities: agentInsights.risk_synthesis.mitigation_priorities,
        flagged_dimensions: agentInsights.risk_synthesis.flagged_dimensions,
      },
      health_score_validation: {
        computed_score: agentInsights.health_score.computed_score,
        agent_validated_score: agentInsights.health_score.agent_validated_score,
        validation_notes: agentInsights.health_score.validation_notes,
        summary: agentInsights.health_score.summary,
      },
      stakeholder_summaries: agentInsights.reporting.stakeholder_summaries,
      total_agents_run: agentInsights.summary.total_agents_run,
    };
  } else if (Array.isArray(agentInsights)) {
    const creditAgent = agentInsights.find((a: { agent_type: string }) => a.agent_type === "credit_analysis") as
      | { summary: string }
      | undefined;
    if (creditAgent) creditRec = creditAgent.summary;
  }

  return {
    assessment_id: result.assessment_id,
    business_name: result.business_name,
    msme_id: result.msme_id,
    generated_at: result.generated_at,
    report_title: "Financial Health Score — Agentic AI Credit Assessment Report",
    executive_summary: executive,
    overall_score: score,
    grade,
    overall_risk_level: risk,
    dimension_scores: result.dimension_scores,
    risk_indicators: result.risk_indicators,
    key_insights: result.key_insights,
    data_gaps: result.data_gaps,
    recommended_improvements: result.recommended_improvements,
    green_finance_opportunities: result.green_finance_opportunities,
    government_policy_assessment: result.government_policy_assessment,
    advanced_intelligence: result.advanced_intelligence,
    carbon_intelligence: result.carbon_intelligence,
    audience_summary: result.audience_summary,
    credit_decision_recommendation: creditRec,
    agent_orchestration: agentOrchestration,
    agent_insights: agentInsights,
    metadata: result.metadata,
    html_report_url: `/api/v1/reports/${result.assessment_id}/html`,
  };
}

export function renderHtmlReport(result: AssessmentResult, report: ReturnType<typeof buildDetailedReport>): string {
  const dimRows = (result.dimension_scores as { dimension: string; score: number; weight: number; risk_level: string }[])
    .map(
      (d) =>
        `<tr><td>${d.dimension.replace(/_/g, " ")}</td><td><strong>${d.score.toFixed(1)}</strong></td><td>${(d.weight * 100).toFixed(0)}%</td><td>${d.risk_level}</td></tr>`
    )
    .join("");

  const orch = report.agent_orchestration;
  const phaseSection = orch
    ? `<div class="section"><h2>Agent Orchestration (${orch.total_agents_run} agents)</h2>
        <p>ID: ${orch.orchestration_id}</p>
        <table><thead><tr><th>Phase</th><th>Agents</th><th>Duration</th></tr></thead><tbody>
        ${orch.phases.map((p: { phase: string; agents_run: number; duration_ms: number }) => `<tr><td>${p.phase}</td><td>${p.agents_run}</td><td>${p.duration_ms}ms</td></tr>`).join("")}
        </tbody></table></div>`
    : "";

  const dimAgentSection = orch
    ? `<div class="section"><h2>Per-Dimension AI Agents (20)</h2><table>
        <thead><tr><th>Dimension</th><th>Score</th><th>Contrib.</th><th>Risk</th><th>Agent Assessment</th></tr></thead><tbody>
        ${orch.dimension_agents.map((d: { label: string; score: number; contribution: number; risk_level: string; agent_summary: string }) =>
          `<tr><td>${d.label}</td><td>${d.score.toFixed(1)}</td><td>${d.contribution}</td><td>${d.risk_level}</td><td style="font-size:.85rem">${d.agent_summary.slice(0, 120)}…</td></tr>`
        ).join("")}
        </tbody></table></div>`
    : "";

  const riskSection = orch
    ? `<div class="section"><h2>Risk Synthesis Agent</h2>
        <p><strong>Composite Risk:</strong> ${orch.risk_synthesis.composite_risk_level}</p>
        <p>${orch.risk_synthesis.summary}</p>
        <h4>Mitigation Priorities</h4><ul>${orch.risk_synthesis.mitigation_priorities.map((m: string) => `<li>${m}</li>`).join("")}</ul></div>`
    : "";

  const healthSection = orch
    ? `<div class="section"><h2>Health Score Validation Agent</h2>
        <p>Computed: ${orch.health_score_validation.computed_score} · Agent-validated: ${orch.health_score_validation.agent_validated_score}</p>
        <p>${orch.health_score_validation.summary}</p>
        <ul>${orch.health_score_validation.validation_notes.map((n: string) => `<li>${n}</li>`).join("")}</ul></div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report — ${result.business_name}</title>
<style>body{font-family:system-ui;max-width:1000px;margin:2rem auto;padding:0 1rem}
.header{background:#0f4c81;color:#fff;padding:1.5rem;border-radius:8px}
.section{margin:1.5rem 0;padding:1rem;border:1px solid #ddd;border-radius:8px}
table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{padding:.5rem;border-bottom:1px solid #eee;text-align:left}
.rec{background:#e8f5ee;padding:1rem;border-left:4px solid #1a7f4e}
.agent{background:#f0f4fa;padding:1rem;border-left:4px solid #0f4c81}</style></head><body>
<div class="header"><h1>${report.report_title}</h1><p>${result.business_name} · ${result.assessment_id}</p>
<p>Score: <strong>${result.overall_score.toFixed(1)}</strong> / Grade ${result.grade} / Risk ${result.overall_risk_level}</p></div>
<div class="section"><h2>Executive Summary</h2><p>${report.executive_summary}</p><p>${result.audience_summary}</p></div>
<div class="section rec"><h2>Credit Decision (AI Agent)</h2><p>${report.credit_decision_recommendation}</p></div>
${phaseSection}${dimAgentSection}${riskSection}${healthSection}
<div class="section"><h2>20-Dimension Scores</h2><table><thead><tr><th>Dimension</th><th>Score</th><th>Weight</th><th>Risk</th></tr></thead><tbody>${dimRows}</tbody></table></div>
<div class="section"><h2>Key Insights</h2><ul>${result.key_insights.map((i) => `<li>${i}</li>`).join("")}</ul></div>
<p style="color:#666;font-size:.85rem">Financial Health Score v2.1 · Agentic AI Orchestration · IDBI Innovate 2026</p></body></html>`;
}
