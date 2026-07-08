import type { AssessmentResult } from "../scoring/bridge.js";

export function buildDetailedReport(result: AssessmentResult, agentInsights?: unknown) {
  const score = result.overall_score;
  const grade = result.grade;
  const risk = result.overall_risk_level;

  let creditRec = "DECLINE / DEFER";
  if (score >= 80 && ["low", "moderate"].includes(risk)) creditRec = "RECOMMEND APPROVAL";
  else if (score >= 65) creditRec = "CONDITIONAL APPROVAL";
  else if (score >= 50) creditRec = "ENHANCED DUE DILIGENCE";

  const creditAgent = (agentInsights as { agent_type: string; summary: string }[] | null)?.find(
    (a) => a.agent_type === "credit_analysis"
  );

  return {
    assessment_id: result.assessment_id,
    business_name: result.business_name,
    msme_id: result.msme_id,
    generated_at: result.generated_at,
    report_title: "Financial Health Score — Detailed Credit Assessment Report",
    executive_summary: `${result.business_name} scored ${score.toFixed(1)}/100 (Grade ${grade}, ${risk} risk). ${result.key_insights?.[0] ?? ""}`,
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
    credit_decision_recommendation: creditAgent?.summary ?? creditRec,
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

  const agentSection =
    report.agent_insights && Array.isArray(report.agent_insights)
      ? `<div class="section"><h2>AI Agent Intelligence</h2>${(report.agent_insights as { agent_type: string; summary: string }[])
          .map((a) => `<p><strong>${a.agent_type.replace(/_/g, " ")}:</strong> ${a.summary}</p>`)
          .join("")}</div>`
      : "";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report — ${result.business_name}</title>
<style>body{font-family:system-ui;max-width:960px;margin:2rem auto;padding:0 1rem}
.header{background:#0f4c81;color:#fff;padding:1.5rem;border-radius:8px}
.section{margin:1.5rem 0;padding:1rem;border:1px solid #ddd;border-radius:8px}
table{width:100%;border-collapse:collapse}th,td{padding:.5rem;border-bottom:1px solid #eee;text-align:left}
.rec{background:#e8f5ee;padding:1rem;border-left:4px solid #1a7f4e}</style></head><body>
<div class="header"><h1>${report.report_title}</h1><p>${result.business_name} · ${result.assessment_id}</p>
<p>Score: <strong>${result.overall_score.toFixed(1)}</strong> / Grade ${result.grade} / Risk ${result.overall_risk_level}</p></div>
<div class="section"><h2>Executive Summary</h2><p>${report.executive_summary}</p><p>${result.audience_summary}</p></div>
<div class="section rec"><h2>Credit Decision</h2><p>${report.credit_decision_recommendation}</p></div>
${agentSection}
<div class="section"><h2>20-Dimension Breakdown</h2><table><thead><tr><th>Dimension</th><th>Score</th><th>Weight</th><th>Risk</th></tr></thead><tbody>${dimRows}</tbody></table></div>
<div class="section"><h2>Key Insights</h2><ul>${result.key_insights.map((i) => `<li>${i}</li>`).join("")}</ul></div>
<p style="color:#666;font-size:.85rem">Financial Health Score Platform v2.0 · Node.js · IDBI Innovate 2026</p></body></html>`;
}
