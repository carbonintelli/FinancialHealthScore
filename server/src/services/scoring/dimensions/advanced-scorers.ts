import { certificationValue } from "../data/certifications.js";
import { crisilRatingToScore } from "../data/credit-ratings.js";
import { geographicRiskScore } from "../data/geographic-risk.js";
import { estimatePercentile, getSectorBenchmark } from "../data/sector-benchmarks.js";
import { buildGovernmentPolicyAssessment } from "../policy-assessment.js";
import type {
  ConfidenceLevel,
  DimensionScore,
  EvidenceInsight,
  FinancialDataInput,
} from "../types.js";
import { bool, clamp, insight, num, round1, scoreToRisk, str } from "../utils.js";

export const DIMENSION_WEIGHTS = {
  government_policy_alignment: 0.04,
  credit_history_debt_servicing: 0.06,
  legal_compliance: 0.06,
  tax_compliance: 0.04,
  operational_certifications: 0.04,
  governance_diversity: 0.03,
  esg_disclosure: 0.04,
  supply_chain_resilience: 0.04,
  insurance_business_continuity: 0.03,
  geographic_risk: 0.03,
  peer_benchmark: 0.03,
} as const;

function rec(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function optNum(v: unknown): number | undefined {
  return typeof v === "number" && !Number.isNaN(v) ? v : undefined;
}

function dim(
  dimension: string,
  score: number,
  weight: number,
  confidence: ConfidenceLevel,
  insights: EvidenceInsight[],
): DimensionScore {
  return {
    dimension,
    score: round1(score),
    weight,
    risk_level: scoreToRisk(score),
    confidence,
    insights,
  };
}

export function scoreGovernmentPolicyAlignment(
  fd: FinancialDataInput,
  profile: Record<string, unknown>,
): DimensionScore {
  const policyAssessment = buildGovernmentPolicyAssessment(fd, profile);
  const insights: EvidenceInsight[] = [];

  for (const pi of policyAssessment.policy_insights.slice(0, 4)) {
    let impact: EvidenceInsight["impact"] =
      pi.status === "enrolled"
        ? "positive"
        : pi.status === "not_applicable"
          ? "neutral"
          : pi.alignment_score < 40
            ? "negative"
            : "neutral";
    if (pi.status === "eligible") impact = "negative";
    if (pi.status === "recommended") impact = "positive";

    insights.push(
      insight({
        indicator: pi.name,
        category: "government_policy",
        value: pi.status,
        benchmark: "enrolled",
        impact,
        narrative: pi.benefit_summary,
        confidence: pi.status === "enrolled" ? "high" : "medium",
        data_source: "government_policy_catalog",
      }),
    );
  }

  if (policyAssessment.sector_tailwinds.length) {
    insights.push(
      insight({
        indicator: "Sector Policy Tailwinds",
        category: "government_policy",
        value: policyAssessment.sector_tailwinds.length,
        benchmark: null,
        impact: "positive",
        narrative: policyAssessment.sector_tailwinds.slice(0, 2).join("; "),
        confidence: "medium",
        data_source: "government_policy_catalog",
      }),
    );
  }

  let score = policyAssessment.overall_alignment_score;
  const gc = rec(fd.government_compliance);
  if (gc) {
    const complianceScores: number[] = [];
    const overallCompliance = optNum(gc.overall_compliance_score);
    if (overallCompliance !== undefined) {
      complianceScores.push(overallCompliance);
    } else {
      for (const val of [gc.labour_law_compliance_pct, gc.pf_esi_compliance_pct]) {
        const n = optNum(val);
        if (n !== undefined) complianceScores.push(n);
      }
      for (const flag of [
        gc.environmental_clearance_valid,
        gc.factory_act_registered,
        gc.statutory_audit_completed,
        gc.mca_annual_filings_current,
      ]) {
        if (flag === true) complianceScores.push(90);
        else if (flag === false) complianceScores.push(40);
      }
    }
    if (complianceScores.length) {
      const compAvg = complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length;
      score = score * 0.6 + compAvg * 0.4;
      insights.push(
        insight({
          indicator: "Statutory Compliance",
          category: "government_compliance",
          value: `${compAvg.toFixed(0)}/100`,
          benchmark: "80",
          impact: compAvg >= 80 ? "positive" : "negative",
          narrative:
            `Regulatory compliance score ${compAvg.toFixed(0)}/100 covering labour, ` +
            "environmental, PF/ESI, and statutory filings.",
          confidence: "high",
          data_source: "compliance_records",
        }),
      );
    }
  }

  return dim(
    "government_policy_alignment",
    score,
    DIMENSION_WEIGHTS.government_policy_alignment,
    fd.government_policy ? "high" : "medium",
    insights,
  );
}

export function scoreCreditHistoryDebtServicing(
  credit: Record<string, unknown> | undefined,
  acct: Record<string, unknown>,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];
  let confidence: ConfidenceLevel = "low";

  if (!credit) {
    return dim(
      "credit_history_debt_servicing",
      52,
      DIMENSION_WEIGHTS.credit_history_debt_servicing,
      "low",
      [
        insight({
          indicator: "Credit Bureau Data",
          category: "credit_history",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative:
            "No credit bureau data (CRISIL rating, past debts, repayment history). " +
            "Request commercial credit report for accurate debt servicing assessment.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  const crisilRating = str(credit.crisil_rating);
  if (crisilRating) {
    const crisilScore = crisilRatingToScore(crisilRating, str(credit.crisil_outlook) || null);
    scores.push(crisilScore);
    const outlookText = credit.crisil_outlook ? ` (${str(credit.crisil_outlook)} outlook)` : "";
    const agency = str(credit.rating_agency, "CRISIL");
    insights.push(
      insight({
        indicator: `${agency} Rating`,
        category: "credit_rating",
        value: `${crisilRating}${outlookText}`,
        benchmark: "BBB+",
        impact: crisilScore >= 68 ? "positive" : crisilScore < 55 ? "negative" : "neutral",
        narrative:
          `${agency} rating of ${crisilRating}${outlookText} ` +
          `reflects ${crisilScore >= 77 ? "strong" : crisilScore >= 63 ? "adequate" : "weak"} ` +
          "creditworthiness for MSME lending.",
        confidence: "high",
        data_source: "credit_rating_agency",
      }),
    );
    confidence = "high";
  } else {
    const crisilScoreNum = optNum(credit.crisil_score);
    if (crisilScoreNum !== undefined) {
      scores.push(crisilScoreNum);
      insights.push(
        insight({
          indicator: "CRISIL-Equivalent Score",
          category: "credit_rating",
          value: `${crisilScoreNum.toFixed(0)}/100`,
          benchmark: 65,
          impact: crisilScoreNum >= 65 ? "positive" : "negative",
          narrative: `Numeric credit score of ${crisilScoreNum.toFixed(0)}/100 from bureau assessment.`,
          confidence: "high",
          data_source: "credit_bureau",
        }),
      );
      confidence = "high";
    }
  }

  const cmr = optNum(credit.commercial_credit_score);
  if (cmr !== undefined) {
    const cmrScore = clamp(100 - (cmr - 1) * 10);
    scores.push(cmrScore);
    insights.push(
      insight({
        indicator: "CIBIL MSME Rank (CMR)",
        category: "credit_bureau",
        value: cmr,
        benchmark: "1-3",
        impact: cmr <= 3 ? "positive" : cmr >= 7 ? "negative" : "neutral",
        narrative:
          `CIBIL MSME Rank CMR-${cmr} ` +
          `(${cmr <= 3 ? "low risk" : cmr >= 7 ? "elevated risk" : "moderate risk"}).`,
        confidence: "high",
        data_source: "cibil_commercial",
      }),
    );
    confidence = "high";
  }

  const pastDebts = arr(credit.past_debts) as Record<string, unknown>[];
  if (pastDebts.length) {
    const closed = pastDebts.filter((d) => str(d.status) === "closed");
    const active = pastDebts.filter((d) => str(d.status) === "active");
    const distressed = pastDebts.filter((d) =>
      ["restructured", "written_off", "npa", "substandard"].includes(str(d.status)),
    );

    if (closed.length) {
      const repayPcts = closed
        .map((d) => optNum(d.repayment_completed_pct))
        .filter((v): v is number => v !== undefined);
      const avgRepay = repayPcts.length ? repayPcts.reduce((a, b) => a + b, 0) / repayPcts.length : 100;
      scores.push(clamp(avgRepay));
      insights.push(
        insight({
          indicator: "Past Debt Repayment",
          category: "repayment_history",
          value: `${avgRepay.toFixed(0)}% avg completion`,
          benchmark: "100%",
          impact: avgRepay >= 95 ? "positive" : "negative",
          narrative:
            `${closed.length} closed loan(s) with average ${avgRepay.toFixed(0)}% principal repaid — ` +
            `${avgRepay >= 95 ? "strong" : "incomplete"} repayment track record.`,
          confidence: "high",
          data_source: "loan_history",
        }),
      );
    }

    if (active.length) {
      const totalOutstanding = active.reduce((sum, d) => sum + num(d.outstanding_inr), 0);
      insights.push(
        insight({
          indicator: "Active Debt Facilities",
          category: "debt_profile",
          value: `${active.length} loans, ₹${totalOutstanding.toLocaleString("en-IN")} outstanding`,
          benchmark: null,
          impact: "neutral",
          narrative: `${active.length} active loan facility(ies) with ₹${totalOutstanding.toLocaleString("en-IN")} total outstanding.`,
          confidence: "high",
          data_source: "loan_history",
        }),
      );
    }

    if (distressed.length) {
      const distressScore = clamp(40 - distressed.length * 15);
      scores.push(distressScore);
      insights.push(
        insight({
          indicator: "Distressed Debt History",
          category: "credit_risk",
          value: distressed.length,
          benchmark: 0,
          impact: "negative",
          narrative:
            `${distressed.length} loan(s) with restructured/NPA/written-off status — material credit history concern.`,
          confidence: "high",
          data_source: "loan_history",
        }),
      );
    }
  }

  const repaymentHistory = arr(credit.repayment_history) as Record<string, unknown>[];
  if (repaymentHistory.length) {
    const totalEmis = repaymentHistory.length;
    const onTime = repaymentHistory.filter((r) => str(r.status) === "on_time").length;
    const missed = repaymentHistory.filter((r) => str(r.status) === "missed").length;
    const onTimePct = totalEmis > 0 ? (onTime / totalEmis) * 100 : 0;
    const emiScore = clamp(onTimePct - missed * 10);
    scores.push(emiScore);
    insights.push(
      insight({
        indicator: "EMI Repayment Discipline",
        category: "repayment_history",
        value: `${onTimePct.toFixed(0)}% on-time (${totalEmis} EMIs)`,
        benchmark: "95%",
        impact: onTimePct >= 95 ? "positive" : onTimePct < 80 ? "negative" : "neutral",
        narrative: `${onTimePct.toFixed(0)}% of ${totalEmis} EMIs paid on time${missed ? `; ${missed} missed payment(s)` : ""}.`,
        confidence: "high",
        data_source: "repayment_records",
      }),
    );
    confidence = "high";
  } else {
    const emiOnTime = optNum(credit.emi_on_time_pct_12m);
    if (emiOnTime !== undefined) {
      scores.push(clamp(emiOnTime));
      insights.push(
        insight({
          indicator: "EMI On-Time Rate (12M)",
          category: "repayment_history",
          value: `${emiOnTime.toFixed(0)}%`,
          benchmark: "95%",
          impact: emiOnTime >= 95 ? "positive" : "negative",
          narrative: `${emiOnTime.toFixed(0)}% EMI on-time payment rate over trailing 12 months.`,
          confidence: "high",
          data_source: "bank_repayment_data",
        }),
      );
    }
  }

  let dscr = optNum(credit.debt_service_coverage_ratio);
  const netProfit = num(acct.net_profit_inr);
  if (dscr === undefined && netProfit && pastDebts.length) {
    const annualEmi = pastDebts
      .filter((d) => str(d.status) === "active" && optNum(d.emi_amount_inr))
      .reduce((sum, d) => sum + num(d.emi_amount_inr) * 12, 0);
    if (annualEmi > 0) dscr = netProfit / annualEmi;
  }

  if (dscr !== undefined) {
    const dscrScore = clamp(30 + dscr * 25);
    scores.push(dscrScore);
    insights.push(
      insight({
        indicator: "Debt Service Coverage Ratio",
        category: "debt_servicing",
        value: round1(dscr),
        benchmark: 1.25,
        impact: dscr >= 1.25 ? "positive" : dscr < 1.0 ? "negative" : "neutral",
        narrative:
          `DSCR of ${dscr.toFixed(2)}x indicates ` +
          `${dscr >= 1.5 ? "comfortable" : dscr >= 1.25 ? "adequate" : dscr >= 1.0 ? "tight" : "insufficient"} ` +
          "debt servicing capacity.",
        confidence: "high",
        data_source: "financial_analysis",
      }),
    );
  }

  const restructuredCount = num(credit.restructured_loans_count);
  if (restructuredCount > 0) {
    scores.push(clamp(50 - restructuredCount * 12));
    insights.push(
      insight({
        indicator: "Restructured Loans",
        category: "credit_risk",
        value: restructuredCount,
        benchmark: 0,
        impact: "negative",
        narrative: `${restructuredCount} restructured loan(s) in credit history.`,
        confidence: "high",
        data_source: "loan_history",
      }),
    );
  }

  const writtenOffCount = num(credit.written_off_loans_count);
  if (writtenOffCount > 0) {
    scores.push(20);
    insights.push(
      insight({
        indicator: "Written-Off Loans",
        category: "credit_risk",
        value: writtenOffCount,
        benchmark: 0,
        impact: "negative",
        narrative: `${writtenOffCount} written-off loan(s) — severe credit history flag.`,
        confidence: "high",
        data_source: "loan_history",
      }),
    );
  }

  const npaIncidents = num(credit.npa_incidents_5y);
  if (npaIncidents > 0) {
    scores.push(clamp(45 - npaIncidents * 18));
    insights.push(
      insight({
        indicator: "NPA Incidents (5Y)",
        category: "credit_risk",
        value: npaIncidents,
        benchmark: 0,
        impact: "negative",
        narrative: `${npaIncidents} NPA/substandard incident(s) in past 5 years.`,
        confidence: "high",
        data_source: "rbi_cibil_records",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 52;
  return dim(
    "credit_history_debt_servicing",
    score,
    DIMENSION_WEIGHTS.credit_history_debt_servicing,
    confidence,
    insights,
  );
}

export function scoreLegalCompliance(
  legal: Record<string, unknown> | undefined,
  sentiment: Record<string, unknown> | undefined,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  if (!legal) {
    const litCount = num(sentiment?.litigation_count_3y);
    if (litCount > 0) {
      const litScore = clamp(60 - litCount * 20);
      scores.push(litScore);
      insights.push(
        insight({
          indicator: "Litigation Count",
          category: "legal_risk",
          value: litCount,
          benchmark: 0,
          impact: "negative",
          narrative: `${litCount} litigation case(s) reported — submit detailed legal compliance profile.`,
          confidence: "medium",
          data_source: "market_sentiment",
        }),
      );
      const score = scores.reduce((a, b) => a + b, 0) / scores.length;
      return dim("legal_compliance", score, DIMENSION_WEIGHTS.legal_compliance, "medium", insights);
    }
    return dim(
      "legal_compliance",
      70,
      DIMENSION_WEIGHTS.legal_compliance,
      "low",
      [
        insight({
          indicator: "Legal Compliance Profile",
          category: "legal_risk",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative:
            "No legal compliance data — obtain litigation search for company and founders/directors.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  const companyLawsuits = arr(legal.company_lawsuits) as Record<string, unknown>[];
  const founderLawsuits = arr(legal.founder_lawsuits) as Record<string, unknown>[];
  const allCases = [...companyLawsuits, ...founderLawsuits];
  const pendingCo =
    optNum(legal.pending_cases_company) ??
    companyLawsuits.filter((c) => str(c.status) === "pending").length;
  const pendingFo =
    optNum(legal.pending_cases_founders) ??
    founderLawsuits.filter((c) => str(c.status) === "pending").length;
  const totalPending = pendingCo + pendingFo;

  if (totalPending === 0 && !allCases.length) {
    scores.push(92);
    insights.push(
      insight({
        indicator: "Litigation Status",
        category: "legal_risk",
        value: "no cases",
        benchmark: 0,
        impact: "positive",
        narrative: "No pending or historical lawsuits against company or founders.",
        confidence: "high",
        data_source: "legal_records",
      }),
    );
  } else {
    const pendingScore = clamp(85 - totalPending * 12);
    scores.push(pendingScore);
    insights.push(
      insight({
        indicator: "Pending Lawsuits",
        category: "legal_risk",
        value: `${pendingCo} company, ${pendingFo} founder/director`,
        benchmark: 0,
        impact: totalPending > 0 ? "negative" : "positive",
        narrative: `${totalPending} pending legal case(s): ${pendingCo} against company, ${pendingFo} against founders/directors.`,
        confidence: "high",
        data_source: "legal_records",
      }),
    );
  }

  const criminalPending = num(legal.criminal_cases_pending);
  if (criminalPending > 0) {
    scores.push(clamp(30 - criminalPending * 15));
    insights.push(
      insight({
        indicator: "Criminal Cases",
        category: "legal_risk",
        value: criminalPending,
        benchmark: 0,
        impact: "negative",
        narrative: `${criminalPending} pending criminal case(s) — material credit risk flag.`,
        confidence: "high",
        data_source: "legal_records",
      }),
    );
  }

  const regPenalties = num(legal.regulatory_penalties_3y);
  if (regPenalties > 0) {
    scores.push(clamp(50 - regPenalties * 15));
    insights.push(
      insight({
        indicator: "Regulatory Penalties",
        category: "regulatory_action",
        value: `${regPenalties} penalties, ₹${num(legal.regulatory_penalty_amount_inr).toLocaleString("en-IN")}`,
        benchmark: 0,
        impact: "negative",
        narrative: `${regPenalties} regulatory penalty(ies) in past 3 years.`,
        confidence: "high",
        data_source: "regulatory_records",
      }),
    );
  }

  const resolvedFav = optNum(legal.resolved_favorable_pct);
  if (resolvedFav !== undefined) {
    scores.push(clamp(resolvedFav));
    insights.push(
      insight({
        indicator: "Favorable Resolutions",
        category: "legal_track_record",
        value: `${resolvedFav.toFixed(0)}%`,
        benchmark: "80%",
        impact: resolvedFav >= 80 ? "positive" : "neutral",
        narrative: `${resolvedFav.toFixed(0)}% of resolved cases had favorable outcomes.`,
        confidence: "medium",
        data_source: "legal_records",
      }),
    );
  }

  const highStake = allCases.filter(
    (c) =>
      num(c.amount_at_stake_inr) > 5_000_000 && str(c.status) === "pending",
  );
  if (highStake.length) {
    scores.push(40);
    insights.push(
      insight({
        indicator: "High-Value Pending Claims",
        category: "legal_risk",
        value: highStake.length,
        benchmark: 0,
        impact: "negative",
        narrative: `${highStake.length} pending case(s) with claims exceeding ₹50 lakh.`,
        confidence: "high",
        data_source: "legal_records",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 70;
  const confidence: ConfidenceLevel = allCases.length || totalPending >= 0 ? "high" : "low";
  return dim("legal_compliance", score, DIMENSION_WEIGHTS.legal_compliance, confidence, insights);
}

export function scoreTaxCompliance(
  tax: Record<string, unknown> | undefined,
  govtPolicy: Record<string, unknown> | undefined,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];
  let confidence: ConfidenceLevel = "low";

  if (!tax) {
    return dim(
      "tax_compliance",
      58,
      DIMENSION_WEIGHTS.tax_compliance,
      "low",
      [
        insight({
          indicator: "Tax Compliance",
          category: "statutory_compliance",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative: "Income tax and statutory tax compliance data not submitted.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  const itrOnTime = optNum(tax.itr_filed_on_time_3y);
  if (itrOnTime !== undefined) {
    const itrScore = clamp((itrOnTime / 3) * 100);
    scores.push(itrScore);
    insights.push(
      insight({
        indicator: "ITR Filing Compliance",
        category: "income_tax",
        value: `${itrOnTime}/3 years on time`,
        benchmark: "3/3",
        impact: itrOnTime === 3 ? "positive" : "negative",
        narrative: `Income tax returns filed on time for ${itrOnTime} of last 3 years.`,
        confidence: "high",
        data_source: "income_tax_department",
      }),
    );
    confidence = "high";
  }

  const incomeTaxPaid = optNum(tax.income_tax_paid_inr_12m);
  if (incomeTaxPaid !== undefined) {
    scores.push(incomeTaxPaid > 0 ? 75 : 30);
    insights.push(
      insight({
        indicator: "Income Tax Paid (12M)",
        category: "income_tax",
        value: `₹${incomeTaxPaid.toLocaleString("en-IN")}`,
        benchmark: ">0",
        impact: incomeTaxPaid > 0 ? "positive" : "negative",
        narrative: `₹${incomeTaxPaid.toLocaleString("en-IN")} income tax paid in trailing 12 months.`,
        confidence: "high",
        data_source: "income_tax_department",
      }),
    );
  }

  const advanceTax = optNum(tax.advance_tax_compliance_pct);
  if (advanceTax !== undefined) {
    scores.push(clamp(advanceTax));
    insights.push(
      insight({
        indicator: "Advance Tax Compliance",
        category: "income_tax",
        value: `${advanceTax.toFixed(0)}%`,
        benchmark: "100%",
        impact: advanceTax >= 95 ? "positive" : "negative",
        narrative: `Advance tax compliance at ${advanceTax.toFixed(0)}%.`,
        confidence: "high",
        data_source: "income_tax_department",
      }),
    );
  }

  const tdsPct = optNum(tax.tds_compliance_pct);
  if (tdsPct !== undefined) {
    scores.push(clamp(tdsPct));
    insights.push(
      insight({
        indicator: "TDS Compliance",
        category: "statutory_tax",
        value: `${tdsPct.toFixed(0)}%`,
        benchmark: "95%",
        impact: tdsPct >= 95 ? "positive" : "negative",
        narrative: `TDS deposit and filing compliance at ${tdsPct.toFixed(0)}%.`,
        confidence: "medium",
        data_source: "income_tax_department",
      }),
    );
  }

  let gstPct = optNum(tax.gst_filing_compliance_pct);
  if (gstPct === undefined && govtPolicy) {
    gstPct = optNum(govtPolicy.gst_filing_compliance_pct);
  }
  if (gstPct !== undefined) {
    scores.push(clamp(gstPct));
    insights.push(
      insight({
        indicator: "GST Filing Compliance",
        category: "indirect_tax",
        value: `${gstPct.toFixed(0)}%`,
        benchmark: "95%",
        impact: gstPct >= 95 ? "positive" : "negative",
        narrative: `GST return filing compliance at ${gstPct.toFixed(0)}%.`,
        confidence: "high",
        data_source: "gst_portal",
      }),
    );
  }

  const taxDemand = num(tax.tax_demand_outstanding_inr);
  if (taxDemand > 0) {
    const demandPenalty = clamp(60 - Math.min(taxDemand / 1_000_000, 30) * 2);
    scores.push(demandPenalty);
    insights.push(
      insight({
        indicator: "Outstanding Tax Demand",
        category: "income_tax",
        value: `₹${taxDemand.toLocaleString("en-IN")}`,
        benchmark: 0,
        impact: "negative",
        narrative: `₹${taxDemand.toLocaleString("en-IN")} outstanding tax demand — verify dispute status.`,
        confidence: "high",
        data_source: "income_tax_department",
      }),
    );
  }

  if (bool(tax.tax_litigation_pending)) {
    scores.push(35);
    insights.push(
      insight({
        indicator: "Tax Litigation",
        category: "income_tax",
        value: "pending",
        benchmark: "none",
        impact: "negative",
        narrative: "Pending income tax litigation — obtain legal opinion on materiality.",
        confidence: "high",
        data_source: "legal_records",
      }),
    );
  }

  if (bool(tax.tax_clearance_certificate)) {
    scores.push(90);
    insights.push(
      insight({
        indicator: "Tax Clearance Certificate",
        category: "income_tax",
        value: "held",
        benchmark: "held",
        impact: "positive",
        narrative: "Valid tax clearance certificate on file.",
        confidence: "high",
        data_source: "income_tax_department",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 58;
  return dim("tax_compliance", score, DIMENSION_WEIGHTS.tax_compliance, confidence, insights);
}

export function scoreOperationalCertifications(
  certs: Record<string, unknown> | undefined,
  govtPolicy: Record<string, unknown> | undefined,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  const allCertNames: string[] = [];
  if (certs) {
    allCertNames.push(...arr(certs.iso_certifications).map((c) => str(c)).filter(Boolean));
    for (const c of arr(certs.certifications) as Record<string, unknown>[]) {
      const name = str(c.name);
      if (name) allCertNames.push(name);
    }
  }
  if (govtPolicy) {
    allCertNames.push(...arr(govtPolicy.iso_certifications).map((c) => str(c)).filter(Boolean));
    const zedLevel = str(govtPolicy.zed_certification_level);
    if (zedLevel) allCertNames.push(`ZED ${zedLevel}`);
  }

  if (!allCertNames.length) {
    return dim(
      "operational_certifications",
      50,
      DIMENSION_WEIGHTS.operational_certifications,
      "low",
      [
        insight({
          indicator: "Operational Certifications",
          category: "quality_compliance",
          value: "none reported",
          benchmark: "ISO 9001",
          impact: "neutral",
          narrative:
            "No ISO or operational certifications reported — consider ISO 9001 and sector-specific standards.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  const certScores = allCertNames.map((name) => certificationValue(name));
  const base = clamp(40 + certScores.reduce((a, b) => a + b, 0));
  scores.push(base);
  insights.push(
    insight({
      indicator: "Certification Portfolio",
      category: "quality_compliance",
      value: allCertNames.slice(0, 5).join(", "),
      benchmark: "ISO 9001 + sector standard",
      impact: "positive",
      narrative: `${allCertNames.length} operational certification(s) including ${allCertNames[0]}.`,
      confidence: "high",
      data_source: "certification_records",
    }),
  );

  if (certs?.quality_audit_passed === true) {
    scores.push(88);
    insights.push(
      insight({
        indicator: "Quality Audit",
        category: "quality_compliance",
        value: "passed",
        benchmark: "passed",
        impact: "positive",
        narrative: "Most recent quality audit passed successfully.",
        confidence: "high",
        data_source: "audit_reports",
      }),
    );
  } else if (certs?.quality_audit_passed === false) {
    scores.push(35);
    insights.push(
      insight({
        indicator: "Quality Audit",
        category: "quality_compliance",
        value: "failed",
        benchmark: "passed",
        impact: "negative",
        narrative: "Recent quality audit failure — remedial action required.",
        confidence: "high",
        data_source: "audit_reports",
      }),
    );
  }

  const coveragePct = optNum(certs?.certification_coverage_pct);
  if (coveragePct !== undefined) {
    scores.push(clamp(coveragePct));
    insights.push(
      insight({
        indicator: "Certification Coverage",
        category: "quality_compliance",
        value: `${coveragePct.toFixed(0)}%`,
        benchmark: "80%",
        impact: coveragePct >= 80 ? "positive" : "neutral",
        narrative: `Certifications cover ${coveragePct.toFixed(0)}% of production processes.`,
        confidence: "medium",
        data_source: "certification_records",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  return dim(
    "operational_certifications",
    score,
    DIMENSION_WEIGHTS.operational_certifications,
    "high",
    insights,
  );
}

export function scoreGovernanceDiversity(
  governance: Record<string, unknown> | undefined,
  founder: Record<string, unknown> | undefined,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  let femaleFounders = num(governance?.female_founders_count);
  const femaleDirectors = num(governance?.female_directors_count);
  if (founder && bool(founder.is_female) && femaleFounders === 0) {
    femaleFounders = 1;
  }

  if (!governance && !(founder && bool(founder.is_female))) {
    return dim(
      "governance_diversity",
      60,
      DIMENSION_WEIGHTS.governance_diversity,
      "low",
      [
        insight({
          indicator: "Governance Diversity",
          category: "governance",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative:
            "Governance diversity data not submitted. Women-led MSMEs show lower NPA correlation per RBI studies.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  scores.push(55);

  if (femaleFounders > 0) {
    const founderBonus = Math.min(12, 6 + femaleFounders * 4);
    scores.push(clamp(60 + founderBonus));
    insights.push(
      insight({
        indicator: "Female Founders",
        category: "governance_diversity",
        value: femaleFounders,
        benchmark: ">=1",
        impact: "positive",
        narrative:
          `${femaleFounders} female founder(s) — associated with lower credit risk and ` +
          "eligibility for Stand-Up India / MUDRA Mahila programs.",
        confidence: "medium",
        data_source: "governance_records",
      }),
    );
  }

  if (femaleDirectors > 0) {
    const dirBonus = Math.min(10, 5 + femaleDirectors * 3);
    scores.push(clamp(58 + dirBonus));
    const totalDirectors = num(governance?.total_directors);
    const diversityPct = totalDirectors ? (femaleDirectors / totalDirectors) * 100 : undefined;
    insights.push(
      insight({
        indicator: "Female Directors",
        category: "governance_diversity",
        value: `${femaleDirectors}${diversityPct !== undefined ? ` (${diversityPct.toFixed(0)}% of board)` : ""}`,
        benchmark: ">=1",
        impact: "positive",
        narrative:
          `${femaleDirectors} female director(s) on board — strengthens governance ` +
          "and diversity-linked finance eligibility.",
        confidence: "medium",
        data_source: "governance_records",
      }),
    );
  }

  if (bool(governance?.women_led_enterprise)) {
    scores.push(85);
    insights.push(
      insight({
        indicator: "Women-Led Enterprise",
        category: "governance_diversity",
        value: "confirmed",
        benchmark: "Udyam women enterprise",
        impact: "positive",
        narrative:
          "Udyam-registered women-led enterprise — qualifies for preferential schemes " +
          "and demonstrates lower historical NPA rates in MSME portfolios.",
        confidence: "high",
        data_source: "udyam_portal",
      }),
    );
  }

  if (bool(governance?.women_entrepreneur_scheme_enrolled)) {
    scores.push(82);
    insights.push(
      insight({
        indicator: "Women Entrepreneur Scheme",
        category: "governance_diversity",
        value: "enrolled",
        benchmark: "Stand-Up India / MUDRA Mahila",
        impact: "positive",
        narrative: "Enrolled in women entrepreneur financing scheme — positive governance signal.",
        confidence: "high",
        data_source: "government_schemes",
      }),
    );
  }

  const boardIndep = optNum(governance?.board_independence_pct);
  if (boardIndep !== undefined) {
    scores.push(clamp(50 + boardIndep * 0.5));
    insights.push(
      insight({
        indicator: "Board Independence",
        category: "governance",
        value: `${boardIndep.toFixed(0)}%`,
        benchmark: "33%",
        impact: boardIndep >= 33 ? "positive" : "neutral",
        narrative: `${boardIndep.toFixed(0)}% independent board representation.`,
        confidence: "medium",
        data_source: "governance_records",
      }),
    );
  }

  if (femaleFounders === 0 && femaleDirectors === 0) {
    insights.push(
      insight({
        indicator: "Gender Diversity",
        category: "governance_diversity",
        value: "none reported",
        benchmark: null,
        impact: "neutral",
        narrative: "No female founders or directors reported — neutral scoring applied.",
        confidence: "low",
        data_source: "governance_records",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 60;
  const confidence: ConfidenceLevel = bool(governance?.women_led_enterprise) ? "high" : "medium";
  return dim("governance_diversity", score, DIMENSION_WEIGHTS.governance_diversity, confidence, insights);
}

export function scoreEsgDisclosure(
  esg: Record<string, unknown> | undefined,
  carbonData: Record<string, unknown> | null | undefined,
  weight: number,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  if (!esg) {
    const reportsOverview = rec(carbonData?.reports_overview);
    const brsr = reportsOverview?.brsrLiteReady;
    if (brsr === false) {
      return dim(
        "esg_disclosure",
        45,
        weight,
        "medium",
        [
          insight({
            indicator: "BRSR Readiness",
            category: "esg_disclosure",
            value: "not ready",
            benchmark: "BRSR Lite",
            impact: "negative",
            narrative: "Carbon Intelligence indicates BRSR Lite not ready — ESG disclosure gap.",
            confidence: "medium",
            data_source: "ci.sustainow.in",
          }),
        ],
      );
    }
    return dim(
      "esg_disclosure",
      50,
      weight,
      "low",
      [
        insight({
          indicator: "ESG Disclosure",
          category: "esg_disclosure",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative: "No ESG/BRSR disclosure data submitted.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  if (bool(esg.brsr_lite_ready)) {
    scores.push(85);
    insights.push(
      insight({
        indicator: "BRSR Lite Ready",
        category: "esg_disclosure",
        value: "ready",
        benchmark: "ready",
        impact: "positive",
        narrative: "BRSR Lite disclosure readiness confirmed.",
        confidence: "high",
        data_source: "esg_disclosure",
      }),
    );
  }
  if (bool(esg.ghg_inventory_completed)) {
    scores.push(80);
    insights.push(
      insight({
        indicator: "GHG Inventory",
        category: "esg_disclosure",
        value: "completed",
        benchmark: "completed",
        impact: "positive",
        narrative: "GHG Protocol-aligned inventory completed.",
        confidence: "high",
        data_source: "esg_disclosure",
      }),
    );
  }
  if (bool(esg.esg_report_published)) {
    scores.push(78);
    insights.push(
      insight({
        indicator: "ESG Report",
        category: "esg_disclosure",
        value: str(esg.esg_report_year, "published"),
        benchmark: "annual",
        impact: "positive",
        narrative: "Published ESG/sustainability report.",
        confidence: "high",
        data_source: "esg_disclosure",
      }),
    );
  }
  const disclosureScore = optNum(esg.disclosure_score);
  if (disclosureScore !== undefined) {
    scores.push(clamp(disclosureScore));
    insights.push(
      insight({
        indicator: "ESG Disclosure Score",
        category: "esg_disclosure",
        value: `${disclosureScore.toFixed(0)}/100`,
        benchmark: 70,
        impact: disclosureScore >= 70 ? "positive" : "negative",
        narrative: `Composite ESG disclosure score: ${disclosureScore.toFixed(0)}/100.`,
        confidence: "high",
        data_source: "esg_assessment",
      }),
    );
  }
  if (bool(esg.supplier_esg_program)) {
    scores.push(75);
    insights.push(
      insight({
        indicator: "Supplier ESG Program",
        category: "esg_disclosure",
        value: "active",
        benchmark: "active",
        impact: "positive",
        narrative: "Supplier ESG engagement program in place.",
        confidence: "medium",
        data_source: "esg_disclosure",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50;
  return dim("esg_disclosure", score, weight, scores.length >= 2 ? "high" : "medium", insights);
}

export function scoreSupplyChainResilience(
  supplyChain: Record<string, unknown> | undefined,
  _productMarket: Record<string, unknown> | undefined,
  carbonData: Record<string, unknown> | null | undefined,
  weight: number,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  if (!supplyChain) {
    const txn = rec(carbonData?.transactions_summary);
    if (txn) {
      const sup = num(txn.supplierConcentrationTop3Pct, 50);
      const cust = num(txn.customerConcentrationTop3Pct, 50);
      const concScore = clamp(100 - Math.max(sup, cust) * 0.8);
      return dim(
        "supply_chain_resilience",
        concScore,
        weight,
        "medium",
        [
          insight({
            indicator: "Concentration Risk (CI)",
            category: "supply_chain",
            value: `suppliers ${sup.toFixed(0)}%, customers ${cust.toFixed(0)}%`,
            benchmark: "30%",
            impact: Math.max(sup, cust) > 45 ? "negative" : "neutral",
            narrative: "Supply chain stress estimated from Carbon Intelligence transaction concentration.",
            confidence: "medium",
            data_source: "ci.sustainow.in",
          }),
        ],
      );
    }
    return dim(
      "supply_chain_resilience",
      55,
      weight,
      "low",
      [
        insight({
          indicator: "Supply Chain Profile",
          category: "supply_chain",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative: "Submit supply chain profile for stress testing.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  const keySupplierCount = optNum(supplyChain.key_supplier_count);
  if (keySupplierCount !== undefined) {
    const divScore = clamp(40 + keySupplierCount * 3);
    scores.push(divScore);
    insights.push(
      insight({
        indicator: "Supplier Base Diversity",
        category: "supply_chain",
        value: keySupplierCount,
        benchmark: ">=10",
        impact: keySupplierCount >= 10 ? "positive" : "negative",
        narrative: `${keySupplierCount} active suppliers in network.`,
        confidence: "high",
        data_source: "supply_chain_records",
      }),
    );
  }

  const singleSourceDep = optNum(supplyChain.single_source_dependency_pct);
  if (singleSourceDep !== undefined) {
    scores.push(clamp(100 - Math.max(0, singleSourceDep - 20) * 2));
    insights.push(
      insight({
        indicator: "Single-Source Dependency",
        category: "supply_chain",
        value: `${singleSourceDep.toFixed(0)}%`,
        benchmark: "20%",
        impact: singleSourceDep > 30 ? "negative" : "positive",
        narrative: `${singleSourceDep.toFixed(0)}% of inputs from single-source suppliers.`,
        confidence: "high",
        data_source: "supply_chain_records",
      }),
    );
  }

  const inventoryDays = optNum(supplyChain.inventory_days);
  if (inventoryDays !== undefined) {
    const invScore = clamp(50 + (45 - Math.abs(inventoryDays - 45)) * 0.8);
    scores.push(invScore);
    insights.push(
      insight({
        indicator: "Inventory Days",
        category: "supply_chain",
        value: inventoryDays,
        benchmark: "30-60",
        impact: inventoryDays >= 25 && inventoryDays <= 60 ? "positive" : "negative",
        narrative: `Inventory covers ${inventoryDays.toFixed(0)} days of operations.`,
        confidence: "medium",
        data_source: "inventory_records",
      }),
    );
  }

  const stressMonths = optNum(supplyChain.stress_scenario_survival_months);
  if (stressMonths !== undefined) {
    const stressScore = clamp(30 + stressMonths * 15);
    scores.push(stressScore);
    insights.push(
      insight({
        indicator: "Stress Test Survival",
        category: "supply_chain",
        value: `${stressMonths.toFixed(1)} months`,
        benchmark: "3 months",
        impact: stressMonths >= 3 ? "positive" : "negative",
        narrative:
          `Under 30% revenue shock scenario, operations sustainable for ${stressMonths.toFixed(1)} months.`,
        confidence: "high",
        data_source: "stress_testing",
      }),
    );
  }

  const altSuppliers = optNum(supplyChain.alternate_suppliers_identified_pct);
  if (altSuppliers !== undefined) {
    scores.push(clamp(altSuppliers));
    insights.push(
      insight({
        indicator: "Alternate Suppliers",
        category: "supply_chain",
        value: `${altSuppliers.toFixed(0)}%`,
        benchmark: "70%",
        impact: altSuppliers >= 70 ? "positive" : "negative",
        narrative: `${altSuppliers.toFixed(0)}% of critical inputs have alternate suppliers.`,
        confidence: "medium",
        data_source: "supply_chain_records",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 55;
  return dim(
    "supply_chain_resilience",
    score,
    weight,
    stressMonths !== undefined ? "high" : "medium",
    insights,
  );
}

export function scoreInsurance(
  insurance: Record<string, unknown> | undefined,
  weight: number,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  if (!insurance) {
    return dim(
      "insurance_business_continuity",
      52,
      weight,
      "low",
      [
        insight({
          indicator: "Insurance Coverage",
          category: "business_continuity",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative: "Insurance coverage data not submitted — business continuity risk unassessed.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
    );
  }

  const coverageTypes: string[] = [];
  if (bool(insurance.property_insurance)) {
    coverageTypes.push("property");
    scores.push(85);
  }
  if (bool(insurance.machinery_breakdown_cover)) {
    coverageTypes.push("machinery");
    scores.push(80);
  }
  if (bool(insurance.business_interruption_cover)) {
    coverageTypes.push("business_interruption");
    scores.push(88);
  }
  if (bool(insurance.liability_insurance)) {
    coverageTypes.push("liability");
    scores.push(82);
  }
  if (bool(insurance.key_person_insurance)) {
    coverageTypes.push("key_person");
    scores.push(78);
  }

  if (coverageTypes.length) {
    insights.push(
      insight({
        indicator: "Insurance Policies",
        category: "business_continuity",
        value: coverageTypes.join(", "),
        benchmark: "property + BI + liability",
        impact: "positive",
        narrative: `Active coverage: ${coverageTypes.join(", ")}.`,
        confidence: "high",
        data_source: "insurance_records",
      }),
    );
  }

  const coverageAdequacy = optNum(insurance.coverage_adequacy_pct);
  if (coverageAdequacy !== undefined) {
    scores.push(clamp(coverageAdequacy));
    insights.push(
      insight({
        indicator: "Coverage Adequacy",
        category: "business_continuity",
        value: `${coverageAdequacy.toFixed(0)}%`,
        benchmark: "80%",
        impact: coverageAdequacy >= 80 ? "positive" : "negative",
        narrative: `Insurance covers ${coverageAdequacy.toFixed(0)}% of asset/revenue exposure.`,
        confidence: "medium",
        data_source: "insurance_records",
      }),
    );
  }

  if (bool(insurance.claims_history_clean)) {
    scores.push(90);
    insights.push(
      insight({
        indicator: "Claims History",
        category: "business_continuity",
        value: "clean",
        benchmark: "clean",
        impact: "positive",
        narrative: "No adverse insurance claims history.",
        confidence: "high",
        data_source: "insurance_records",
      }),
    );
  }

  const score = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 52;
  return dim(
    "insurance_business_continuity",
    score,
    weight,
    coverageTypes.length ? "high" : "low",
    insights,
  );
}

export function scoreGeographicRisk(
  geographic: Record<string, unknown> | undefined,
  profile: Record<string, unknown>,
  weight: number,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  let state = geographic ? str(geographic.state) || undefined : undefined;
  const tier = geographic ? str(geographic.tier) || undefined : undefined;

  const gstin = str(profile.gstin);
  if (!state && gstin) {
    state = gstin.startsWith("27") ? "maharashtra" : undefined;
  }

  let base = geographicRiskScore(state, tier);
  const scoreList = [base];

  if (state) {
    insights.push(
      insight({
        indicator: "State Economic Index",
        category: "geographic_risk",
        value: state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        benchmark: "top quartile states",
        impact: base >= 75 ? "positive" : base >= 65 ? "neutral" : "negative",
        narrative: `Operating in ${state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} — economic risk index ${base.toFixed(0)}/100.`,
        confidence: "high",
        data_source: "geographic_risk_index",
      }),
    );
  }

  const floodZone = geographic ? str(geographic.flood_risk_zone).toLowerCase() : "";
  if (floodZone) {
    const floodPenalty: Record<string, number> = { low: 0, moderate: -8, high: -18, very_high: -30 };
    const adj = floodPenalty[floodZone] ?? 0;
    base = clamp(base + adj);
    scoreList[0] = base;
    insights.push(
      insight({
        indicator: "Flood Risk Zone",
        category: "geographic_risk",
        value: geographic!.flood_risk_zone as string,
        benchmark: "low",
        impact: adj < -10 ? "negative" : "neutral",
        narrative: `Flood risk classified as ${str(geographic!.flood_risk_zone)}.`,
        confidence: "medium",
        data_source: "geographic_risk_index",
      }),
    );
  }

  if (geographic && bool(geographic.industrial_cluster_presence)) {
    scoreList.push(Math.min(100, base + 5));
    insights.push(
      insight({
        indicator: "Industrial Cluster",
        category: "geographic_risk",
        value: "present",
        benchmark: "present",
        impact: "positive",
        narrative: "Located in established industrial cluster — infrastructure and supply chain advantages.",
        confidence: "medium",
        data_source: "geographic_risk_index",
      }),
    );
  }

  const score = scoreList.length ? scoreList.reduce((a, b) => a + b, 0) / scoreList.length : 65;
  return dim("geographic_risk", score, weight, state ? "high" : "low", insights);
}

export function scorePeerBenchmark(
  profile: Record<string, unknown>,
  accounting: Record<string, unknown>,
  creditBureau: Record<string, unknown> | undefined,
  _carbonData: Record<string, unknown> | null | undefined,
  weight: number,
): DimensionScore {
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];
  const bench = getSectorBenchmark(str(profile.sector, "general"));

  const revenue = num(accounting.revenue_inr);
  const revenuePct = estimatePercentile(revenue, bench.median_revenue_inr);
  scores.push(revenuePct);
  insights.push(
    insight({
      indicator: "Revenue Percentile",
      category: "peer_benchmark",
      value: `${revenuePct.toFixed(0)}th percentile`,
      benchmark: "50th",
      impact: revenuePct >= 50 ? "positive" : "negative",
      narrative:
        `Revenue ₹${revenue.toLocaleString("en-IN")} vs sector median ` +
        `₹${bench.median_revenue_inr.toLocaleString("en-IN")} — ${revenuePct.toFixed(0)}th percentile.`,
      confidence: "high",
      data_source: "sector_benchmarks",
    }),
  );

  const currentLiabilities = num(accounting.current_liabilities_inr);
  const currentAssets = num(accounting.current_assets_inr);
  const cr = currentLiabilities > 0 ? currentAssets / currentLiabilities : 1.5;
  const crPct = estimatePercentile(cr, bench.median_current_ratio);
  scores.push(crPct);
  insights.push(
    insight({
      indicator: "Liquidity Percentile",
      category: "peer_benchmark",
      value: `${crPct.toFixed(0)}th percentile`,
      benchmark: "50th",
      impact: crPct >= 50 ? "positive" : "negative",
      narrative: `Current ratio ${cr.toFixed(2)} vs sector median ${bench.median_current_ratio.toFixed(2)}.`,
      confidence: "high",
      data_source: "sector_benchmarks",
    }),
  );

  const cogs = num(accounting.cost_of_goods_inr);
  const opex = num(accounting.operating_expenses_inr);
  const margin = revenue > 0 ? (revenue - cogs - opex) / revenue : 0;
  const marginPct = estimatePercentile(margin * 100, bench.median_operating_margin_pct);
  scores.push(marginPct);
  insights.push(
    insight({
      indicator: "Margin Percentile",
      category: "peer_benchmark",
      value: `${marginPct.toFixed(0)}th percentile`,
      benchmark: "50th",
      impact: marginPct >= 50 ? "positive" : "negative",
      narrative: `Operating margin ${(margin * 100).toFixed(1)}% vs sector median ${bench.median_operating_margin_pct.toFixed(1)}%.`,
      confidence: "high",
      data_source: "sector_benchmarks",
    }),
  );

  const dscr = optNum(creditBureau?.debt_service_coverage_ratio);
  if (dscr !== undefined) {
    const dscrPct = estimatePercentile(dscr, bench.median_dscr);
    scores.push(dscrPct);
    insights.push(
      insight({
        indicator: "DSCR Percentile",
        category: "peer_benchmark",
        value: `${dscrPct.toFixed(0)}th percentile`,
        benchmark: "50th",
        impact: dscrPct >= 50 ? "positive" : "negative",
        narrative: `DSCR ${dscr.toFixed(2)}x vs sector median ${bench.median_dscr.toFixed(2)}x.`,
        confidence: "high",
        data_source: "sector_benchmarks",
      }),
    );
  }

  const avgPct = scores.reduce((a, b) => a + b, 0) / scores.length;
  insights.push(
    insight({
      indicator: "Cohort Size",
      category: "peer_benchmark",
      value: Math.trunc(bench.cohort_size),
      benchmark: null,
      impact: "neutral",
      narrative: `Benchmarked against ${Math.trunc(bench.cohort_size).toLocaleString("en-IN")} MSMEs in ${str(profile.sector)} sector.`,
      confidence: "medium",
      data_source: "sector_benchmarks",
    }),
  );

  return dim("peer_benchmark", avgPct, weight, "high", insights);
}
