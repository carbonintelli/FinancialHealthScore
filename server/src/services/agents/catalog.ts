/** 20-dimension catalog with agent metadata */

export interface DimensionCatalogEntry {
  id: string;
  label: string;
  weight: number;
  category: DimensionCategory;
  agent_role: string;
  data_sources: string[];
  risk_triggers: { threshold: number; severity: string; message: string }[];
}

export type DimensionCategory =
  | "financial"
  | "operational"
  | "compliance"
  | "market"
  | "sustainability"
  | "alternative";

export const DIMENSION_CATALOG: DimensionCatalogEntry[] = [
  { id: "financial_resilience", label: "Financial Resilience", weight: 0.09, category: "financial", agent_role: "Liquidity & leverage analyst", data_sources: ["accounting_records"], risk_triggers: [{ threshold: 60, severity: "elevated", message: "Liquidity or leverage stress detected" }] },
  { id: "founder_capability", label: "Founder Capability", weight: 0.08, category: "market", agent_role: "Key-person risk analyst", data_sources: ["founder_profile", "credit_bureau"], risk_triggers: [{ threshold: 55, severity: "elevated", message: "Founder/key-person risk elevated" }] },
  { id: "cash_flow_health", label: "Cash Flow Health", weight: 0.07, category: "financial", agent_role: "Cash flow analyst", data_sources: ["ci.sustainow.in/transactions", "cash_flows"], risk_triggers: [{ threshold: 60, severity: "elevated", message: "Cash flow volatility or margin pressure" }] },
  { id: "payment_behaviour", label: "Payment Behaviour", weight: 0.07, category: "financial", agent_role: "Payment behaviour analyst", data_sources: ["payment_records", "ci.sustainow.in/transactions"], risk_triggers: [{ threshold: 65, severity: "moderate", message: "Late payments or defaults detected" }] },
  { id: "credit_history_debt_servicing", label: "Credit History & Debt Servicing", weight: 0.06, category: "financial", agent_role: "Credit bureau analyst", data_sources: ["CIBIL/CRISIL", "repayment_history"], risk_triggers: [{ threshold: 60, severity: "high", message: "Debt servicing or bureau concerns" }] },
  { id: "operational_stability", label: "Operational Stability", weight: 0.06, category: "operational", agent_role: "Operations analyst", data_sources: ["accounting_records", "utility_bills"], risk_triggers: [{ threshold: 60, severity: "moderate", message: "Operational efficiency or tenure risk" }] },
  { id: "legal_compliance", label: "Legal Compliance", weight: 0.06, category: "compliance", agent_role: "Legal compliance analyst", data_sources: ["e-Courts/MCA", "legal_compliance"], risk_triggers: [{ threshold: 70, severity: "high", message: "Pending litigation or regulatory penalties" }] },
  { id: "carbon_transition_risk", label: "Carbon Transition Risk", weight: 0.05, category: "sustainability", agent_role: "Carbon transition analyst", data_sources: ["ci.sustainow.in"], risk_triggers: [{ threshold: 60, severity: "elevated", message: "Carbon intensity or transition plan gap" }] },
  { id: "alternative_data_signals", label: "Alternative Data Signals", weight: 0.05, category: "alternative", agent_role: "Alternative data analyst", data_sources: ["transactions", "bank_statements"], risk_triggers: [{ threshold: 55, severity: "moderate", message: "Concentration or balance stress" }] },
  { id: "market_sentiment", label: "Market Sentiment", weight: 0.05, category: "market", agent_role: "Market sentiment analyst", data_sources: ["reviews", "NPS", "media"], risk_triggers: [{ threshold: 55, severity: "moderate", message: "Negative market perception signals" }] },
  { id: "tax_compliance", label: "Tax Compliance", weight: 0.04, category: "compliance", agent_role: "Tax compliance analyst", data_sources: ["GSTN/ITR"], risk_triggers: [{ threshold: 70, severity: "high", message: "Tax filing or demand outstanding" }] },
  { id: "operational_certifications", label: "Operational Certifications", weight: 0.04, category: "operational", agent_role: "Certification analyst", data_sources: ["ISO/IATF audits"], risk_triggers: [{ threshold: 65, severity: "moderate", message: "Certification gaps or audit failures" }] },
  { id: "government_policy_alignment", label: "Government Policy Alignment", weight: 0.04, category: "compliance", agent_role: "Policy alignment analyst", data_sources: ["UDYAM", "scheme enrollment"], risk_triggers: [{ threshold: 55, severity: "low", message: "Unenrolled eligible schemes" }] },
  { id: "product_demand_outlook", label: "Product Demand Outlook", weight: 0.04, category: "market", agent_role: "Demand forecast analyst", data_sources: ["order_book", "sector_data"], risk_triggers: [{ threshold: 55, severity: "moderate", message: "Demand outlook or capacity concerns" }] },
  { id: "esg_disclosure", label: "ESG Disclosure", weight: 0.04, category: "sustainability", agent_role: "ESG disclosure analyst", data_sources: ["BRSR", "GHG inventory"], risk_triggers: [{ threshold: 60, severity: "moderate", message: "ESG disclosure gaps" }] },
  { id: "supply_chain_resilience", label: "Supply Chain Resilience", weight: 0.04, category: "operational", agent_role: "Supply chain stress analyst", data_sources: ["supplier_data", "inventory"], risk_triggers: [{ threshold: 60, severity: "elevated", message: "Supply chain stress or single-source risk" }] },
  { id: "governance_diversity", label: "Governance Diversity", weight: 0.03, category: "compliance", agent_role: "Governance analyst", data_sources: ["board_composition"], risk_triggers: [{ threshold: 50, severity: "low", message: "Governance diversity opportunity" }] },
  { id: "insurance_business_continuity", label: "Insurance & Business Continuity", weight: 0.03, category: "operational", agent_role: "Insurance adequacy analyst", data_sources: ["insurance_policies"], risk_triggers: [{ threshold: 65, severity: "moderate", message: "Insurance coverage gaps" }] },
  { id: "geographic_risk", label: "Geographic Risk", weight: 0.03, category: "alternative", agent_role: "Geographic risk analyst", data_sources: ["state_index", "flood_zone"], risk_triggers: [{ threshold: 60, severity: "moderate", message: "Geographic or climate exposure" }] },
  { id: "peer_benchmark", label: "Peer Benchmark", weight: 0.03, category: "alternative", agent_role: "Peer benchmarking analyst", data_sources: ["sector_benchmarks"], risk_triggers: [{ threshold: 55, severity: "moderate", message: "Below sector peer median" }] },
];

export const DIMENSION_MAP = Object.fromEntries(DIMENSION_CATALOG.map((d) => [d.id, d]));

export function validateWeights(): boolean {
  const sum = DIMENSION_CATALOG.reduce((a, d) => a + d.weight, 0);
  return Math.abs(sum - 1.0) < 0.001;
}
