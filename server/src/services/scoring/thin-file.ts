/**
 * Thin-file / NTC / NTB borrower segmentation and weight adjustment.
 * When traditional bureau history is absent, up-weight alternate-data dimensions.
 */

import type { DimensionScore, FinancialDataInput } from "./types.js";

export type BorrowerSegment = "standard" | "NTC" | "NTB" | "NTC_NTB";

export interface ThinFileProfile {
  segment: BorrowerSegment;
  is_thin_file: boolean;
  bureau_history_available: boolean;
  bank_relationship_established: boolean;
  alternate_data_coverage: string[];
  weight_adjustments_applied: boolean;
  scoring_mode: "standard" | "thin_file";
}

/** Dimensions boosted in thin-file mode (absolute weight deltas, renormalized after). */
const THIN_FILE_BOOST: Record<string, number> = {
  alternative_data_signals: 0.03,
  tax_compliance: 0.02,
  cash_flow_health: 0.02,
  payment_behaviour: 0.015,
  operational_stability: 0.01,
};

const THIN_FILE_REDUCE: Record<string, number> = {
  credit_history_debt_servicing: 0.05,
  peer_benchmark: 0.015,
};

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function hasBureauHistory(fd: FinancialDataInput): boolean {
  const credit = rec(fd.credit_bureau);
  const pastDebts = credit.past_debts;
  return !!(credit.crisil_rating || credit.commercial_credit_score || (Array.isArray(pastDebts) && pastDebts.length > 0));
}

function hasBankRelationship(fd: FinancialDataInput): boolean {
  const profile = rec(fd.profile);
  if (profile.bank_relationship_established === true) return true;
  if (profile.bank_relationship_established === false) return false;
  const aa = rec(fd.account_aggregator);
  const bank = rec(fd.bank_statement_summary);
  return !!(aa.session_id || bank.avg_monthly_balance_inr);
}

function alternateDataCoverage(fd: FinancialDataInput): string[] {
  const sources: string[] = [];
  if (rec(fd.account_aggregator).session_id || rec(fd.account_aggregator).avg_monthly_balance_inr) {
    sources.push("account_aggregator");
  }
  if (rec(fd.upi_analytics).monthly_transaction_volume_inr) sources.push("upi");
  if (rec(fd.epfo_compliance).registered) sources.push("epfo");
  if (rec(fd.tax_compliance).gst_filing_compliance_pct || rec(fd.government_policy).gst_filing_compliance_pct) {
    sources.push("gst");
  }
  if (fd.cash_flows?.length) sources.push("cash_flows");
  if (rec(fd.bank_statement_summary).avg_monthly_balance_inr) sources.push("bank_statements");
  return sources;
}

export function detectBorrowerSegment(fd: FinancialDataInput): ThinFileProfile {
  const profile = rec(fd.profile);
  const bureauAvailable = hasBureauHistory(fd);
  const bankEstablished = hasBankRelationship(fd);
  const altCoverage = alternateDataCoverage(fd);

  const forceSegment = profile.borrower_segment as BorrowerSegment | undefined;
  if (forceSegment && ["NTC", "NTB", "NTC_NTB", "standard"].includes(forceSegment)) {
    return {
      segment: forceSegment,
      is_thin_file: forceSegment !== "standard",
      bureau_history_available: bureauAvailable,
      bank_relationship_established: bankEstablished,
      alternate_data_coverage: altCoverage,
      weight_adjustments_applied: forceSegment !== "standard",
      scoring_mode: forceSegment !== "standard" ? "thin_file" : "standard",
    };
  }

  const isNtc = !bureauAvailable;
  const isNtb = !bankEstablished;

  let segment: BorrowerSegment = "standard";
  if (isNtc && isNtb) segment = "NTC_NTB";
  else if (isNtc) segment = "NTC";
  else if (isNtb) segment = "NTB";

  const isThinFile = segment !== "standard";

  return {
    segment,
    is_thin_file: isThinFile,
    bureau_history_available: bureauAvailable,
    bank_relationship_established: bankEstablished,
    alternate_data_coverage: altCoverage,
    weight_adjustments_applied: isThinFile,
    scoring_mode: isThinFile ? "thin_file" : "standard",
  };
}

export function applyThinFileWeights(
  dimensions: DimensionScore[],
  profile: ThinFileProfile,
): { dimensions: DimensionScore[]; adjustments: Record<string, { from: number; to: number }> } {
  if (!profile.is_thin_file) {
    return { dimensions, adjustments: {} };
  }

  const adjustments: Record<string, { from: number; to: number }> = {};
  const adjusted = dimensions.map((d) => {
    let delta = 0;
    if (THIN_FILE_BOOST[d.dimension]) delta += THIN_FILE_BOOST[d.dimension];
    if (THIN_FILE_REDUCE[d.dimension]) delta -= THIN_FILE_REDUCE[d.dimension];
    if (delta === 0) return d;
    const newWeight = Math.max(0.01, d.weight + delta);
    adjustments[d.dimension] = { from: d.weight, to: newWeight };
    return { ...d, weight: newWeight };
  });

  const total = adjusted.reduce((s, d) => s + d.weight, 0);
  const normalized = adjusted.map((d) => ({
    ...d,
    weight: Math.round((d.weight / total) * 10000) / 10000,
  }));

  return { dimensions: normalized, adjustments };
}
