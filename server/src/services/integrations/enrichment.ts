/**
 * Unified alternate-data enrichment — GST, AA, UPI, EPFO, bureau, tax, legal.
 */

import type { FinancialDataInput } from "../scoring/types.js";
import { pullBureauReport, verifyTax } from "./mock-clients.js";
import {
  fetchAaFinancialData,
  fetchEpfoCompliance,
  fetchUpiAnalytics,
  type AaFinancialData,
  type EpfoCompliance,
  type UpiAnalytics,
} from "./alternate-data.js";

export interface EnrichmentOptions {
  msme_id?: string;
  aa_session_id?: string;
  upi_vpa?: string;
  epfo_establishment_id?: string;
  include_aa?: boolean;
  include_upi?: boolean;
  include_epfo?: boolean;
  include_bureau?: boolean;
  include_tax?: boolean;
}

export interface EnrichmentResult {
  financial_data: FinancialDataInput;
  enrichment_log: Record<string, unknown>;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function mergeAaIntoFinancialData(fd: FinancialDataInput, aa: AaFinancialData): FinancialDataInput {
  const d = aa.data;
  return {
    ...fd,
    account_aggregator: {
      source: aa.source,
      session_id: aa.session_id,
      fetched_at: aa.fetched_at,
      mock: aa.mock,
      ...d,
    },
    bank_statement_summary: fd.bank_statement_summary ?? {
      avg_monthly_balance_inr: d.avg_monthly_balance_inr,
      min_monthly_balance_inr: d.min_monthly_balance_inr,
      cheque_bounce_count_12m: d.cheque_bounce_count_12m,
    },
  };
}

function mergeUpiIntoFinancialData(fd: FinancialDataInput, upi: UpiAnalytics): FinancialDataInput {
  return {
    ...fd,
    upi_analytics: {
      source: upi.source,
      vpa: upi.vpa,
      fetched_at: upi.fetched_at,
      mock: upi.mock,
      ...upi.data,
    },
  };
}

function mergeEpfoIntoFinancialData(fd: FinancialDataInput, epfo: EpfoCompliance): FinancialDataInput {
  return {
    ...fd,
    epfo_compliance: {
      source: epfo.source,
      establishment_id: epfo.establishment_id,
      fetched_at: epfo.fetched_at,
      mock: epfo.mock,
      ...epfo.data,
    },
  };
}

export async function enrichFinancialData(
  input: FinancialDataInput,
  options: EnrichmentOptions = {},
): Promise<EnrichmentResult> {
  let fd = { ...input };
  const profile = rec(fd.profile);
  const gstin = profile.gstin as string | undefined;
  const pan = profile.pan as string | undefined;
  const businessName = String(profile.business_name ?? "MSME");
  const msmeId = options.msme_id ?? (profile.msme_id as string | undefined) ?? "unknown";

  const log: Record<string, unknown> = {
    applied: [] as string[],
    skipped: [] as string[],
    errors: [] as { source: string; message: string }[],
    mock_mode: true,
    alternate_data_sources: [] as string[],
  };

  const applied = log.applied as string[];
  const skipped = log.skipped as string[];
  const errors = log.errors as { source: string; message: string }[];
  const altSources = log.alternate_data_sources as string[];

  // Bureau
  if (options.include_bureau !== false && (gstin || pan)) {
    try {
      const bureau = pullBureauReport(gstin, pan, businessName);
      applied.push("credit_bureau");
      log.mock_mode = bureau.mock !== false;
      if (bureau.data && !fd.credit_bureau) {
        const d = bureau.data;
        fd.credit_bureau = {
          crisil_rating: d.crisilRating,
          crisil_outlook: d.crisilOutlook,
          commercial_credit_score: d.cmrRank,
        };
      }
    } catch (e) {
      errors.push({ source: "credit_bureau", message: String(e) });
    }
  } else if (options.include_bureau !== false) {
    skipped.push("credit_bureau: no gstin/pan");
  }

  // Tax / GST
  if (options.include_tax !== false && (gstin || pan)) {
    try {
      const tax = verifyTax(gstin, pan);
      applied.push("tax_verification");
      if (tax.data) {
        const d = tax.data;
        if (!fd.tax_compliance) {
          fd.tax_compliance = {
            itr_filed_on_time_3y: d.itrFiledOnTime3y,
            advance_tax_compliance_pct: d.advanceTaxCompliant ? 100 : 70,
            tds_compliance_pct: d.tdsCompliancePct,
            gst_filing_compliance_pct: d.gstFilingCompliancePct,
            tax_demand_outstanding_inr: d.outstandingDemandInr,
          };
        }
        if (!fd.government_policy) {
          fd.government_policy = { gst_filing_compliance_pct: d.gstFilingCompliancePct };
        }
      }
      altSources.push("gst");
    } catch (e) {
      errors.push({ source: "tax_verification", message: String(e) });
    }
  }

  // Account Aggregator
  if (options.include_aa && options.aa_session_id) {
    try {
      const aa = fetchAaFinancialData(options.aa_session_id, msmeId);
      fd = mergeAaIntoFinancialData(fd, aa);
      applied.push("account_aggregator");
      altSources.push("account_aggregator");
      log.mock_mode = aa.mock !== false;
    } catch (e) {
      errors.push({ source: "account_aggregator", message: String(e) });
    }
  } else if (options.include_aa) {
    skipped.push("account_aggregator: no aa_session_id");
  }

  // UPI
  if (options.include_upi) {
    try {
      const upi = fetchUpiAnalytics(msmeId, options.upi_vpa);
      fd = mergeUpiIntoFinancialData(fd, upi);
      applied.push("upi_analytics");
      altSources.push("upi");
      log.mock_mode = upi.mock !== false;
    } catch (e) {
      errors.push({ source: "upi_analytics", message: String(e) });
    }
  }

  // EPFO
  if (options.include_epfo) {
    try {
      const epfo = fetchEpfoCompliance(msmeId, options.epfo_establishment_id);
      fd = mergeEpfoIntoFinancialData(fd, epfo);
      applied.push("epfo_compliance");
      altSources.push("epfo");
      log.mock_mode = epfo.mock !== false;
    } catch (e) {
      errors.push({ source: "epfo_compliance", message: String(e) });
    }
  }

  return { financial_data: fd, enrichment_log: log };
}
