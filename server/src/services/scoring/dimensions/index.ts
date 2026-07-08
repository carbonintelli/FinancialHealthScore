import { DIMENSION_CATALOG } from "../../agents/catalog.js";
import type { DimensionScorer, ScoringContext } from "../types.js";
import {
  scoreAlternativeDataSignals,
  scoreCarbonTransitionRisk,
  scoreCashFlowHealth,
  scoreFinancialResilience,
  scoreFounderCapability,
  scoreMarketSentiment,
  scoreOperationalStability,
  scorePaymentBehaviour,
  scoreProductDemandOutlook,
} from "./core-scorers.js";
import {
  DIMENSION_WEIGHTS,
  scoreCreditHistoryDebtServicing,
  scoreEsgDisclosure,
  scoreGeographicRisk,
  scoreGovernanceDiversity,
  scoreGovernmentPolicyAlignment,
  scoreInsurance,
  scoreLegalCompliance,
  scoreOperationalCertifications,
  scorePeerBenchmark,
  scoreSupplyChainResilience,
  scoreTaxCompliance,
} from "./advanced-scorers.js";

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

/** Registry of 20 dimension scorers — order matches DIMENSION_CATALOG */
export const DIMENSION_SCORERS: { id: string; label: string; score: DimensionScorer }[] = [
  { id: "financial_resilience", label: "Financial Resilience", score: scoreFinancialResilience },
  { id: "founder_capability", label: "Founder Capability", score: scoreFounderCapability },
  { id: "cash_flow_health", label: "Cash Flow Health", score: scoreCashFlowHealth },
  { id: "payment_behaviour", label: "Payment Behaviour", score: scorePaymentBehaviour },
  { id: "credit_history_debt_servicing", label: "Credit History & Debt Servicing", score: (ctx) =>
    scoreCreditHistoryDebtServicing(rec(ctx.financialData.credit_bureau), rec(ctx.financialData.accounting)) },
  { id: "operational_stability", label: "Operational Stability", score: scoreOperationalStability },
  { id: "legal_compliance", label: "Legal Compliance", score: (ctx) =>
    scoreLegalCompliance(rec(ctx.financialData.legal_compliance), rec(ctx.financialData.market_sentiment)) },
  { id: "carbon_transition_risk", label: "Carbon Transition Risk", score: scoreCarbonTransitionRisk },
  { id: "alternative_data_signals", label: "Alternative Data Signals", score: scoreAlternativeDataSignals },
  { id: "market_sentiment", label: "Market Sentiment", score: scoreMarketSentiment },
  { id: "tax_compliance", label: "Tax Compliance", score: (ctx) =>
    scoreTaxCompliance(rec(ctx.financialData.tax_compliance), rec(ctx.financialData.government_policy)) },
  { id: "operational_certifications", label: "Operational Certifications", score: (ctx) =>
    scoreOperationalCertifications(rec(ctx.financialData.operational_certifications), rec(ctx.financialData.government_policy)) },
  { id: "government_policy_alignment", label: "Government Policy Alignment", score: (ctx) =>
    scoreGovernmentPolicyAlignment(ctx.financialData, rec(ctx.financialData.profile)) },
  { id: "product_demand_outlook", label: "Product Demand Outlook", score: scoreProductDemandOutlook },
  { id: "esg_disclosure", label: "ESG Disclosure", score: (ctx) =>
    scoreEsgDisclosure(rec(ctx.financialData.esg_disclosure), ctx.carbonData ?? undefined, DIMENSION_WEIGHTS.esg_disclosure) },
  { id: "supply_chain_resilience", label: "Supply Chain Resilience", score: (ctx) =>
    scoreSupplyChainResilience(rec(ctx.financialData.supply_chain), rec(ctx.financialData.product_market), ctx.carbonData ?? undefined, DIMENSION_WEIGHTS.supply_chain_resilience) },
  { id: "governance_diversity", label: "Governance Diversity", score: (ctx) =>
    scoreGovernanceDiversity(rec(ctx.financialData.governance_diversity), rec(ctx.financialData.founder)) },
  { id: "insurance_business_continuity", label: "Insurance & Business Continuity", score: (ctx) =>
    scoreInsurance(rec(ctx.financialData.insurance), DIMENSION_WEIGHTS.insurance_business_continuity) },
  { id: "geographic_risk", label: "Geographic Risk", score: (ctx) =>
    scoreGeographicRisk(rec(ctx.financialData.geographic), rec(ctx.financialData.profile), DIMENSION_WEIGHTS.geographic_risk) },
  { id: "peer_benchmark", label: "Peer Benchmark", score: (ctx) =>
    scorePeerBenchmark(rec(ctx.financialData.profile), rec(ctx.financialData.accounting), rec(ctx.financialData.credit_bureau), ctx.carbonData ?? undefined, DIMENSION_WEIGHTS.peer_benchmark) },
];

export function validateScorerCatalog(): boolean {
  return DIMENSION_SCORERS.length === DIMENSION_CATALOG.length &&
    DIMENSION_SCORERS.every((s, i) => s.id === DIMENSION_CATALOG[i].id);
}
