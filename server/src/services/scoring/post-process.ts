import type { ThinFileProfile } from "./thin-file.js";
import { crisilRatingToScore } from "./data/credit-ratings.js";
import { buildGovernmentPolicyAssessment } from "./policy-assessment.js";
import type {
  AdvancedIntelligenceSummary,
  AssessmentRequest,
  CarbonIntelligenceSummary,
  ConfidenceLevel,
  DataGap,
  DimensionScore,
  FinancialDataInput,
  GovernmentPolicyAssessment,
  RiskIndicator,
  RiskLevel,
} from "./types.js";
import { clamp, num, round1, scoreToGrade, scoreToRisk, str } from "./utils.js";

const GOVERNANCE_SCORE_BONUS_CAP = 2.5;

const RECOMMENDATIONS: Record<string, string> = {
  financial_resilience: "Strengthen balance sheet through debt restructuring or equity infusion.",
  cash_flow_health: "Implement cash flow forecasting and optimise receivables/payables cycles.",
  operational_stability: "Review cost structure and operational efficiency programmes.",
  payment_behaviour: "Set up payment reminders and consider supply chain finance solutions.",
  carbon_transition_risk: "Commission carbon assessment and develop transition roadmap.",
  alternative_data_signals: "Diversify supplier and customer base to reduce concentration risk.",
  founder_capability: "Strengthen management team depth and document succession planning.",
  market_sentiment: "Address customer satisfaction gaps and monitor public reputation.",
  product_demand_outlook: "Diversify product portfolio and secure long-term order commitments.",
  government_policy_alignment: "Enroll in eligible government schemes (CGTMSE, CLCSS, PLI) to reduce financing cost.",
  credit_history_debt_servicing: "Improve EMI discipline and reduce leverage to strengthen CRISIL rating outlook.",
  legal_compliance: "Resolve pending litigation and obtain legal opinion on material cases.",
  tax_compliance: "Clear outstanding tax demands and maintain timely ITR and advance tax payments.",
  operational_certifications: "Obtain ISO 9001 and sector-specific certifications (IATF, BIS, FSSAI).",
  governance_diversity: "Strengthen board governance and explore women entrepreneur scheme benefits.",
  esg_disclosure: "Complete BRSR Lite disclosure and publish annual ESG report.",
  supply_chain_resilience: "Diversify suppliers and establish alternate sourcing for critical inputs.",
  insurance_business_continuity: "Obtain business interruption and key-person insurance coverage.",
  geographic_risk: "Assess regional exposure and industrial cluster infrastructure advantages.",
  peer_benchmark: "Improve metrics below sector median to advance portfolio percentile ranking.",
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

export function governanceOverallBonus(
  governance: Record<string, unknown> | undefined,
  dimensions: DimensionScore[],
): number {
  const govDim = dimensions.find((d) => d.dimension === "governance_diversity");
  if (!governance && !(govDim && govDim.score >= 75)) return 0;

  let bonus = 0;
  if (governance) {
    if (governance.women_led_enterprise) bonus += 1.5;
    if (num(governance.female_founders_count) > 0) bonus += Math.min(1, num(governance.female_founders_count) * 0.5);
    if (num(governance.female_directors_count) > 0) bonus += Math.min(0.8, num(governance.female_directors_count) * 0.3);
    if (governance.women_entrepreneur_scheme_enrolled) bonus += 0.5;
  }
  if (govDim && govDim.score >= 80) bonus += 0.5;
  return Math.min(bonus, GOVERNANCE_SCORE_BONUS_CAP);
}

export function identifyDataGaps(
  fd: FinancialDataInput,
  carbonData?: Record<string, unknown> | null,
  thinFile?: ThinFileProfile | null,
): DataGap[] {
  const gaps: DataGap[] = [];
  const profile = rec(fd.profile);
  const add = (field: string, category: string, severity: string, message: string, recommendation: string, impacts: string[]) => {
    gaps.push({ field, category, severity, message, recommendation, impacts_dimensions: impacts });
  };

  if (!fd.credit_bureau) {
    add("credit_bureau", "credit_data", "high", "No CRISIL rating or debt repayment history provided.",
      "Obtain commercial credit report with CRISIL/ICRA rating and loan repayment track record.",
      ["credit_history_debt_servicing", "financial_resilience"]);
  }
  if (thinFile?.is_thin_file && !rec(fd.account_aggregator).session_id && !rec(fd.account_aggregator).avg_monthly_balance_inr) {
    add("account_aggregator", "alternate_data", "high", "NTC/NTB borrower — Account Aggregator bank statement consent not linked.",
      "Initiate AA consent flow to fetch consented bank statements for thin-file credit assessment.",
      ["alternative_data_signals", "cash_flow_health", "payment_behaviour"]);
  }
  if (thinFile?.is_thin_file && !rec(fd.upi_analytics).monthly_transaction_volume_inr) {
    add("upi_analytics", "alternate_data", "medium", "UPI merchant analytics not available for alternate-data scoring.",
      "Link business UPI VPA for payment velocity and revenue trend signals.",
      ["alternative_data_signals", "cash_flow_health"]);
  }
  if (thinFile?.is_thin_file && !rec(fd.epfo_compliance).registered) {
    add("epfo_compliance", "alternate_data", "medium", "EPFO establishment data not verified — employment stability unknown.",
      "Verify EPFO registration and contribution history for workforce stability signals.",
      ["operational_stability", "alternative_data_signals"]);
  }
  if (!fd.founder) {
    add("founder", "management", "medium", "Founder profile not provided for key-person risk assessment.",
      "Submit founder experience, CIBIL score, and management team details.", ["founder_capability"]);
  }
  if (!fd.market_sentiment) {
    add("market_sentiment", "reputation", "medium", "Market sentiment and reputation data not provided.",
      "Collect NPS, online reviews, and media sentiment metrics.", ["market_sentiment"]);
  }
  if (!fd.cash_flows?.length && !carbonData?.transactions_summary) {
    add("cash_flows", "financial", "medium", "No cash flow data or CI transaction analytics available.",
      "Submit monthly cash flows or link Carbon Intelligence MSME ID.", ["cash_flow_health"]);
  }
  if (!str(profile.msme_id) || !carbonData) {
    add("carbon_intelligence", "sustainability", "medium", "Carbon Intelligence data not linked.",
      "Register MSME on ci.sustainow.in and provide msme_id for carbon risk enrichment.",
      ["carbon_transition_risk", "cash_flow_health"]);
  }
  if (!fd.legal_compliance) {
    add("legal_compliance", "legal", "high", "No legal compliance profile — company and founder litigation unknown.",
      "Submit e-Courts litigation search for company and all directors/founders.", ["legal_compliance"]);
  }
  if (!fd.tax_compliance) {
    add("tax_compliance", "statutory", "high", "Income tax payment and ITR compliance data missing.",
      "Provide ITR acknowledgements, advance tax payment proof, and TDS compliance.", ["tax_compliance"]);
  }
  if (!fd.governance_diversity) {
    add("governance_diversity", "governance", "low", "Board and founder diversity data not provided.",
      "Report female founders/directors for governance scoring and scheme eligibility.", ["governance_diversity"]);
  }
  return gaps;
}

export function buildRiskIndicators(
  dimensions: DimensionScore[],
  acct: Record<string, unknown>,
  carbonData: Record<string, unknown> | null | undefined,
  fd: FinancialDataInput,
): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];
  const founder = rec(fd.founder);
  const market = rec(fd.market_sentiment);
  const credit = rec(fd.credit_bureau);
  const legal = rec(fd.legal_compliance);
  const tax = rec(fd.tax_compliance);
  const product = rec(fd.product_market);

  for (const dim of dimensions) {
    if (["high", "critical", "elevated"].includes(dim.risk_level)) {
      const worst = dim.insights.find((i) => i.impact === "negative");
      if (worst) {
        indicators.push({
          code: `RISK_${dim.dimension.toUpperCase()}`,
          label: `${dim.dimension.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Risk`,
          severity: dim.risk_level as RiskLevel,
          description: worst.narrative,
          evidence: [`${worst.indicator}: ${worst.value}`],
          recommended_action: RECOMMENDATIONS[dim.dimension] ?? "Conduct detailed due diligence.",
        });
      }
    }
  }

  const liabilities = num(acct.current_liabilities_inr);
  if (liabilities > 0) {
    const cr = num(acct.current_assets_inr) / liabilities;
    if (cr < 1) {
      indicators.push({
        code: "RISK_LIQUIDITY_SHORTFALL",
        label: "Liquidity Shortfall",
        severity: cr < 0.8 ? "high" : "elevated",
        description: `Current ratio ${cr.toFixed(2)} below 1.0 indicates potential working capital stress.`,
        evidence: [`Current assets: ₹${num(acct.current_assets_inr).toLocaleString("en-IN")}`, `Current liabilities: ₹${liabilities.toLocaleString("en-IN")}`],
        recommended_action: "Review working capital facilities and receivables collection cycle.",
      });
    }
  }

  const carbon = rec(carbonData?.carbon_summary);
  const energy = num(carbon.energyCostSharePct);
  if (energy > 15) {
    indicators.push({
      code: "RISK_ENERGY_EXPOSURE",
      label: "Energy Cost Exposure",
      severity: "elevated",
      description: `Energy costs at ${energy.toFixed(1)}% of spend create margin vulnerability to price shocks.`,
      evidence: [`Energy cost share: ${energy.toFixed(1)}%`],
      recommended_action: "Explore energy efficiency financing and renewable transition options.",
    });
  }

  if (num(founder.prior_defaults) > 0) {
    indicators.push({
      code: "RISK_FOUNDER_DEFAULT",
      label: "Founder Credit Default History",
      severity: "high",
      description: `Founder has ${num(founder.prior_defaults)} prior loan default(s) on record.`,
      evidence: [`Prior defaults: ${num(founder.prior_defaults)}`],
      recommended_action: "Obtain personal guarantee assessment and enhanced monitoring.",
    });
  }

  if (str(product.market_demand_outlook) === "declining") {
    indicators.push({
      code: "RISK_DECLINING_DEMAND",
      label: "Declining Market Demand",
      severity: "high",
      description: "Product market demand outlook is declining — revenue at risk.",
      evidence: [`Outlook: ${str(product.market_demand_outlook)}`],
      recommended_action: "Assess product diversification and pivot strategy.",
    });
  }

  if (str(credit.crisil_rating)) {
    const crisilS = crisilRatingToScore(str(credit.crisil_rating), str(credit.crisil_outlook) || null);
    if (crisilS < 55) {
      indicators.push({
        code: "RISK_LOW_CRISIL",
        label: "Low CRISIL Rating",
        severity: crisilS < 45 ? "high" : "elevated",
        description: `CRISIL rating ${str(credit.crisil_rating)} indicates below-investment-grade credit risk.`,
        evidence: [`CRISIL: ${str(credit.crisil_rating)}`, `Outlook: ${str(credit.crisil_outlook) || "N/A"}`],
        recommended_action: "Enhanced credit monitoring and collateral requirements recommended.",
      });
    }
  }

  if (num(legal.criminal_cases_pending) > 0) {
    indicators.push({
      code: "RISK_CRIMINAL_LITIGATION",
      label: "Criminal Litigation Pending",
      severity: "high",
      description: `${num(legal.criminal_cases_pending)} pending criminal case(s) against company or founders.`,
      evidence: [`Criminal cases: ${num(legal.criminal_cases_pending)}`],
      recommended_action: "Obtain legal due diligence report before credit sanction.",
    });
  }

  if (tax.tax_litigation_pending) {
    indicators.push({
      code: "RISK_TAX_LITIGATION",
      label: "Income Tax Litigation",
      severity: "elevated",
      description: "Pending income tax litigation may result in contingent liabilities.",
      evidence: ["Tax litigation: pending"],
      recommended_action: "Verify disputed demand amount and provision in financials.",
    });
  }

  return indicators.slice(0, 14);
}

export function buildKeyInsights(dimensions: DimensionScore[], risks: RiskIndicator[]): string[] {
  const insights: string[] = [];
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  insights.push(`Strongest dimension: ${best.dimension.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (score: ${best.score})`);
  insights.push(`Weakest dimension: ${worst.dimension.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} (score: ${worst.score})`);

  for (const dim of dimensions) {
    for (const ev of dim.insights) {
      if (ev.impact === "negative" && (ev.confidence === "high" || ev.confidence === "medium")) {
        insights.push(ev.narrative);
        if (insights.length >= 6) break;
      }
    }
    if (insights.length >= 6) break;
  }
  if (risks.length) insights.push(`${risks.length} risk indicator(s) flagged for review.`);
  return insights.slice(0, 8);
}

export function identifyGreenFinanceOpportunities(
  dimensions: DimensionScore[],
  carbonData?: Record<string, unknown> | null,
): string[] {
  const opportunities: string[] = [];
  const carbonDim = dimensions.find((d) => d.dimension === "carbon_transition_risk");
  if (carbonDim && carbonDim.score < 70) {
    opportunities.push("Energy efficiency term loan: High energy cost exposure suggests ROI-positive efficiency investments.");
    opportunities.push("Solar rooftop financing: Scope 2 emissions reduction opportunity via renewable energy transition.");
  }
  const reports = rec(carbonData?.reports_overview);
  if (reports && reports.brsrLiteReady === false) {
    opportunities.push("Sustainability-linked loan: BRSR readiness gap can be addressed through green finance covenants.");
  }
  const opDim = dimensions.find((d) => d.dimension === "operational_stability");
  if (opDim && opDim.score >= 65) {
    opportunities.push("Working capital green overdraft: Stable operations support short-term sustainable procurement finance.");
  }
  return opportunities.slice(0, 5);
}

export function buildCarbonSummary(
  carbonData: Record<string, unknown> | null | undefined,
  msmeId?: string | null,
): CarbonIntelligenceSummary | null {
  if (!carbonData) return null;
  const carbon = rec(carbonData.carbon_summary);
  const reports = rec(carbonData.reports_overview);
  const txn = rec(carbonData.transactions_summary);
  const intensity = num(carbon.carbonIntensityKgPerRevenue, 0.35);
  return {
    source: "ci.sustainow.in",
    msme_id: msmeId,
    total_emissions_tco2e: num(carbon.totalEmissionsTco2e) || null,
    scope1_tco2e: num(carbon.scope1Tco2e) || null,
    scope2_tco2e: num(carbon.scope2Tco2e) || null,
    scope3_tco2e: num(carbon.scope3Tco2e) || null,
    carbon_intensity: intensity,
    transition_risk_score: round1(clamp(100 - intensity * 80)),
    energy_cost_exposure_pct: num(carbon.energyCostSharePct) || num(txn.energySpendSharePct) || null,
    reporting_readiness: str(reports.reportingReadiness) || null,
    data_freshness: str(carbon.assessmentDate) || null,
    mock_data: carbonData.mock_data === true,
  };
}

export function buildAdvancedIntelligenceSummary(
  dimensions: DimensionScore[],
  enrichmentLog?: Record<string, unknown> | null,
): AdvancedIntelligenceSummary {
  const sources = [
    ["credit_bureau", "CIBIL/CRISIL Bureau"],
    ["tax_verification", "GSTN/ITR Verification"],
    ["legal_search", "e-Courts/MCA Litigation"],
    ["document_intelligence", "Document OCR"],
    ["account_aggregator", "Account Aggregator (RBI AA)"],
    ["upi_analytics", "UPI Merchant Analytics"],
    ["epfo_compliance", "EPFO Establishment Compliance"],
  ] as const;
  const applied = (enrichmentLog?.applied as string[]) ?? [];
  const mock = enrichmentLog?.mock_mode !== false;
  const peerDim = dimensions.find((d) => d.dimension === "peer_benchmark");
  const supplyDim = dimensions.find((d) => d.dimension === "supply_chain_resilience");
  return {
    enrichment_applied: applied,
    integration_status: sources.map(([key, label]) => ({
      source: key,
      status: applied.includes(key) ? "applied" : "skipped",
      mock,
      message: label,
    })),
    document_validation: enrichmentLog?.document_validation,
    peer_percentile_overall: peerDim?.score ?? null,
    stress_test_passed: supplyDim ? supplyDim.score >= 60 : null,
  };
}

export function buildRecommendedImprovements(
  dimensions: DimensionScore[],
  gaps: DataGap[],
  fd: FinancialDataInput,
  policy: GovernmentPolicyAssessment | null,
): string[] {
  const recs: string[] = [];
  const worst = [...dimensions].sort((a, b) => a.score - b.score).slice(0, 3);
  for (const dim of worst) {
    if (dim.score < 65) {
      recs.push(`Improve ${dim.dimension.replace(/_/g, " ")} (current: ${dim.score}/100): ${RECOMMENDATIONS[dim.dimension] ?? "Review dimension."}`);
    }
  }
  for (const gap of gaps) {
    if (gap.severity === "high") recs.push(`[Gap] ${gap.recommendation}`);
  }
  if (policy) {
    for (const pi of policy.policy_insights) {
      if (pi.status === "eligible" && pi.action_recommendation) recs.push(`[Scheme] ${pi.action_recommendation}`);
    }
  }
  return recs.slice(0, 12);
}

export function audienceSummary(audience: string, score: number, risks: RiskIndicator[]): string {
  const riskCount = risks.length;
  const grade = scoreToGrade(score);
  const summaries: Record<string, string> = {
    credit_team: `Credit assessment: Financial Health Score ${score.toFixed(0)}/100 (Grade ${grade}). ${score >= 70 ? "Approve with standard terms" : score >= 50 ? "Recommend enhanced due diligence" : "High caution advised"}. ${riskCount} risk flag(s) identified.`,
    risk_team: `Risk monitoring: Score ${score.toFixed(0)}/100 with ${riskCount} active risk indicator(s). Priority review: ${risks.slice(0, 3).map((r) => r.label).join(", ") || "none"}.`,
    relationship_manager: `Relationship view: Client health at ${score.toFixed(0)}/100 (Grade ${grade}). ${score >= 75 ? "Strong candidate for cross-sell" : "Proactive engagement recommended"}. Green finance opportunities available.`,
    portfolio_analyst: `Portfolio intelligence: MSME scores ${score.toFixed(0)}/100, risk tier ${scoreToRisk(score)}. Benchmark against portfolio median recommended.`,
  };
  return summaries[audience] ?? summaries.credit_team;
}

export function dataSources(fd: FinancialDataInput, carbonData?: Record<string, unknown> | null): string[] {
  const sources = ["accounting_records", "msme_profile"];
  if (fd.cash_flows?.length) sources.push("cash_flows");
  if (fd.utility_bills?.length) sources.push("utility_bills");
  if (fd.payment_records?.length) sources.push("payment_records");
  if (fd.bank_statement_summary) sources.push("bank_statements");
  if (rec(fd.account_aggregator).session_id || rec(fd.account_aggregator).avg_monthly_balance_inr) {
    sources.push("account_aggregator");
  }
  if (rec(fd.upi_analytics).monthly_transaction_volume_inr) sources.push("upi");
  if (rec(fd.epfo_compliance).registered) sources.push("epfo");
  if (carbonData) sources.push("ci.sustainow.in");
  if (fd.founder) sources.push("founder_profile");
  if (fd.market_sentiment) sources.push("sentiment_analysis", "public_reviews", "gst_portal");
  if (fd.government_policy || rec(fd.profile).udyam_number) sources.push("government_policy_catalog");
  if (fd.credit_bureau) sources.push("credit_rating_agency", "cibil_commercial", "loan_history");
  if (fd.legal_compliance) sources.push("legal_records");
  if (fd.tax_compliance) sources.push("income_tax_department");
  sources.push("sector_benchmarks");
  return sources;
}

export function assemblePostProcess(
  request: AssessmentRequest,
  dimensions: DimensionScore[],
  carbonData: Record<string, unknown> | null | undefined,
  enrichmentLog: Record<string, unknown> | null | undefined,
  governanceBonus: number,
  thinFile?: ThinFileProfile | null,
) {
  const fd = request.financial_data;
  const profile = rec(fd.profile);
  const dataGaps = identifyDataGaps(fd, carbonData, thinFile);
  const acct = rec(fd.accounting);
  const riskIndicators = buildRiskIndicators(dimensions, acct, carbonData, fd);
  const keyInsights = buildKeyInsights(dimensions, riskIndicators);
  const greenOpportunities = identifyGreenFinanceOpportunities(dimensions, carbonData);
  const carbonSummary = buildCarbonSummary(carbonData, str(profile.msme_id) || undefined);
  const policyAssessment = buildGovernmentPolicyAssessment(fd, profile);
  const recommended = buildRecommendedImprovements(dimensions, dataGaps, fd, policyAssessment);
  const advancedSummary = buildAdvancedIntelligenceSummary(dimensions, enrichmentLog);
  const audience = request.audience ?? "credit_team";
  const overall = clamp(dimensions.reduce((s, d) => s + d.score * d.weight, 0) + governanceBonus);
  return {
    overall,
    dataGaps,
    riskIndicators,
    keyInsights,
    greenOpportunities,
    carbonSummary,
    policyAssessment,
    recommended,
    advancedSummary,
    audienceSummary: audienceSummary(audience, overall, riskIndicators),
    metadata: {
      sector: str(profile.sector, "general"),
      audience,
      data_sources: dataSources(fd, carbonData),
      alternate_data_sources: (enrichmentLog?.alternate_data_sources as string[]) ?? dataSources(fd, carbonData).filter((s) =>
        ["account_aggregator", "upi", "epfo", "gst"].includes(s),
      ),
      data_gap_count: dataGaps.length,
      high_priority_gaps: dataGaps.filter((g) => g.severity === "high").length,
      governance_score_bonus: round1(governanceBonus),
      dimension_count: dimensions.length,
      enrichment_applied: (enrichmentLog?.applied as string[]) ?? [],
      borrower_segment: thinFile?.segment ?? "standard",
      thin_file_scoring: thinFile?.is_thin_file ?? false,
    },
  };
}
