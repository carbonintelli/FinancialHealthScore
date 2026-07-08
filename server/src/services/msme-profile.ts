import { getDb } from "../db/index.js";

export interface MsmeFinancialData {
  accounting?: Record<string, unknown>;
  cash_flows?: Record<string, unknown>[];
  utility_bills?: Record<string, unknown>[];
  payment_records?: Record<string, unknown>[];
  bank_statement_summary?: Record<string, unknown>;
  founder?: Record<string, unknown>;
  market_sentiment?: Record<string, unknown>;
  product_market?: Record<string, unknown>;
  credit_bureau?: Record<string, unknown>;
  legal_compliance?: Record<string, unknown>;
  tax_compliance?: Record<string, unknown>;
  operational_certifications?: Record<string, unknown>;
  governance_diversity?: Record<string, unknown>;
  esg_disclosure?: Record<string, unknown>;
  supply_chain?: Record<string, unknown>;
  insurance?: Record<string, unknown>;
  geographic?: Record<string, unknown>;
}

export interface MsmeProfileRecord {
  msme_id: string;
  organization_id: number;
  business_name: string;
  sector: string;
  gstin: string | null;
  pan: string | null;
  udyam_number: string | null;
  state: string | null;
  pincode: string | null;
  employee_count: number | null;
  years_in_operation: number | null;
  annual_turnover_inr: number | null;
  financial_data: MsmeFinancialData;
  data_completeness_pct: number;
  last_feed_at: string | null;
  created_at: string;
  updated_at: string;
}

function computeCompleteness(profile: Partial<MsmeProfileRecord>, financial: MsmeFinancialData): number {
  let filled = 0;
  const total = 10;
  if (profile.business_name) filled++;
  if (profile.sector) filled++;
  if (profile.gstin) filled++;
  if (profile.udyam_number) filled++;
  if (profile.state) filled++;
  if (profile.annual_turnover_inr || financial.accounting?.revenue_inr) filled++;
  if (financial.accounting?.current_assets_inr) filled++;
  if (financial.cash_flows?.length) filled++;
  if (financial.founder) filled++;
  if (financial.tax_compliance || financial.credit_bureau) filled++;
  return Math.round((filled / total) * 100);
}

export function saveMsmeProfile(input: {
  msme_id: string;
  organization_id: number;
  business_name: string;
  sector?: string;
  gstin?: string | null;
  pan?: string | null;
  udyam_number?: string | null;
  state?: string | null;
  pincode?: string | null;
  employee_count?: number | null;
  years_in_operation?: number | null;
  annual_turnover_inr?: number | null;
  financial_data?: MsmeFinancialData;
}) {
  const financial = input.financial_data ?? {};
  const completeness = computeCompleteness(input, financial);
  const now = new Date().toISOString();

  const existing = getDb().prepare("SELECT id FROM msme_profiles WHERE msme_id = ?").get(input.msme_id);
  if (existing) {
    getDb()
      .prepare(
        `UPDATE msme_profiles SET
          business_name = ?, sector = ?, gstin = ?, pan = ?, udyam_number = ?, state = ?, pincode = ?,
          employee_count = ?, years_in_operation = ?, annual_turnover_inr = ?,
          financial_data_json = ?, data_completeness_pct = ?, last_feed_at = ?, updated_at = ?
         WHERE msme_id = ?`,
      )
      .run(
        input.business_name,
        input.sector ?? "general",
        input.gstin ?? null,
        input.pan ?? null,
        input.udyam_number ?? null,
        input.state ?? null,
        input.pincode ?? null,
        input.employee_count ?? null,
        input.years_in_operation ?? null,
        input.annual_turnover_inr ?? null,
        JSON.stringify(financial),
        completeness,
        now,
        now,
        input.msme_id,
      );
  } else {
    getDb()
      .prepare(
        `INSERT INTO msme_profiles
         (msme_id, organization_id, business_name, sector, gstin, pan, udyam_number, state, pincode,
          employee_count, years_in_operation, annual_turnover_inr, financial_data_json, data_completeness_pct, last_feed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        input.msme_id,
        input.organization_id,
        input.business_name,
        input.sector ?? "general",
        input.gstin ?? null,
        input.pan ?? null,
        input.udyam_number ?? null,
        input.state ?? null,
        input.pincode ?? null,
        input.employee_count ?? null,
        input.years_in_operation ?? null,
        input.annual_turnover_inr ?? null,
        JSON.stringify(financial),
        completeness,
        now,
      );
  }

  const link = getDb().prepare("SELECT id FROM portfolio_links WHERE msme_id = ? LIMIT 1").get(input.msme_id);
  if (link) {
    getDb()
      .prepare("UPDATE portfolio_links SET business_name = ?, sector = ?, gstin = ? WHERE msme_id = ?")
      .run(input.business_name, input.sector ?? "general", input.gstin ?? null, input.msme_id);
  }
}

export function getMsmeProfile(msmeId: string): MsmeProfileRecord | null {
  const row = getDb().prepare("SELECT * FROM msme_profiles WHERE msme_id = ?").get(msmeId) as
    | Record<string, unknown>
    | undefined;
  if (!row) return loadProfileFromPortfolio(msmeId);
  return rowToProfile(row);
}

function loadProfileFromPortfolio(msmeId: string): MsmeProfileRecord | null {
  const link = getDb()
    .prepare("SELECT msme_id, business_name, sector, gstin FROM portfolio_links WHERE msme_id = ? LIMIT 1")
    .get(msmeId) as { msme_id: string; business_name: string; sector: string; gstin: string | null } | undefined;
  if (!link) return null;
  const org = getDb()
    .prepare(
      `SELECT o.id, o.registration_id FROM organizations o
       JOIN users u ON u.organization_id = o.id WHERE u.msme_id = ? LIMIT 1`,
    )
    .get(msmeId) as { id: number; registration_id: string | null } | undefined;
  return {
    msme_id: link.msme_id,
    organization_id: org?.id ?? 0,
    business_name: link.business_name,
    sector: link.sector ?? "general",
    gstin: link.gstin,
    pan: null,
    udyam_number: org?.registration_id ?? null,
    state: null,
    pincode: null,
    employee_count: null,
    years_in_operation: null,
    annual_turnover_inr: null,
    financial_data: {},
    data_completeness_pct: 20,
    last_feed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function rowToProfile(row: Record<string, unknown>): MsmeProfileRecord {
  return {
    msme_id: String(row.msme_id),
    organization_id: Number(row.organization_id),
    business_name: String(row.business_name),
    sector: String(row.sector ?? "general"),
    gstin: (row.gstin as string) ?? null,
    pan: (row.pan as string) ?? null,
    udyam_number: (row.udyam_number as string) ?? null,
    state: (row.state as string) ?? null,
    pincode: (row.pincode as string) ?? null,
    employee_count: row.employee_count != null ? Number(row.employee_count) : null,
    years_in_operation: row.years_in_operation != null ? Number(row.years_in_operation) : null,
    annual_turnover_inr: row.annual_turnover_inr != null ? Number(row.annual_turnover_inr) : null,
    financial_data: JSON.parse(String(row.financial_data_json || "{}")) as MsmeFinancialData,
    data_completeness_pct: Number(row.data_completeness_pct ?? 0),
    last_feed_at: (row.last_feed_at as string) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function mergeFinancialData(existing: MsmeFinancialData, incoming: MsmeFinancialData): MsmeFinancialData {
  return {
    ...existing,
    ...incoming,
    accounting: { ...existing.accounting, ...incoming.accounting },
    bank_statement_summary: { ...existing.bank_statement_summary, ...incoming.bank_statement_summary },
    founder: incoming.founder ?? existing.founder,
    credit_bureau: incoming.credit_bureau ?? existing.credit_bureau,
    tax_compliance: incoming.tax_compliance ?? existing.tax_compliance,
    cash_flows: incoming.cash_flows?.length ? incoming.cash_flows : existing.cash_flows,
    utility_bills: incoming.utility_bills?.length ? incoming.utility_bills : existing.utility_bills,
    payment_records: incoming.payment_records?.length ? incoming.payment_records : existing.payment_records,
  };
}

export function buildAssessmentRequestFromProfile(profile: MsmeProfileRecord, audience = "credit_team") {
  const fd = profile.financial_data;
  const revenue =
    Number(fd.accounting?.revenue_inr) ||
    profile.annual_turnover_inr ||
    10_000_000;

  return {
    financial_data: {
      profile: {
        msme_id: profile.msme_id,
        business_name: profile.business_name,
        gstin: profile.gstin ?? undefined,
        pan: profile.pan ?? undefined,
        udyam_number: profile.udyam_number ?? undefined,
        state: profile.state ?? "maharashtra",
        pincode: profile.pincode ?? undefined,
        sector: profile.sector,
        employee_count: profile.employee_count ?? 25,
        years_in_operation: profile.years_in_operation ?? 5,
        annual_turnover_inr: revenue,
      },
      accounting: fd.accounting ?? {
        revenue_inr: revenue,
        cost_of_goods_inr: revenue * 0.65,
        operating_expenses_inr: revenue * 0.2,
        current_assets_inr: revenue * 0.3,
        current_liabilities_inr: revenue * 0.18,
        total_debt_inr: revenue * 0.25,
        equity_inr: revenue * 0.35,
      },
      cash_flows: fd.cash_flows ?? [],
      utility_bills: fd.utility_bills ?? [],
      payment_records: fd.payment_records ?? [],
      bank_statement_summary: fd.bank_statement_summary,
      founder: fd.founder,
      market_sentiment: fd.market_sentiment,
      product_market: fd.product_market,
      credit_bureau: fd.credit_bureau,
      legal_compliance: fd.legal_compliance,
      tax_compliance: fd.tax_compliance,
      operational_certifications: fd.operational_certifications,
      governance_diversity: fd.governance_diversity,
      esg_disclosure: fd.esg_disclosure,
      supply_chain: fd.supply_chain,
      insurance: fd.insurance,
      geographic: fd.geographic ?? (profile.state ? { state: profile.state } : undefined),
    },
    include_carbon_intelligence: true,
    audience,
    auto_enrich: false,
  };
}

export function listDataFeeds(msmeId: string, limit = 20) {
  return getDb()
    .prepare(
      `SELECT feed_id, msme_id, source, assessment_id, status, created_at
       FROM msme_data_feeds WHERE msme_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(msmeId, limit);
}
