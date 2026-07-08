import { v4 as uuidv4 } from "uuid";
import { config } from "../../config.js";
import { getDb } from "../../db/index.js";

export interface AgentContext {
  msmeId?: string;
  businessName?: string;
  assessment?: Record<string, unknown>;
  sector?: string;
  triggerSource: string;
}

export interface AgentResult {
  agent_type: string;
  run_id: string;
  summary: string;
  recommendations: string[];
  confidence: "high" | "medium" | "low";
  structured_output: Record<string, unknown>;
  used_llm: boolean;
}

function logAgentRun(agentType: string, ctx: AgentContext, output: AgentResult): void {
  getDb()
    .prepare(
      `INSERT INTO agent_runs (run_id, agent_type, trigger_source, msme_id, assessment_id, input_json, output_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      output.run_id,
      agentType,
      ctx.triggerSource,
      ctx.msmeId ?? null,
      (ctx.assessment?.assessment_id as string) ?? null,
      JSON.stringify(ctx),
      JSON.stringify(output)
    );
}

async function maybeLlm(prompt: string): Promise<string | null> {
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
          { role: "system", content: "You are a financial intelligence agent for Indian MSME credit assessment. Be concise and actionable." },
          { role: "user", content: prompt },
        ],
        max_tokens: 600,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function runCreditAgent(ctx: AgentContext): Promise<AgentResult> {
  const a = ctx.assessment ?? {};
  const score = (a.overall_score as number) ?? 0;
  const grade = (a.grade as string) ?? "N/A";
  const risks = ((a.risk_indicators as unknown[]) ?? []).length;

  let recommendation = "DECLINE / DEFER";
  if (score >= 80) recommendation = "RECOMMEND APPROVAL";
  else if (score >= 65) recommendation = "CONDITIONAL APPROVAL";
  else if (score >= 50) recommendation = "ENHANCED DUE DILIGENCE";

  const llm = await maybeLlm(
    `Credit decision for ${ctx.businessName} (score ${score}, grade ${grade}, ${risks} risks). One paragraph recommendation for bank credit committee.`
  );

  const result: AgentResult = {
    agent_type: "credit_analysis",
    run_id: uuidv4(),
    summary: llm ?? `${recommendation} — ${ctx.businessName} scored ${score.toFixed(1)}/100 (Grade ${grade}) with ${risks} flagged risk indicator(s).`,
    recommendations: [
      score < 70 ? "Request updated cash flow statements and GST filings" : "Standard MSME lending terms applicable",
      risks > 0 ? "Resolve flagged risk indicators within 90-day covenant window" : "No immediate covenant actions required",
      "Consider CGTMSE guarantee for collateral-free exposure",
    ],
    confidence: score >= 70 ? "high" : "medium",
    structured_output: { recommendation, overall_score: score, grade, risk_count: risks },
    used_llm: !!llm,
  };
  logAgentRun("credit_analysis", ctx, result);
  return result;
}

export async function runPolicyAgent(ctx: AgentContext): Promise<AgentResult> {
  const sector = ctx.sector ?? "general";
  const schemes =
    sector === "auto_components"
      ? ["CGTMSE", "CLCSS", "PLI_AUTO", "SAMADHAN", "ZED"]
      : ["CGTMSE", "PMMY", "UDYAM", "MUDRA", "SAMADHAN"];

  const llm = await maybeLlm(
    `List top 3 government schemes for Indian MSME in ${sector} sector. Business: ${ctx.businessName}.`
  );

  const result: AgentResult = {
    agent_type: "policy_advisory",
    run_id: uuidv4(),
    summary: llm ?? `Eligible schemes identified for ${ctx.businessName} (${sector}): ${schemes.join(", ")}.`,
    recommendations: schemes.map((s) => `Enroll / verify eligibility for ${s}`),
    confidence: "high",
    structured_output: { eligible_schemes: schemes, sector },
    used_llm: !!llm,
  };
  logAgentRun("policy_advisory", ctx, result);
  return result;
}

export async function runRegulatoryAgent(ctx: AgentContext, regulatorType: string): Promise<AgentResult> {
  const a = ctx.assessment ?? {};
  const dims = (a.dimension_scores as { dimension: string; score: number; risk_level: string }[]) ?? [];
  const tax = dims.find((d) => d.dimension === "tax_compliance");
  const legal = dims.find((d) => d.dimension === "legal_compliance");

  const flags: string[] = [];
  if (tax && tax.score < 60) flags.push("Tax compliance below regulatory threshold");
  if (legal && legal.score < 60) flags.push("Legal compliance concerns — enhanced monitoring");
  if (regulatorType === "gstn" && tax && tax.score < 80) flags.push("GST filing irregularities suspected");
  if (regulatorType === "rbi" && (a.overall_score as number) < 50) flags.push("NBFC/bank exposure warrants RBI reporting");

  const result: AgentResult = {
    agent_type: "regulatory_compliance",
    run_id: uuidv4(),
    summary:
      flags.length === 0
        ? `No material regulatory flags for ${ctx.businessName} under ${regulatorType.toUpperCase()} review.`
        : `${flags.length} regulatory flag(s) for ${ctx.businessName}: ${flags.join("; ")}.`,
    recommendations:
      flags.length === 0
        ? ["Continue periodic compliance monitoring", "Maintain statutory audit trail"]
        : flags.map((f) => `Action: ${f}`),
    confidence: flags.length === 0 ? "high" : "medium",
    structured_output: { regulator: regulatorType, flags, tax_score: tax?.score, legal_score: legal?.score },
    used_llm: false,
  };
  logAgentRun("regulatory_compliance", ctx, result);
  return result;
}

export async function runEnrichmentAgent(ctx: AgentContext): Promise<AgentResult> {
  const result: AgentResult = {
    agent_type: "data_enrichment",
    run_id: uuidv4(),
    summary: `Auto-enrichment completed for ${ctx.businessName ?? ctx.msmeId}: bureau, tax, legal, and document intelligence pulled (mock mode).`,
    recommendations: [
      "Verify GSTIN and PAN against live GSTN/ITR APIs in production",
      "Pull CIBIL/CRISIL commercial report for debt servicing validation",
      "Run e-Courts litigation search for company and directors",
    ],
    confidence: "medium",
    structured_output: {
      sources: ["credit_bureau", "tax_verification", "legal_search", "document_intelligence"],
      mock_mode: config.useMockIntegrations,
    },
    used_llm: false,
  };
  logAgentRun("data_enrichment", ctx, result);
  return result;
}

export async function runReportAgent(ctx: AgentContext): Promise<AgentResult> {
  const a = ctx.assessment ?? {};
  const dims = (a.dimension_scores as { dimension: string; score: number }[]) ?? [];
  const sorted = [...dims].sort((x, y) => y.score - x.score);
  const strongest = sorted.slice(0, 3).map((d) => d.dimension.replace(/_/g, " "));
  const weakest = sorted.slice(-3).map((d) => d.dimension.replace(/_/g, " "));

  const llm = await maybeLlm(
    `Write executive summary for MSME credit report: ${ctx.businessName}, score ${a.overall_score}, grade ${a.grade}.`
  );

  const result: AgentResult = {
    agent_type: "report_narrative",
    run_id: uuidv4(),
    summary:
      llm ??
      `${ctx.businessName} — Financial Health Score ${(a.overall_score as number)?.toFixed(1)}/100 (Grade ${a.grade}). Strongest: ${strongest.join(", ")}. Weakest: ${weakest.join(", ")}.`,
    recommendations: ((a.recommended_improvements as string[]) ?? []).slice(0, 5),
    confidence: "high",
    structured_output: { strongest_dimensions: strongest, weakest_dimensions: weakest },
    used_llm: !!llm,
  };
  logAgentRun("report_narrative", ctx, result);
  return result;
}

export async function orchestrateAgents(
  ctx: AgentContext,
  agents: string[] = ["credit_analysis", "policy_advisory", "report_narrative"]
): Promise<AgentResult[]> {
  const results: AgentResult[] = [];
  for (const agent of agents) {
    if (agent === "credit_analysis") results.push(await runCreditAgent(ctx));
    else if (agent === "policy_advisory") results.push(await runPolicyAgent(ctx));
    else if (agent === "regulatory_compliance") results.push(await runRegulatoryAgent(ctx, "rbi"));
    else if (agent === "data_enrichment") results.push(await runEnrichmentAgent(ctx));
    else if (agent === "report_narrative") results.push(await runReportAgent(ctx));
  }
  return results;
}
