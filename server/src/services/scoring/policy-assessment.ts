import { getApplicablePolicies } from "../../data/government-policies.js";
import type { FinancialDataInput, GovernmentPolicyAssessment, PolicyAlignmentInsight } from "./types.js";
import { clamp, num, round1, str } from "./utils.js";

function rec(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function buildGovernmentPolicyAssessment(
  fd: FinancialDataInput,
  profile: Record<string, unknown>,
): GovernmentPolicyAssessment {
  const enrollment = rec(fd.government_policy);
  const productMarket = rec(fd.product_market);
  const products = arr(productMarket?.products) as Record<string, unknown>[];
  const productCategories = products.map((p) => str(p.category)).filter(Boolean);
  const applicable = getApplicablePolicies(str(profile.sector, "general"), productCategories);

  const enrolledCodes = new Set(
    arr(enrollment?.enrolled_scheme_codes).map((c) => str(c)).filter(Boolean),
  );
  if (str(profile.udyam_number) && !enrolledCodes.has("UDYAM")) {
    enrolledCodes.add("UDYAM");
  }

  const pending = new Set(arr(enrollment?.pending_applications).map((c) => str(c)).filter(Boolean));
  const policyInsights: PolicyAlignmentInsight[] = [];
  const alignmentScores: number[] = [];
  const sectorTailwinds: string[] = [];
  const financingOpportunities: string[] = [];

  for (const policy of applicable.slice(0, 10)) {
    let status: string;
    let alignScore: number;
    let action: string | null = null;

    if (enrolledCodes.has(policy.code)) {
      status = "enrolled";
      alignScore = 90 + policy.relevance_weight * 10;
      sectorTailwinds.push(`${policy.name}: active enrollment`);
    } else if (pending.has(policy.code)) {
      status = "recommended";
      alignScore = 60 + policy.relevance_weight * 20;
      action = `Complete pending application for ${policy.name}`;
    } else {
      status = "eligible";
      alignScore = 40 + policy.relevance_weight * 30;
      action = `Apply for ${policy.name} — ${policy.benefits[0]}`;
    }

    policyInsights.push({
      code: policy.code,
      name: policy.name,
      status,
      alignment_score: round1(Math.min(alignScore, 100)),
      benefit_summary: policy.description,
      action_recommendation: action,
    });
    alignmentScores.push(status === "enrolled" ? alignScore : alignScore * 0.6);

    if (status === "eligible" && ["CGTMSE", "PMMY", "CLCSS", "SOLAR_ROOFTOP"].includes(policy.code)) {
      financingOpportunities.push(`${policy.name}: ${policy.benefits[0]}`);
    }
  }

  const zedLevel = str(enrollment?.zed_certification_level).toLowerCase();
  if (zedLevel) {
    const zedBonus: Record<string, number> = { bronze: 5, silver: 10, gold: 15, diamond: 20 };
    alignmentScores.push(70 + (zedBonus[zedLevel] ?? 0));
  }

  const gstPct = enrollment?.gst_filing_compliance_pct;
  if (typeof gstPct === "number") {
    if (gstPct >= 95) {
      alignmentScores.push(85);
    } else if (gstPct < 70) {
      alignmentScores.push(35);
    }
  }

  if (productMarket?.ev_supply_chain_exposure) {
    sectorTailwinds.push("PLI Auto & ACC Battery: EV supply chain policy tailwinds");
  }
  if (productMarket?.import_substitution_potential) {
    sectorTailwinds.push("Make in India: import substitution policy support");
  }

  const overall = alignmentScores.length ? alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length : 50;
  const enrolledCount = policyInsights.filter((p) => p.status === "enrolled").length;
  const eligibleCount = policyInsights.filter((p) => p.status === "eligible").length;

  return {
    overall_alignment_score: round1(clamp(overall)),
    enrolled_count: enrolledCount,
    eligible_unenrolled_count: eligibleCount,
    policy_insights: policyInsights,
    sector_tailwinds: sectorTailwinds.slice(0, 5),
    financing_opportunities: financingOpportunities.slice(0, 5),
  };
}
