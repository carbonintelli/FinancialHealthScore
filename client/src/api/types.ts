export interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization_id: number;
  organization_name: string;
  organization_type: "bank" | "msme" | "government" | "regulatory";
  msme_id?: string | null;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  weight?: number;
  risk_level?: string;
}

export interface AssessmentSummary {
  assessment_id: string;
  overall_score: number;
  grade: string;
  overall_risk_level?: string;
  created_at: string;
  business_name?: string;
}

export interface LoanApplication {
  id: number;
  application_ref: string;
  loan_type: string;
  amount_inr: number;
  tenure_months?: number;
  status: string;
  created_at: string;
  business_name?: string;
  reviewer_notes?: string | null;
}
