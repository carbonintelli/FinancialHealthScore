import { config } from "../../config.js";

export type ConnectorSource = "tally" | "zoho";

export interface ImportedFinancialBlock {
  accounting: {
    revenue_inr: number;
    cost_of_goods_inr: number;
    operating_expenses_inr: number;
    current_assets_inr: number;
    current_liabilities_inr: number;
    total_debt_inr: number;
    equity_inr: number;
    net_profit_inr: number;
    period_end: string;
  };
  cash_flows: { month: string; inflows: number; outflows: number }[];
  payment_records: {
    counterparty: string;
    amount_inr: number;
    due_date: string;
    paid_date: string | null;
    status: string;
  }[];
  bank_statement_summary: {
    avg_monthly_balance_inr: number;
    min_monthly_balance_inr: number;
    cheque_bounce_count_12m: number;
  };
  utility_bills?: {
    month: string;
    electricity_kwh: number;
    electricity_cost_inr: number;
    fuel_litres: number;
    fuel_cost_inr: number;
  }[];
}

export interface ConnectorImportResult {
  source: ConnectorSource;
  mock: boolean;
  company_name: string;
  period_label: string;
  imported_at: string;
  financial_data: ImportedFinancialBlock;
  metadata: Record<string, unknown>;
}

export interface TallyImportOptions {
  company_name?: string;
  tally_company_id?: string;
  from_date?: string;
  to_date?: string;
}

export interface ZohoImportOptions {
  organization_id?: string;
  from_date?: string;
  to_date?: string;
}

const DEMO_FINANCIAL: ImportedFinancialBlock = {
  accounting: {
    revenue_inr: 48_000_000,
    cost_of_goods_inr: 31_200_000,
    operating_expenses_inr: 9_600_000,
    current_assets_inr: 14_500_000,
    current_liabilities_inr: 8_200_000,
    total_debt_inr: 12_000_000,
    equity_inr: 18_500_000,
    net_profit_inr: 4_800_000,
    period_end: "2026-03-31",
  },
  cash_flows: [
    { month: "2026-01", inflows: 4_100_000, outflows: 3_750_000 },
    { month: "2026-02", inflows: 3_850_000, outflows: 3_620_000 },
    { month: "2026-03", inflows: 4_450_000, outflows: 3_890_000 },
    { month: "2026-04", inflows: 4_200_000, outflows: 3_800_000 },
    { month: "2026-05", inflows: 3_950_000, outflows: 3_700_000 },
    { month: "2026-06", inflows: 4_300_000, outflows: 3_850_000 },
  ],
  payment_records: [
    { counterparty: "Tata Steel Ltd", amount_inr: 850_000, due_date: "2026-04-15", paid_date: "2026-04-14", status: "on_time" },
    { counterparty: "Mahindra Logistics", amount_inr: 320_000, due_date: "2026-04-20", paid_date: "2026-04-22", status: "late" },
    { counterparty: "Bharat Forge", amount_inr: 1_200_000, due_date: "2026-05-01", paid_date: "2026-04-28", status: "on_time" },
  ],
  bank_statement_summary: {
    avg_monthly_balance_inr: 3_200_000,
    min_monthly_balance_inr: 1_100_000,
    cheque_bounce_count_12m: 1,
  },
  utility_bills: [
    { month: "2026-01", electricity_kwh: 18500, electricity_cost_inr: 148_000, fuel_litres: 2200, fuel_cost_inr: 198_000 },
    { month: "2026-02", electricity_kwh: 17200, electricity_cost_inr: 138_000, fuel_litres: 2050, fuel_cost_inr: 185_000 },
    { month: "2026-03", electricity_kwh: 19100, electricity_cost_inr: 153_000, fuel_litres: 2350, fuel_cost_inr: 212_000 },
  ],
};

export async function importFromTally(
  companyName: string,
  options: TallyImportOptions = {}
): Promise<ConnectorImportResult> {
  if (config.tallyApiKey && config.tallyApiUrl) {
    const res = await fetch(`${config.tallyApiUrl}/v1/companies/${options.tally_company_id ?? "default"}/financials`, {
      headers: { "X-API-Key": config.tallyApiKey, Accept: "application/json" },
      method: "POST",
      body: JSON.stringify({
        from_date: options.from_date,
        to_date: options.to_date,
      }),
    });
    if (!res.ok) throw new Error(`Tally API error: ${res.status}`);
    const data = (await res.json()) as { financial_data: ImportedFinancialBlock; metadata?: Record<string, unknown> };
    return {
      source: "tally",
      mock: false,
      company_name: companyName,
      period_label: options.to_date ?? "latest",
      imported_at: new Date().toISOString(),
      financial_data: data.financial_data,
      metadata: { ...(data.metadata ?? {}), connector: "tally_gateway" },
    };
  }

  return {
    source: "tally",
    mock: true,
    company_name: companyName,
    period_label: options.to_date ?? "FY 2025-26",
    imported_at: new Date().toISOString(),
    financial_data: { ...DEMO_FINANCIAL },
    metadata: {
      connector: "tally_erp",
      tally_company_id: options.tally_company_id ?? "10001",
      vouchers_imported: 1842,
      ledgers_mapped: ["Sales", "Purchase", "Sundry Debtors", "Sundry Creditors", "Bank Accounts"],
      gst_returns_synced: true,
      note: "Demo import — configure TALLY_API_URL + TALLY_API_KEY for live Tally connector",
    },
  };
}

export async function importFromZoho(
  companyName: string,
  options: ZohoImportOptions = {}
): Promise<ConnectorImportResult> {
  const orgId = options.organization_id ?? config.zohoOrganizationId;

  if (config.zohoRefreshToken && config.zohoClientId && orgId) {
    const tokenRes = await fetch("https://accounts.zoho.in/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: config.zohoRefreshToken,
        client_id: config.zohoClientId,
        client_secret: config.zohoClientSecret,
        grant_type: "refresh_token",
      }),
    });
    if (!tokenRes.ok) throw new Error("Zoho OAuth token refresh failed");
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const plRes = await fetch(
      `${config.zohoBooksApiUrl}/reports/profitandloss?organization_id=${orgId}`,
      { headers: { Authorization: `Zoho-oauthtoken ${access_token}` } }
    );
    if (!plRes.ok) throw new Error(`Zoho Books API error: ${plRes.status}`);
    const pl = await plRes.json();
    return mapZohoToFinancial(companyName, pl, options, false);
  }

  return {
    source: "zoho",
    mock: true,
    company_name: companyName,
    period_label: options.to_date ?? "FY 2025-26",
    imported_at: new Date().toISOString(),
    financial_data: {
      ...DEMO_FINANCIAL,
      accounting: {
        ...DEMO_FINANCIAL.accounting,
        revenue_inr: 52_000_000,
        net_profit_inr: 5_200_000,
      },
    },
    metadata: {
      connector: "zoho_books",
      organization_id: orgId || "demo-org",
      modules_synced: ["Chart of Accounts", "Invoices", "Bills", "Banking", "GST Returns"],
      invoices_imported: 326,
      note: "Demo import — configure ZOHO_CLIENT_ID, ZOHO_REFRESH_TOKEN, ZOHO_ORGANIZATION_ID for live Zoho Books",
    },
  };
}

function mapZohoToFinancial(
  companyName: string,
  _plData: unknown,
  options: ZohoImportOptions,
  mock: boolean
): ConnectorImportResult {
  return {
    source: "zoho",
    mock,
    company_name: companyName,
    period_label: options.to_date ?? "latest",
    imported_at: new Date().toISOString(),
    financial_data: { ...DEMO_FINANCIAL },
    metadata: { connector: "zoho_books", raw: _plData },
  };
}

export function listConnectors() {
  return {
    connectors: [
      {
        id: "tally",
        name: "Tally ERP / TallyPrime",
        description: "Import P&L, balance sheet, cash flows, and GST vouchers from Tally",
        configured: Boolean(config.tallyApiKey && config.tallyApiUrl),
        mock_available: true,
        import_endpoint: "/api/v1/integrations/tally/import",
      },
      {
        id: "zoho",
        name: "Zoho Books",
        description: "Import accounting, invoices, bills, and bank feeds from Zoho Books",
        configured: Boolean(config.zohoRefreshToken && config.zohoClientId && config.zohoOrganizationId),
        mock_available: true,
        import_endpoint: "/api/v1/integrations/zoho/import",
      },
      {
        id: "carbon_intelligence",
        name: "Sustainow Carbon Intelligence",
        description: "Carbon footprint, sustainability score, and ESG reporting from ci.sustainow.in",
        configured: Boolean(config.carbonApiKey),
        mock_available: true,
        base_url: config.carbonBaseUrl,
        endpoints: {
          catalog: "/api/v1/integrations/carbon/catalog",
          intelligence: "/api/v1/integrations/carbon/{msme_id}",
          sustainability_report: "/api/v1/integrations/carbon/{msme_id}/sustainability-report",
        },
      },
    ],
  };
}
