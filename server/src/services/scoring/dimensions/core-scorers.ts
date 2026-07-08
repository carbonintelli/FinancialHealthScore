import { DIMENSION_MAP } from "../../agents/catalog.js";
import type { ConfidenceLevel, DimensionScore, EvidenceInsight, ScoringContext } from "../types.js";
import { bool, clamp, insight, num, round1, scoreToRisk, str } from "../utils.js";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function arr(v: unknown): Record<string, unknown>[] {
  return Array.isArray(v) ? (v as Record<string, unknown>[]) : [];
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function avg(scores: number[], fallback = 50): number {
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : fallback;
}

function pct0(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

function pct1(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function carbonTxn(ctx: ScoringContext): Record<string, unknown> | null {
  const cd = rec(ctx.carbonData);
  const txn = rec(cd.transactions_summary);
  return Object.keys(txn).length ? txn : null;
}

function carbonSummary(ctx: ScoringContext): Record<string, unknown> | null {
  const cd = rec(ctx.carbonData);
  const summary = rec(cd.carbon_summary);
  return Object.keys(summary).length ? summary : null;
}

function carbonReports(ctx: ScoringContext): Record<string, unknown> {
  const cd = rec(ctx.carbonData);
  return rec(cd.reports_overview);
}

function dimScore(
  dimension: string,
  score: number,
  confidence: ConfidenceLevel,
  insights: EvidenceInsight[],
  riskOverride?: DimensionScore["risk_level"],
): DimensionScore {
  return {
    dimension,
    score: round1(score),
    weight: DIMENSION_MAP[dimension].weight,
    risk_level: riskOverride ?? scoreToRisk(score),
    confidence,
    insights,
  };
}

export function scoreFinancialResilience(ctx: ScoringContext): DimensionScore {
  const acct = rec(ctx.financialData.accounting);
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  const currentLiabilities = num(acct.current_liabilities_inr);
  const currentRatio =
    currentLiabilities > 0 ? num(acct.current_assets_inr) / currentLiabilities : 2.0;
  const crScore = clamp(currentRatio * 35);
  scores.push(crScore);
  insights.push(
    insight({
      indicator: "Current Ratio",
      category: "liquidity",
      value: Math.round(currentRatio * 100) / 100,
      benchmark: 1.5,
      impact: currentRatio >= 1.5 ? "positive" : "negative",
      narrative: `Current ratio of ${currentRatio.toFixed(2)} indicates ${
        currentRatio >= 1.5 ? "adequate" : "strained"
      } short-term liquidity.`,
      confidence: "high",
      data_source: "accounting_records",
    }),
  );

  const totalAssets = num(acct.current_assets_inr) + num(acct.equity_inr);
  const debtRatio = totalAssets > 0 ? num(acct.total_debt_inr) / totalAssets : 0;
  const drScore = clamp(100 - debtRatio * 120);
  scores.push(drScore);
  insights.push(
    insight({
      indicator: "Debt-to-Assets Ratio",
      category: "leverage",
      value: Math.round(debtRatio * 100) / 100,
      benchmark: 0.5,
      impact: debtRatio <= 0.5 ? "positive" : "negative",
      narrative: `Debt-to-assets ratio of ${pct0(debtRatio)} suggests ${
        debtRatio <= 0.5 ? "conservative" : "elevated"
      } leverage.`,
      confidence: "high",
      data_source: "accounting_records",
    }),
  );

  const revenue = num(acct.revenue_inr);
  const margin =
    revenue > 0
      ? (revenue - num(acct.cost_of_goods_inr) - num(acct.operating_expenses_inr)) / revenue
      : 0;
  const marginScore = clamp(margin * 300 + 30);
  scores.push(marginScore);
  insights.push(
    insight({
      indicator: "Operating Margin",
      category: "profitability",
      value: pct1(margin),
      benchmark: "10%",
      impact: margin >= 0.1 ? "positive" : "negative",
      narrative: `Operating margin of ${pct1(margin)} reflects ${
        margin >= 0.1 ? "healthy" : "thin"
      } profitability.`,
      confidence: "high",
      data_source: "accounting_records",
    }),
  );

  return dimScore("financial_resilience", avg(scores), "high", insights);
}

export function scoreCashFlowHealth(ctx: ScoringContext): DimensionScore {
  const insights: EvidenceInsight[] = [];
  let confidence: ConfidenceLevel = "medium";
  let score: number;

  const txn = carbonTxn(ctx);
  const cashFlows = arr(ctx.financialData.cash_flows);

  if (txn) {
    const inflow = num(txn.avgMonthlyInflowInr);
    const outflow = num(txn.avgMonthlyOutflowInr);
    const net = inflow - outflow;
    const marginPct = inflow > 0 ? (net / inflow) * 100 : 0;
    const volatility = num(txn.inflowVolatilityPct, 20);

    score = clamp(50 + marginPct * 2 - volatility * 0.5);
    insights.push(
      insight({
        indicator: "Net Cash Margin",
        category: "cash_flow",
        value: `${marginPct.toFixed(1)}%`,
        benchmark: "8%",
        impact: marginPct >= 8 ? "positive" : "negative",
        narrative: `Average monthly net cash margin of ${marginPct.toFixed(1)}% from transaction analytics.`,
        confidence: "high",
        data_source: "ci.sustainow.in/transactions",
      }),
      insight({
        indicator: "Inflow Volatility",
        category: "cash_flow",
        value: `${volatility.toFixed(1)}%`,
        benchmark: "15%",
        impact: volatility <= 15 ? "positive" : "negative",
        narrative: `Cash inflow volatility at ${volatility.toFixed(1)}% indicates operational stability.`,
        confidence: "high",
        data_source: "ci.sustainow.in/transactions",
      }),
    );
    confidence = "high";
  } else if (cashFlows.length) {
    const nets = cashFlows.map((cf) => num(cf.inflows) - num(cf.outflows));
    const avgNet = nets.reduce((a, b) => a + b, 0) / nets.length;
    const avgInflow = cashFlows.reduce((a, cf) => a + num(cf.inflows), 0) / cashFlows.length;
    const marginPct = avgInflow > 0 ? (avgNet / avgInflow) * 100 : 0;
    const volatility =
      avgNet !== 0
        ? (Math.sqrt(nets.reduce((a, n) => a + (n - avgNet) ** 2, 0) / nets.length) / Math.abs(avgNet)) *
          100
        : 50;

    score = clamp(50 + marginPct * 2 - Math.min(volatility, 50) * 0.4);
    insights.push(
      insight({
        indicator: "Cash Flow Margin",
        category: "cash_flow",
        value: `${marginPct.toFixed(1)}%`,
        benchmark: "8%",
        impact: marginPct >= 8 ? "positive" : "negative",
        narrative: `Trailing cash flow margin of ${marginPct.toFixed(1)}% from submitted records.`,
        confidence: "medium",
        data_source: "submitted_cash_flows",
      }),
    );
  } else {
    score = 55;
    insights.push(
      insight({
        indicator: "Cash Flow Data",
        category: "cash_flow",
        value: "unavailable",
        benchmark: null,
        impact: "neutral",
        narrative: "Limited cash flow data available; score based on accounting proxies.",
        confidence: "low",
        data_source: "inferred",
      }),
    );
    confidence = "low";
  }

  return dimScore("cash_flow_health", score, confidence, insights);
}

export function scoreOperationalStability(ctx: ScoringContext): DimensionScore {
  const acct = rec(ctx.financialData.accounting);
  const profile = rec(ctx.financialData.profile);
  const utilityBills = arr(ctx.financialData.utility_bills);
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  const revenue = num(acct.revenue_inr);
  const opexRatio = revenue > 0 ? num(acct.operating_expenses_inr) / revenue : 1;
  const opexScore = clamp(100 - opexRatio * 80);
  scores.push(opexScore);
  insights.push(
    insight({
      indicator: "Opex-to-Revenue Ratio",
      category: "operational_efficiency",
      value: pct1(opexRatio),
      benchmark: "25%",
      impact: opexRatio <= 0.25 ? "positive" : "negative",
      narrative: `Operating expenses consume ${pct1(opexRatio)} of revenue.`,
      confidence: "high",
      data_source: "accounting_records",
    }),
  );

  if (utilityBills.length) {
    const totalEnergy = utilityBills.reduce(
      (sum, b) => sum + num(b.electricity_cost_inr) + num(b.fuel_cost_inr),
      0,
    );
    const months = utilityBills.length;
    const annualEnergy = months > 0 ? totalEnergy * (12 / months) : 0;
    const energyShare = revenue > 0 ? annualEnergy / revenue : 0;
    const energyScore = clamp(100 - energyShare * 400);
    scores.push(energyScore);
    insights.push(
      insight({
        indicator: "Energy Cost Exposure",
        category: "operational_volatility",
        value: pct1(energyShare),
        benchmark: "8%",
        impact: energyShare <= 0.08 ? "positive" : "negative",
        narrative: `Energy costs represent ${pct1(energyShare)} of revenue, ${
          energyShare <= 0.08 ? "within" : "above"
        } typical MSME benchmarks.`,
        confidence: "medium",
        data_source: "utility_bills",
      }),
    );
  }

  const yearsInOperation = profile.years_in_operation != null ? num(profile.years_in_operation) : 0;
  if (yearsInOperation) {
    const tenureScore = clamp(40 + yearsInOperation * 4);
    scores.push(tenureScore);
    insights.push(
      insight({
        indicator: "Business Tenure",
        category: "stability",
        value: `${yearsInOperation.toFixed(0)} years`,
        benchmark: "5 years",
        impact: yearsInOperation >= 5 ? "positive" : "neutral",
        narrative: `Business operating for ${yearsInOperation.toFixed(0)} years.`,
        confidence: "medium",
        data_source: "msme_profile",
      }),
    );
  }

  return dimScore("operational_stability", avg(scores), "medium", insights);
}

export function scorePaymentBehaviour(ctx: ScoringContext): DimensionScore {
  const paymentRecords = arr(ctx.financialData.payment_records);
  const insights: EvidenceInsight[] = [];
  let confidence: ConfidenceLevel = "medium";
  let score: number;

  if (paymentRecords.length) {
    const total = paymentRecords.length;
    const onTime = paymentRecords.filter((p) => str(p.status) === "on_time").length;
    const late = paymentRecords.filter((p) => ["late", "overdue"].includes(str(p.status))).length;
    const defaulted = paymentRecords.filter((p) => str(p.status) === "defaulted").length;

    const onTimePct = (onTime / total) * 100;
    score = clamp(onTimePct - defaulted * 20);

    insights.push(
      insight({
        indicator: "On-Time Payment Rate",
        category: "payment_behaviour",
        value: `${onTimePct.toFixed(0)}%`,
        benchmark: "90%",
        impact: onTimePct >= 90 ? "positive" : "negative",
        narrative: `${onTimePct.toFixed(0)}% of payments made on time across ${total} records.`,
        confidence: "high",
        data_source: "payment_records",
      }),
    );
    if (late > 0) {
      insights.push(
        insight({
          indicator: "Late/Overdue Payments",
          category: "payment_behaviour",
          value: late,
          benchmark: 0,
          impact: "negative",
          narrative: `${late} late or overdue payment(s) detected.`,
          confidence: "high",
          data_source: "payment_records",
        }),
      );
    }
    confidence = "high";
  } else {
    const txn = carbonTxn(ctx);
    if (txn) {
      const lateRate = num(txn.latePaymentRatePct, 10);
      score = clamp(100 - lateRate * 3);
      insights.push(
        insight({
          indicator: "Late Payment Rate",
          category: "payment_behaviour",
          value: `${lateRate.toFixed(1)}%`,
          benchmark: "5%",
          impact: lateRate <= 5 ? "positive" : "negative",
          narrative: `Transaction analytics show ${lateRate.toFixed(1)}% late payment rate.`,
          confidence: "medium",
          data_source: "ci.sustainow.in/transactions",
        }),
      );
    } else {
      score = 60;
      insights.push(
        insight({
          indicator: "Payment History",
          category: "payment_behaviour",
          value: "limited",
          benchmark: null,
          impact: "neutral",
          narrative: "Insufficient payment history; neutral score applied.",
          confidence: "low",
          data_source: "inferred",
        }),
      );
      confidence = "low";
    }
  }

  return dimScore("payment_behaviour", score, confidence, insights);
}

export function scoreCarbonTransitionRisk(ctx: ScoringContext): DimensionScore {
  const utilityBills = arr(ctx.financialData.utility_bills);
  const insights: EvidenceInsight[] = [];
  let confidence: ConfidenceLevel = "low";
  let score: number;

  const carbon = carbonSummary(ctx);
  if (carbon) {
    const intensity = num(carbon.carbonIntensityKgPerRevenue, 0.5);
    const energyShare = num(carbon.energyCostSharePct, 15) / 100;
    const completeness = num(carbon.dataCompletenessPct, 50);

    const intensityScore = clamp(100 - intensity * 80);
    const energyScore = clamp(100 - energyShare * 300);
    score = (intensityScore + energyScore) / 2;

    insights.push(
      insight({
        indicator: "Carbon Intensity",
        category: "transition_risk",
        value: `${intensity.toFixed(2)} kgCO₂/₹`,
        benchmark: "0.30",
        impact: intensity <= 0.3 ? "positive" : "negative",
        narrative: `Carbon intensity of ${intensity.toFixed(2)} kgCO₂ per revenue unit from Carbon Intelligence assessment.`,
        confidence: completeness >= 70 ? "high" : "medium",
        data_source: "ci.sustainow.in/carbon-summary",
      }),
      insight({
        indicator: "Energy Cost Share",
        category: "transition_risk",
        value: pct1(energyShare),
        benchmark: "10%",
        impact: energyShare <= 0.1 ? "positive" : "negative",
        narrative: `Energy costs account for ${pct1(energyShare)} of operational spend.`,
        confidence: "high",
        data_source: "ci.sustainow.in/carbon-summary",
      }),
    );

    const reports = carbonReports(ctx);
    if (reports.transitionPlanDocumented === false) {
      insights.push(
        insight({
          indicator: "Transition Plan",
          category: "transition_risk",
          value: "not documented",
          benchmark: "documented",
          impact: "negative",
          narrative: "No documented decarbonisation transition plan on file.",
          confidence: "medium",
          data_source: "ci.sustainow.in/reports",
        }),
      );
      score = Math.max(0, score - 8);
    }

    confidence = completeness >= 75 ? "high" : "medium";
  } else if (utilityBills.length) {
    score = 65;
    insights.push(
      insight({
        indicator: "Carbon Assessment",
        category: "transition_risk",
        value: "utility proxy",
        benchmark: null,
        impact: "neutral",
        narrative: "Carbon score estimated from utility bill data; full CI assessment recommended.",
        confidence: "low",
        data_source: "utility_bills",
      }),
    );
  } else {
    score = 50;
    insights.push(
      insight({
        indicator: "Carbon Data",
        category: "transition_risk",
        value: "unavailable",
        benchmark: null,
        impact: "neutral",
        narrative: "No carbon intelligence data; link MSME ID to ci.sustainow.in for enrichment.",
        confidence: "low",
        data_source: "none",
      }),
    );
  }

  return dimScore("carbon_transition_risk", score, confidence, insights);
}

export function scoreAlternativeDataSignals(ctx: ScoringContext): DimensionScore {
  const fd = ctx.financialData;
  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];
  let confidence: ConfidenceLevel = "medium";

  const txn = carbonTxn(ctx);
  if (txn) {
    const supplierConc = num(txn.supplierConcentrationTop3Pct, 50);
    const customerConc = num(txn.customerConcentrationTop3Pct, 50);

    const supplierScore = clamp(100 - Math.max(0, supplierConc - 30) * 1.5);
    const customerScore = clamp(100 - Math.max(0, customerConc - 30) * 1.5);
    scores.push(supplierScore, customerScore);

    insights.push(
      insight({
        indicator: "Supplier Concentration (Top 3)",
        category: "concentration_risk",
        value: `${supplierConc.toFixed(0)}%`,
        benchmark: "30%",
        impact: supplierConc <= 40 ? "positive" : "negative",
        narrative: `Top 3 suppliers account for ${supplierConc.toFixed(0)}% of spend.`,
        confidence: "high",
        data_source: "ci.sustainow.in/transactions",
      }),
      insight({
        indicator: "Customer Concentration (Top 3)",
        category: "concentration_risk",
        value: `${customerConc.toFixed(0)}%`,
        benchmark: "30%",
        impact: customerConc <= 40 ? "positive" : "negative",
        narrative: `Top 3 customers contribute ${customerConc.toFixed(0)}% of revenue.`,
        confidence: "high",
        data_source: "ci.sustainow.in/transactions",
      }),
    );
    confidence = "high";
  }

  const bankSummary = rec(fd.bank_statement_summary);
  if (Object.keys(bankSummary).length) {
    const avgBalance = num(bankSummary.avg_monthly_balance_inr);
    const revenue = num(rec(fd.accounting).revenue_inr);
    if (revenue > 0) {
      const bufferMonths = (avgBalance * 12) / (revenue / 12);
      const bufferScore = clamp(bufferMonths * 25);
      scores.push(bufferScore);
      insights.push(
        insight({
          indicator: "Cash Buffer (Months)",
          category: "liquidity",
          value: Math.round(bufferMonths * 10) / 10,
          benchmark: 2,
          impact: bufferMonths >= 2 ? "positive" : "negative",
          narrative: `Bank balance covers ~${bufferMonths.toFixed(1)} months of revenue.`,
          confidence: "medium",
          data_source: "bank_statement_summary",
        }),
      );
    }
  }

  return dimScore("alternative_data_signals", avg(scores, 55), confidence, insights);
}

export function scoreFounderCapability(ctx: ScoringContext): DimensionScore {
  const founder = rec(ctx.financialData.founder);

  if (!Object.keys(founder).length) {
    return dimScore(
      "founder_capability",
      55,
      "low",
      [
        insight({
          indicator: "Founder Profile",
          category: "key_person_risk",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative:
            "Founder capability data not submitted; neutral score applied. Request founder profile for key-person risk assessment.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
      "moderate",
    );
  }

  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  if (founder.years_industry_experience != null) {
    const years = num(founder.years_industry_experience);
    const expScore = clamp(40 + years * 3);
    scores.push(expScore);
    insights.push(
      insight({
        indicator: "Industry Experience",
        category: "founder_capability",
        value: `${years.toFixed(0)} years`,
        benchmark: "10 years",
        impact: years >= 10 ? "positive" : "neutral",
        narrative: `Founder brings ${years.toFixed(0)} years of industry experience, ${
          years >= 10 ? "reducing" : "moderating"
        } execution risk.`,
        confidence: "high",
        data_source: "founder_profile",
      }),
    );
  }

  if (founder.years_entrepreneurship != null) {
    const years = num(founder.years_entrepreneurship);
    const entScore = clamp(35 + years * 4);
    scores.push(entScore);
    insights.push(
      insight({
        indicator: "Entrepreneurship Tenure",
        category: "founder_capability",
        value: `${years.toFixed(0)} years`,
        benchmark: "5 years",
        impact: years >= 5 ? "positive" : "neutral",
        narrative: `Founder has operated own business for ${years.toFixed(0)} years.`,
        confidence: "high",
        data_source: "founder_profile",
      }),
    );
  }

  const eduScores: Record<string, number> = {
    diploma: 55,
    graduate: 70,
    post_graduate: 80,
    professional: 85,
    doctorate: 90,
  };
  const educationLevel = str(founder.education_level);
  if (educationLevel) {
    const eduScore = eduScores[educationLevel.toLowerCase()] ?? 60;
    scores.push(eduScore);
    insights.push(
      insight({
        indicator: "Education Level",
        category: "founder_capability",
        value: educationLevel,
        benchmark: "graduate",
        impact: eduScore >= 70 ? "positive" : "neutral",
        narrative: `Educational background: ${educationLevel.replace("_", " ")}.`,
        confidence: "medium",
        data_source: "founder_profile",
      }),
    );
  }

  if (founder.cibil_score != null) {
    const cibil = num(founder.cibil_score);
    const cibilScore = clamp((cibil - 300) / 6);
    scores.push(cibilScore);
    insights.push(
      insight({
        indicator: "Founder CIBIL Score",
        category: "key_person_risk",
        value: cibil,
        benchmark: 750,
        impact: cibil >= 750 ? "positive" : cibil < 650 ? "negative" : "neutral",
        narrative: `Personal credit score of ${cibil} ${
          cibil >= 750 ? "supports" : cibil < 650 ? "raises concerns for" : "is acceptable for"
        } founder risk assessment.`,
        confidence: "high",
        data_source: "credit_bureau",
      }),
    );
  }

  const priorDefaults = num(founder.prior_defaults);
  if (priorDefaults > 0) {
    scores.push(clamp(40 - priorDefaults * 15));
    insights.push(
      insight({
        indicator: "Prior Loan Defaults",
        category: "key_person_risk",
        value: priorDefaults,
        benchmark: 0,
        impact: "negative",
        narrative: `${priorDefaults} prior loan default(s) on founder record — elevated key-person risk.`,
        confidence: "high",
        data_source: "credit_bureau",
      }),
    );
  }

  const priorExits = num(founder.prior_business_exits);
  if (priorExits > 0) {
    scores.push(clamp(60 + priorExits * 10));
    insights.push(
      insight({
        indicator: "Prior Successful Exits",
        category: "founder_capability",
        value: priorExits,
        benchmark: 0,
        impact: "positive",
        narrative: `${priorExits} prior successful business exit(s) demonstrate track record.`,
        confidence: "medium",
        data_source: "founder_profile",
      }),
    );
  }

  if (founder.management_team_size != null) {
    const teamSize = num(founder.management_team_size);
    const teamScore = clamp(40 + teamSize * 8);
    scores.push(teamScore);
    insights.push(
      insight({
        indicator: "Management Team Depth",
        category: "succession_risk",
        value: teamSize,
        benchmark: 3,
        impact: teamSize >= 3 ? "positive" : "negative",
        narrative: `Management team of ${teamSize} senior leaders ${
          teamSize >= 3 ? "reduces" : "increases"
        } key-person dependency.`,
        confidence: "medium",
        data_source: "founder_profile",
      }),
    );
  }

  if (bool(founder.succession_plan_documented)) {
    scores.push(85);
    insights.push(
      insight({
        indicator: "Succession Plan",
        category: "succession_risk",
        value: "documented",
        benchmark: "documented",
        impact: "positive",
        narrative: "Documented succession plan mitigates key-person risk.",
        confidence: "medium",
        data_source: "founder_profile",
      }),
    );
  } else {
    scores.push(45);
    insights.push(
      insight({
        indicator: "Succession Plan",
        category: "succession_risk",
        value: "not documented",
        benchmark: "documented",
        impact: "negative",
        narrative: "No documented succession plan — key-person risk if founder is unavailable.",
        confidence: "medium",
        data_source: "founder_profile",
      }),
    );
  }

  const certifications = strArr(founder.industry_certifications);
  if (certifications.length) {
    const certScore = clamp(55 + certifications.length * 10);
    scores.push(certScore);
    insights.push(
      insight({
        indicator: "Industry Certifications",
        category: "founder_capability",
        value: certifications.slice(0, 3).join(", "),
        benchmark: "1+",
        impact: "positive",
        narrative: `Founder holds ${certifications.length} industry certification(s).`,
        confidence: "medium",
        data_source: "founder_profile",
      }),
    );
  }

  if (founder.linkedin_presence_score != null) {
    const linkedinScore = num(founder.linkedin_presence_score);
    scores.push(linkedinScore);
    insights.push(
      insight({
        indicator: "Professional Network",
        category: "founder_capability",
        value: `${linkedinScore.toFixed(0)}/100`,
        benchmark: 60,
        impact: linkedinScore >= 60 ? "positive" : "neutral",
        narrative: "Professional network strength supports business development capability.",
        confidence: "low",
        data_source: "alternative_data",
      }),
    );
  }

  const confidence: ConfidenceLevel = founder.cibil_score != null ? "high" : "medium";
  return dimScore("founder_capability", avg(scores, 55), confidence, insights);
}

export function scoreMarketSentiment(ctx: ScoringContext): DimensionScore {
  const sentiment = rec(ctx.financialData.market_sentiment);

  if (!Object.keys(sentiment).length) {
    return dimScore(
      "market_sentiment",
      55,
      "low",
      [
        insight({
          indicator: "Market Sentiment",
          category: "reputation",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative:
            "Market sentiment data not available; recommend NPS, reviews, and media monitoring.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
      "moderate",
    );
  }

  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  if (sentiment.overall_sentiment_score != null) {
    const overall = num(sentiment.overall_sentiment_score);
    scores.push(overall);
    insights.push(
      insight({
        indicator: "Overall Market Sentiment",
        category: "reputation",
        value: `${overall.toFixed(0)}/100`,
        benchmark: 70,
        impact: overall >= 70 ? "positive" : "negative",
        narrative: `Composite market sentiment score: ${overall.toFixed(0)}/100.`,
        confidence: "medium",
        data_source: "sentiment_analysis",
      }),
    );
  }

  if (sentiment.customer_nps != null) {
    const nps = num(sentiment.customer_nps);
    const npsScore = clamp(50 + nps * 0.5);
    scores.push(npsScore);
    insights.push(
      insight({
        indicator: "Customer NPS",
        category: "customer_satisfaction",
        value: nps,
        benchmark: 50,
        impact: nps >= 50 ? "positive" : "negative",
        narrative: `Net Promoter Score of ${nps.toFixed(0)} reflects customer advocacy.`,
        confidence: "high",
        data_source: "customer_surveys",
      }),
    );
  }

  if (sentiment.google_rating != null) {
    const rating = num(sentiment.google_rating);
    const ratingScore = clamp(((rating - 1) / 4) * 100);
    scores.push(ratingScore);
    const reviewCount = num(sentiment.google_review_count);
    const reviewConfidence: ConfidenceLevel = reviewCount >= 20 ? "high" : "medium";
    insights.push(
      insight({
        indicator: "Google Rating",
        category: "public_reputation",
        value: `${rating.toFixed(1)}/5 (${reviewCount} reviews)`,
        benchmark: "4.0",
        impact: rating >= 4.0 ? "positive" : "negative",
        narrative: `Public Google rating of ${rating.toFixed(1)} from ${reviewCount} reviews.`,
        confidence: reviewConfidence,
        data_source: "public_reviews",
      }),
    );
  }

  if (sentiment.positive_media_pct != null && num(sentiment.media_mentions_12m)) {
    const mediaScore = num(sentiment.positive_media_pct);
    const mentions = num(sentiment.media_mentions_12m);
    scores.push(mediaScore);
    insights.push(
      insight({
        indicator: "Media Sentiment",
        category: "reputation",
        value: `${mediaScore.toFixed(0)}% positive (${mentions} mentions)`,
        benchmark: "70%",
        impact: mediaScore >= 70 ? "positive" : "negative",
        narrative: `${mediaScore.toFixed(0)}% of ${mentions} media mentions are positive.`,
        confidence: "medium",
        data_source: "media_monitoring",
      }),
    );
  }

  if (sentiment.customer_retention_rate_pct != null) {
    const retention = num(sentiment.customer_retention_rate_pct);
    const retScore = clamp(retention);
    scores.push(retScore);
    insights.push(
      insight({
        indicator: "Customer Retention",
        category: "market_stickiness",
        value: `${retention.toFixed(0)}%`,
        benchmark: "80%",
        impact: retention >= 80 ? "positive" : "negative",
        narrative: `Customer retention rate of ${retention.toFixed(0)}% indicates market stickiness.`,
        confidence: "high",
        data_source: "crm_data",
      }),
    );
  }

  if (sentiment.supplier_trust_score != null) {
    const trust = num(sentiment.supplier_trust_score);
    scores.push(trust);
    insights.push(
      insight({
        indicator: "Supplier Trust Score",
        category: "supply_chain_reputation",
        value: `${trust.toFixed(0)}/100`,
        benchmark: 70,
        impact: trust >= 70 ? "positive" : "negative",
        narrative: "Supplier trust score reflects payment reliability and trade relationships.",
        confidence: "medium",
        data_source: "trade_references",
      }),
    );
  }

  const litigationCount = num(sentiment.litigation_count_3y);
  if (litigationCount > 0) {
    const litScore = clamp(60 - litigationCount * 20);
    scores.push(litScore);
    insights.push(
      insight({
        indicator: "Litigation History",
        category: "legal_risk",
        value: litigationCount,
        benchmark: 0,
        impact: "negative",
        narrative: `${litigationCount} litigation case(s) in past 3 years — reputational and financial risk.`,
        confidence: "high",
        data_source: "legal_records",
      }),
    );
  }

  const gstScores: Record<string, number> = { excellent: 95, good: 80, average: 60, poor: 30 };
  const gstRating = str(sentiment.gst_compliance_rating);
  if (gstRating) {
    const gstScore = gstScores[gstRating.toLowerCase()] ?? 55;
    scores.push(gstScore);
    insights.push(
      insight({
        indicator: "GST Compliance Rating",
        category: "regulatory_compliance",
        value: gstRating,
        benchmark: "good",
        impact: gstScore >= 80 ? "positive" : "negative",
        narrative: `GST filing compliance rated as ${gstRating}.`,
        confidence: "high",
        data_source: "gst_portal",
      }),
    );
  }

  const confidence: ConfidenceLevel =
    scores.length >= 3 ? "high" : scores.length ? "medium" : "low";
  return dimScore("market_sentiment", avg(scores, 55), confidence, insights);
}

export function scoreProductDemandOutlook(ctx: ScoringContext): DimensionScore {
  const productMarket = rec(ctx.financialData.product_market);
  const products = arr(productMarket.products);

  if (!products.length) {
    return dimScore(
      "product_demand_outlook",
      55,
      "low",
      [
        insight({
          indicator: "Product Portfolio",
          category: "market_demand",
          value: "not provided",
          benchmark: null,
          impact: "neutral",
          narrative:
            "Product and market demand data not submitted. Provide product lines and demand outlook.",
          confidence: "low",
          data_source: "inferred",
        }),
      ],
      "moderate",
    );
  }

  const insights: EvidenceInsight[] = [];
  const scores: number[] = [];

  const demandScores: Record<string, number> = {
    strong_growth: 90,
    moderate_growth: 75,
    stable: 60,
    declining: 30,
  };
  const demandOutlook = str(productMarket.market_demand_outlook);
  if (demandOutlook) {
    const dScore = demandScores[demandOutlook.toLowerCase()] ?? 55;
    scores.push(dScore);
    insights.push(
      insight({
        indicator: "Market Demand Outlook",
        category: "market_demand",
        value: demandOutlook.replace("_", " "),
        benchmark: "moderate_growth",
        impact: dScore >= 75 ? "positive" : dScore < 50 ? "negative" : "neutral",
        narrative: `Market demand outlook assessed as ${demandOutlook.replace("_", " ")}.`,
        confidence: "medium",
        data_source: "market_research",
      }),
    );
  }

  if (productMarket.sector_growth_rate_pct != null) {
    const growth = num(productMarket.sector_growth_rate_pct);
    const growthScore = clamp(50 + growth * 5);
    scores.push(growthScore);
    insights.push(
      insight({
        indicator: "Sector Growth Rate",
        category: "industry_tailwind",
        value: `${growth.toFixed(1)}%`,
        benchmark: "8%",
        impact: growth >= 8 ? "positive" : "neutral",
        narrative: `Industry sector growing at ${growth.toFixed(1)}% CAGR.`,
        confidence: "medium",
        data_source: "industry_reports",
      }),
    );
  }

  if (productMarket.capacity_utilisation_pct != null) {
    const util = num(productMarket.capacity_utilisation_pct);
    const utilScore =
      util <= 90 ? clamp(50 + (util - 50) * 0.8) : clamp(100 - (util - 90) * 2);
    scores.push(utilScore);
    insights.push(
      insight({
        indicator: "Capacity Utilisation",
        category: "operational_demand",
        value: `${util.toFixed(0)}%`,
        benchmark: "75%",
        impact: util >= 70 && util <= 90 ? "positive" : "negative",
        narrative: `Capacity utilisation at ${util.toFixed(0)}% ${
          util >= 70 && util <= 90
            ? "indicates healthy demand"
            : "suggests under/over-utilisation risk"
        }.`,
        confidence: "high",
        data_source: "production_records",
      }),
    );
  }

  if (productMarket.order_book_months != null) {
    const orderBook = num(productMarket.order_book_months);
    const obScore = clamp(40 + orderBook * 15);
    scores.push(obScore);
    insights.push(
      insight({
        indicator: "Order Book Depth",
        category: "demand_visibility",
        value: `${orderBook.toFixed(1)} months`,
        benchmark: "3 months",
        impact: orderBook >= 3 ? "positive" : "negative",
        narrative: `Confirmed order book covers ${orderBook.toFixed(1)} months of production.`,
        confidence: "high",
        data_source: "order_management",
      }),
    );
  }

  const productNames = products.slice(0, 4).map((p) => str(p.name));
  const categories = [...new Set(products.map((p) => str(p.category)).filter(Boolean))];
  const maxShare = Math.max(...products.map((p) => num(p.revenue_share_pct)));
  const diversificationScore = clamp(100 - Math.max(0, maxShare - 40) * 1.5);
  scores.push(diversificationScore);
  insights.push(
    insight({
      indicator: "Product Portfolio",
      category: "product_mix",
      value: productNames.join(", "),
      benchmark: "diversified",
      impact: maxShare <= 50 ? "positive" : "negative",
      narrative: `${products.length} product line(s) across ${categories.join(", ")}. Largest product contributes ${maxShare.toFixed(0)}% of revenue.`,
      confidence: "high",
      data_source: "product_catalog",
    }),
  );

  const exportPct = num(productMarket.export_revenue_pct);
  if (productMarket.export_revenue_pct != null && exportPct > 0) {
    const exportScore = clamp(55 + exportPct * 0.5);
    scores.push(exportScore);
    insights.push(
      insight({
        indicator: "Export Revenue Share",
        category: "market_reach",
        value: `${exportPct.toFixed(0)}%`,
        benchmark: "15%",
        impact: "positive",
        narrative: `Export revenue at ${exportPct.toFixed(0)}% diversifies market exposure.`,
        confidence: "medium",
        data_source: "export_records",
      }),
    );
  }

  if (bool(productMarket.import_substitution_potential)) {
    scores.push(80);
    insights.push(
      insight({
        indicator: "Import Substitution",
        category: "policy_tailwind",
        value: "high potential",
        benchmark: null,
        impact: "positive",
        narrative: "Products align with Make in India import substitution priorities.",
        confidence: "medium",
        data_source: "policy_alignment",
      }),
    );
  }

  if (bool(productMarket.ev_supply_chain_exposure)) {
    scores.push(78);
    insights.push(
      insight({
        indicator: "EV Supply Chain",
        category: "growth_segment",
        value: "exposed",
        benchmark: null,
        impact: "positive",
        narrative: "Exposure to EV/auto supply chain benefits from PLI and electrification tailwinds.",
        confidence: "medium",
        data_source: "sector_analysis",
      }),
    );
  }

  const confidence: ConfidenceLevel = productMarket.order_book_months != null ? "high" : "medium";
  return dimScore("product_demand_outlook", avg(scores, 55), confidence, insights);
}
