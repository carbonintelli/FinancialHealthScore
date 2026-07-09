/** Financial Health Score types — mirrors Python app/models/schemas.py output shapes */

export type RiskLevel = "low" | "moderate" | "elevated" | "high" | "critical";
export type ConfidenceLevel = "high" | "medium" | "low";
export type AudienceRole = "credit_team" | "risk_team" | "relationship_manager" | "portfolio_analyst";

export interface EvidenceInsight {
  indicator: string;
  category: string;
  value?: string | number | null;
  benchmark?: string | number | null;
  impact: "positive" | "neutral" | "negative";
  narrative: string;
  confidence: ConfidenceLevel;
  data_source: string;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  weight: number;
  risk_level: RiskLevel;
  confidence: ConfidenceLevel;
  insights: EvidenceInsight[];
}

export interface RiskIndicator {
  code: string;
  label: string;
  severity: RiskLevel;
  description: string;
  evidence: string[];
  recommended_action: string;
}

export interface DataGap {
  field: string;
  category: string;
  severity: string;
  message: string;
  recommendation: string;
  impacts_dimensions: string[];
}

export interface PolicyAlignmentInsight {
  code: string;
  name: string;
  status: string;
  alignment_score: number;
  benefit_summary: string;
  action_recommendation?: string | null;
}

export interface GovernmentPolicyAssessment {
  overall_alignment_score: number;
  enrolled_count: number;
  eligible_unenrolled_count: number;
  policy_insights: PolicyAlignmentInsight[];
  sector_tailwinds: string[];
  financing_opportunities: string[];
}

export interface CarbonIntelligenceSummary {
  source: string;
  msme_id?: string | null;
  total_emissions_tco2e?: number | null;
  scope1_tco2e?: number | null;
  scope2_tco2e?: number | null;
  scope3_tco2e?: number | null;
  carbon_intensity?: number | null;
  transition_risk_score?: number | null;
  energy_cost_exposure_pct?: number | null;
  reporting_readiness?: string | null;
  data_freshness?: string | null;
  mock_data?: boolean;
}

export interface AdvancedIntelligenceSummary {
  enrichment_applied: string[];
  integration_status: { source: string; status: string; mock: boolean; message: string }[];
  document_validation?: unknown;
  peer_percentile_overall?: number | null;
  stress_test_passed?: boolean | null;
}

export interface AssessmentResult {
  assessment_id: string;
  business_name: string;
  msme_id?: string;
  generated_at: string;
  overall_score: number;
  overall_risk_level: string;
  overall_confidence: string;
  grade: string;
  dimension_scores: DimensionScore[];
  risk_indicators: RiskIndicator[];
  key_insights: string[];
  green_finance_opportunities: string[];
  carbon_intelligence?: CarbonIntelligenceSummary | null;
  government_policy_assessment?: GovernmentPolicyAssessment | null;
  data_gaps: DataGap[];
  recommended_improvements: string[];
  advanced_intelligence?: AdvancedIntelligenceSummary;
  audience_summary: string;
  metadata: Record<string, unknown>;
}

export interface AssessmentRequest {
  financial_data: FinancialDataInput;
  include_carbon_intelligence?: boolean;
  audience?: AudienceRole;
  auto_enrich?: boolean;
  thin_file_mode?: boolean;
  alternate_data?: {
    include_aa?: boolean;
    include_upi?: boolean;
    include_epfo?: boolean;
    aa_session_id?: string;
    upi_vpa?: string;
    epfo_establishment_id?: string;
  };
}

export interface FinancialDataInput {
  profile: Record<string, unknown>;
  accounting: Record<string, unknown>;
  cash_flows?: Record<string, unknown>[];
  utility_bills?: Record<string, unknown>[];
  payment_records?: Record<string, unknown>[];
  bank_statement_summary?: Record<string, unknown>;
  account_aggregator?: Record<string, unknown>;
  upi_analytics?: Record<string, unknown>;
  epfo_compliance?: Record<string, unknown>;
  founder?: Record<string, unknown>;
  market_sentiment?: Record<string, unknown>;
  product_market?: Record<string, unknown>;
  government_policy?: Record<string, unknown>;
  credit_bureau?: Record<string, unknown>;
  legal_compliance?: Record<string, unknown>;
  tax_compliance?: Record<string, unknown>;
  operational_certifications?: Record<string, unknown>;
  government_compliance?: Record<string, unknown>;
  governance_diversity?: Record<string, unknown>;
  esg_disclosure?: Record<string, unknown>;
  supply_chain?: Record<string, unknown>;
  insurance?: Record<string, unknown>;
  geographic?: Record<string, unknown>;
  documents?: Record<string, unknown>[];
}

export interface ScoringContext {
  financialData: FinancialDataInput;
  carbonData?: Record<string, unknown> | null;
  enrichmentLog?: Record<string, unknown> | null;
  audience?: AudienceRole;
  thinFileProfile?: import("./thin-file.js").ThinFileProfile | null;
}

export type DimensionScorer = (ctx: ScoringContext) => DimensionScore;
