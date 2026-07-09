/**
 * Alternate data connectors: Account Aggregator (AA), UPI analytics, EPFO compliance.
 * Mock mode when API keys are unset — aligned with RBI AA framework and Indian MSME alt-data rails.
 */

import { config } from "../../config.js";

export type AlternateDataSource = "account_aggregator" | "upi" | "epfo" | "gst";

export interface AaConsentRequest {
  msme_id: string;
  business_name: string;
  mobile?: string;
  pan?: string;
  fi_types?: string[];
}

export interface AaConsentSession {
  success: boolean;
  mock: boolean;
  source: "account_aggregator";
  session_id: string;
  consent_handle: string;
  status: "pending" | "active" | "expired" | "revoked";
  redirect_url: string;
  fi_types: string[];
  expires_at: string;
}

export interface AaFinancialData {
  success: boolean;
  mock: boolean;
  source: "account_aggregator";
  session_id: string;
  msme_id: string;
  fetched_at: string;
  data: {
    avg_monthly_balance_inr: number;
    min_monthly_balance_inr: number;
    avg_monthly_credit_inr: number;
    avg_monthly_debit_inr: number;
    cheque_bounce_count_12m: number;
    salary_credits_detected: boolean;
    months_of_statements: number;
    account_vintage_months: number;
    cash_flow_volatility_pct: number;
  };
}

export interface UpiAnalytics {
  success: boolean;
  mock: boolean;
  source: "upi";
  msme_id: string;
  vpa?: string;
  fetched_at: string;
  data: {
    monthly_transaction_volume_inr: number;
    avg_ticket_size_inr: number;
    merchant_payment_count_90d: number;
    p2m_share_pct: number;
    payment_success_rate_pct: number;
    unique_payers_90d: number;
    revenue_growth_mom_pct: number;
    weekend_share_pct: number;
  };
}

export interface EpfoCompliance {
  success: boolean;
  mock: boolean;
  source: "epfo";
  msme_id: string;
  establishment_id?: string;
  fetched_at: string;
  data: {
    registered: boolean;
    employee_count_reported: number;
    contribution_compliance_pct: number;
    months_contributed_12m: number;
    wage_disbursement_regularity_pct: number;
    last_contribution_date: string;
    pending_dues_inr: number;
  };
}

function assertMockAllowed(liveConfigured: boolean, label: string) {
  if (!liveConfigured && !config.useMockIntegrations) {
    throw new Error(`Live ${label} integration not configured — set USE_MOCK_INTEGRATIONS=true for demo`);
  }
}

export function initiateAaConsent(req: AaConsentRequest): AaConsentSession {
  assertMockAllowed(!!config.aaApiKey, "Account Aggregator");
  const sessionId = `aa-${req.msme_id}-${Date.now().toString(36)}`;
  const consentHandle = `consent-${req.msme_id.slice(-6)}-${Math.random().toString(36).slice(2, 8)}`;
  const fiTypes = req.fi_types ?? ["DEPOSIT", "TERM_DEPOSIT", "RECURRING_DEPOSIT"];
  const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  return {
    success: true,
    mock: !config.aaApiKey,
    source: "account_aggregator",
    session_id: sessionId,
    consent_handle: consentHandle,
    status: "pending",
    redirect_url: `${config.aaConsentRedirectBase}?session=${sessionId}&handle=${consentHandle}`,
    fi_types: fiTypes,
    expires_at: expires,
  };
}

export function fetchAaFinancialData(sessionId: string, msmeId: string): AaFinancialData {
  assertMockAllowed(!!config.aaApiKey, "Account Aggregator");
  return {
    success: true,
    mock: !config.aaApiKey,
    source: "account_aggregator",
    session_id: sessionId,
    msme_id: msmeId,
    fetched_at: new Date().toISOString(),
    data: {
      avg_monthly_balance_inr: 2_850_000,
      min_monthly_balance_inr: 1_120_000,
      avg_monthly_credit_inr: 4_200_000,
      avg_monthly_debit_inr: 3_780_000,
      cheque_bounce_count_12m: 0,
      salary_credits_detected: false,
      months_of_statements: 12,
      account_vintage_months: 28,
      cash_flow_volatility_pct: 14.2,
    },
  };
}

export function fetchUpiAnalytics(msmeId: string, vpa?: string): UpiAnalytics {
  assertMockAllowed(!!config.upiAnalyticsApiKey, "UPI analytics");
  return {
    success: true,
    mock: !config.upiAnalyticsApiKey,
    source: "upi",
    msme_id: msmeId,
    vpa: vpa ?? `merchant.${msmeId.slice(-8)}@upi`,
    fetched_at: new Date().toISOString(),
    data: {
      monthly_transaction_volume_inr: 3_600_000,
      avg_ticket_size_inr: 18_500,
      merchant_payment_count_90d: 1240,
      p2m_share_pct: 72,
      payment_success_rate_pct: 97.8,
      unique_payers_90d: 186,
      revenue_growth_mom_pct: 6.4,
      weekend_share_pct: 22,
    },
  };
}

export function fetchEpfoCompliance(msmeId: string, establishmentId?: string): EpfoCompliance {
  assertMockAllowed(!!config.epfoApiKey, "EPFO");
  return {
    success: true,
    mock: !config.epfoApiKey,
    source: "epfo",
    msme_id: msmeId,
    establishment_id: establishmentId ?? `EPFO-${msmeId.slice(-6).toUpperCase()}`,
    fetched_at: new Date().toISOString(),
    data: {
      registered: true,
      employee_count_reported: 42,
      contribution_compliance_pct: 94,
      months_contributed_12m: 11,
      wage_disbursement_regularity_pct: 92,
      last_contribution_date: "2026-06-15",
      pending_dues_inr: 0,
    },
  };
}

export function listAlternateDataConnectors() {
  return [
    {
      id: "account_aggregator",
      label: "Account Aggregator (RBI AA Framework)",
      description: "Consented bank statement and cash-flow analytics via AA ecosystem",
      configured: !!config.aaApiKey,
      mock: !config.aaApiKey,
      endpoints: {
        consent: "POST /api/v1/ecosystem/aa/consent/initiate",
        fetch: "POST /api/v1/ecosystem/aa/consent/fetch",
      },
    },
    {
      id: "upi",
      label: "UPI Merchant Analytics",
      description: "Payment velocity, ticket size, and merchant transaction patterns",
      configured: !!config.upiAnalyticsApiKey,
      mock: !config.upiAnalyticsApiKey,
      endpoints: { fetch: "POST /api/v1/integrations/upi/analytics" },
    },
    {
      id: "epfo",
      label: "EPFO Establishment Compliance",
      description: "Employment stability and statutory wage contribution signals",
      configured: !!config.epfoApiKey,
      mock: !config.epfoApiKey,
      endpoints: { fetch: "POST /api/v1/integrations/epfo/verify" },
    },
    {
      id: "gst",
      label: "GSTN / ITR",
      description: "Tax filing compliance and turnover verification",
      configured: false,
      mock: config.useMockIntegrations,
      endpoints: { verify: "POST /api/v1/integrations/tax/verify" },
    },
  ];
}
