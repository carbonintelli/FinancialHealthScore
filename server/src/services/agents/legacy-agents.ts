import { v4 as uuidv4 } from "uuid";
import { config } from "../../config.js";
import type { AgentContext, AgentResult } from "./types.js";
import { maybeLlm } from "./types.js";
import { logAgentRun } from "./logger.js";

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
    "You are a bank credit committee advisor for Indian MSME lending.",
    `Credit decision for ${ctx.businessName} (score ${score}, grade ${grade}, ${risks} risks). One paragraph recommendation.`
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
    "You are a government MSME scheme advisor for India.",
    `Top schemes for ${ctx.businessName} in ${sector} sector.`
  );

  const result: AgentResult = {
    agent_type: "policy_advisory",
    run_id: uuidv4(),
    summary: llm ?? `Eligible schemes for ${ctx.businessName} (${sector}): ${schemes.join(", ")}.`,
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
  if (legal && legal.score < 60) flags.push("Legal compliance concerns");
  if (regulatorType === "gstn" && tax && tax.score < 80) flags.push("GST filing irregularities suspected");
  if (regulatorType === "rbi" && (a.overall_score as number) < 50) flags.push("NBFC/bank exposure warrants RBI reporting");

  const result: AgentResult = {
    agent_type: "regulatory_compliance",
    run_id: uuidv4(),
    summary:
      flags.length === 0
        ? `No material regulatory flags for ${ctx.businessName} under ${regulatorType.toUpperCase()} review.`
        : `${flags.length} regulatory flag(s): ${flags.join("; ")}.`,
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
    summary: `Auto-enrichment for ${ctx.businessName ?? ctx.msmeId}: bureau, tax, legal, document intelligence (mock: ${config.useMockIntegrations}).`,
    recommendations: [
      "Verify GSTIN/PAN against live GSTN/ITR APIs",
      "Pull CIBIL/CRISIL commercial report",
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
