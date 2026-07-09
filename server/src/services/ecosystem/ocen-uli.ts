/**
 * OCEN (Open Credit Enablement Network) and ULI (Unified Lending Interface) adapters.
 * Exposes Financial Health Score as an interoperable credit assessment product.
 */

import type { AssessmentResult } from "../scoring/types.js";
import type { ThinFileProfile } from "../scoring/thin-file.js";

export interface OcenCreditAssessmentRequest {
  product_id?: string;
  borrower: {
    msme_id: string;
    business_name: string;
    gstin?: string;
    pan?: string;
    udyam_number?: string;
  };
  consent_refs?: {
    aa_session_id?: string;
    aa_consent_handle?: string;
  };
  assessment_options?: {
    thin_file_mode?: boolean;
    include_alternate_data?: boolean;
    audience?: string;
  };
}

export interface OcenCreditAssessmentResponse {
  protocol: "OCEN";
  version: "1.0";
  product_id: string;
  assessment_id: string;
  msme_id: string;
  business_name: string;
  generated_at: string;
  credit_decision: {
    financial_health_score: number;
    grade: string;
    risk_level: string;
    confidence: string;
    recommended_action: string;
  };
  borrower_segment: ThinFileProfile;
  dimension_summary: { dimension: string; score: number; weight: number; risk_level: string }[];
  alternate_data_sources: string[];
  data_gaps_count: number;
  ocen_metadata: {
    lender_id: string;
    assessment_type: "MSME_FINANCIAL_HEALTH_CARD";
    real_time_capable: boolean;
  };
}

export interface UliLoanEligibilityRequest {
  msme_id: string;
  loan_amount_inr: number;
  tenure_months?: number;
  loan_type?: string;
  assessment_id?: string;
}

export interface UliLoanEligibilityResponse {
  protocol: "ULI";
  version: "1.0";
  msme_id: string;
  assessment_id: string;
  eligible: boolean;
  max_eligible_amount_inr: number;
  recommended_rate_band: string;
  conditions: string[];
  financial_health_score: number;
  grade: string;
  borrower_segment: string;
  alternate_data_verified: boolean;
}

const OCEN_PRODUCT_ID = "FHS-MSME-HEALTH-CARD-v1";
const LENDER_ID = "IDBI-INNOVATE-2026";

export function buildOcenCreditAssessmentResponse(
  result: AssessmentResult,
  thinFile: ThinFileProfile,
  request?: OcenCreditAssessmentRequest,
): OcenCreditAssessmentResponse {
  const score = result.overall_score;
  const recommendedAction =
    score >= 70
      ? "APPROVE_STANDARD_TERMS"
      : score >= 55
        ? "ENHANCED_DUE_DILIGENCE"
        : score >= 40
          ? "CONDITIONAL_APPROVAL"
          : "DECLINE_OR_ALTERNATE_PRODUCT";

  const altSources = (result.metadata?.alternate_data_sources as string[]) ??
    thinFile.alternate_data_coverage;

  return {
    protocol: "OCEN",
    version: "1.0",
    product_id: request?.product_id ?? OCEN_PRODUCT_ID,
    assessment_id: result.assessment_id,
    msme_id: result.msme_id ?? request?.borrower.msme_id ?? "unknown",
    business_name: result.business_name,
    generated_at: result.generated_at,
    credit_decision: {
      financial_health_score: score,
      grade: result.grade,
      risk_level: result.overall_risk_level,
      confidence: result.overall_confidence,
      recommended_action: recommendedAction,
    },
    borrower_segment: thinFile,
    dimension_summary: result.dimension_scores.map((d) => ({
      dimension: d.dimension,
      score: d.score,
      weight: d.weight,
      risk_level: d.risk_level,
    })),
    alternate_data_sources: altSources,
    data_gaps_count: result.data_gaps.length,
    ocen_metadata: {
      lender_id: LENDER_ID,
      assessment_type: "MSME_FINANCIAL_HEALTH_CARD",
      real_time_capable: true,
    },
  };
}

export function buildUliLoanEligibilityResponse(
  result: AssessmentResult,
  thinFile: ThinFileProfile,
  req: UliLoanEligibilityRequest,
): UliLoanEligibilityResponse {
  const score = result.overall_score;
  const tenure = req.tenure_months ?? 36;
  const requested = req.loan_amount_inr;

  const multiplier =
    score >= 80 ? 0.35 : score >= 70 ? 0.28 : score >= 60 ? 0.22 : score >= 50 ? 0.15 : 0.08;
  const revenueProxy = score * 100_000;
  const maxEligible = Math.round(revenueProxy * multiplier);
  const eligible = score >= 50 && requested <= maxEligible * 1.1;

  const rateBand =
    score >= 80 ? "MCLR + 1.0%" : score >= 70 ? "MCLR + 1.75%" : score >= 60 ? "MCLR + 2.5%" : "MCLR + 3.5%";

  const conditions: string[] = [];
  if (thinFile.is_thin_file) {
    conditions.push("Alternate-data verification required — AA/UPI/EPFO consent mandatory");
  }
  if (result.data_gaps.filter((g) => g.severity === "high").length > 0) {
    conditions.push("Resolve high-priority data gaps before disbursement");
  }
  if (tenure > 60) conditions.push("Tenure capped at 60 months for thin-file borrowers");

  return {
    protocol: "ULI",
    version: "1.0",
    msme_id: req.msme_id,
    assessment_id: result.assessment_id,
    eligible,
    max_eligible_amount_inr: maxEligible,
    recommended_rate_band: rateBand,
    conditions,
    financial_health_score: score,
    grade: result.grade,
    borrower_segment: thinFile.segment,
    alternate_data_verified: thinFile.alternate_data_coverage.length >= 2,
  };
}

export function getEcosystemCatalog() {
  return {
    protocols: ["OCEN", "ULI", "AA"],
    products: [
      {
        id: OCEN_PRODUCT_ID,
        name: "MSME Financial Health Card",
        description: "AI/ML-driven multidimensional credit assessment with alternate data aggregation",
        endpoints: {
          credit_assessment: "POST /api/v1/ecosystem/ocen/credit-assessment",
          loan_eligibility: "POST /api/v1/ecosystem/uli/loan-eligibility",
        },
      },
    ],
    alternate_data_rails: ["GST", "UPI", "Account Aggregator", "EPFO"],
    real_time: {
      webhooks: "POST /api/v1/webhooks/alternate-data",
      supported_events: ["gst.filing.updated", "aa.statement.received", "upi.analytics.refresh", "epfo.contribution.posted"],
    },
  };
}
