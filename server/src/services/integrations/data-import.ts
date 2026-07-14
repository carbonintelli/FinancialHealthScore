import { getDb } from "../../db/index.js";
import type { ConnectorImportResult, ConnectorSource } from "./connectors.js";
import { importFromTally, importFromZoho } from "./connectors.js";
import {
  fetchFullIntelligence,
  buildSustainabilityReport,
  type CarbonFullIntelligence,
  type SustainabilityReport,
} from "./carbon-intelligence.js";
import { assessRequest } from "../scoring/index.js";
import { assessAndStore } from "../store.js";

export interface MsmeProfileContext {
  msme_id: string;
  business_name: string;
  gstin?: string | null;
  pan?: string | null;
  sector?: string;
  state?: string;
}

export interface ImportAndAssessOptions {
  connector: ConnectorSource;
  userId: number;
  msmeId: string;
  companyName: string;
  connectorOptions?: Record<string, unknown>;
  includeCarbonIntelligence?: boolean;
  audience?: string;
}

export interface ImportAndAssessResult {
  import_result: ConnectorImportResult;
  carbon_intelligence?: CarbonFullIntelligence;
  sustainability_report?: SustainabilityReport;
  assessment: Awaited<ReturnType<typeof assessAndStore>>["result"] & {
    agent_insights?: unknown;
  };
}

function loadMsmeProfile(msmeId: string): MsmeProfileContext {
  const link = getDb()
    .prepare("SELECT business_name, sector, gstin FROM portfolio_links WHERE msme_id = ?")
    .get(msmeId) as { business_name: string; sector: string; gstin: string | null } | undefined;

  return {
    msme_id: msmeId,
    business_name: link?.business_name ?? "MSME Business",
    gstin: link?.gstin,
    sector: link?.sector ?? "general",
    state: "maharashtra",
  };
}

function enrichCashFlowsFromCarbon(
  imported: ConnectorImportResult,
  carbon?: CarbonFullIntelligence
): ConnectorImportResult {
  if (imported.financial_data.cash_flows.length >= 3 || !carbon) return imported;

  const txn = carbon.transactions_summary;
  const inflow = Number(txn.avgMonthlyInflowInr ?? 0);
  const outflow = Number(txn.avgMonthlyOutflowInr ?? 0);
  if (!inflow) return imported;

  const months = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06"];
  const variance = [1.0, 0.94, 1.05, 0.98, 0.96, 1.02];
  imported.financial_data.cash_flows = months.map((month, i) => ({
    month,
    inflows: Math.round(inflow * variance[i]),
    outflows: Math.round(outflow * (variance[i] * 0.97)),
  }));
  imported.metadata.cash_flows_enriched_from = "ci.sustainow.in/transactions";
  return imported;
}

export function buildAssessmentRequest(
  profile: MsmeProfileContext,
  imported: ConnectorImportResult,
  audience = "credit_team"
) {
  const fd = imported.financial_data;
  return {
    financial_data: {
      profile: {
        msme_id: profile.msme_id,
        business_name: profile.business_name,
        gstin: profile.gstin ?? undefined,
        pan: profile.pan ?? undefined,
        state: profile.state ?? "maharashtra",
        sector: profile.sector ?? "general",
        employee_count: 50,
        years_in_operation: 10,
        annual_turnover_inr: fd.accounting.revenue_inr,
      },
      accounting: fd.accounting,
      cash_flows: fd.cash_flows,
      utility_bills: fd.utility_bills ?? [],
      payment_records: fd.payment_records,
      bank_statement_summary: fd.bank_statement_summary,
    },
    include_carbon_intelligence: true,
    audience,
    auto_enrich: false,
  };
}

export async function pullConnectorData(
  connector: ConnectorSource,
  companyName: string,
  options: Record<string, unknown> = {}
): Promise<ConnectorImportResult> {
  if (connector === "tally") {
    return importFromTally(companyName, {
      company_name: companyName,
      tally_company_id: options.tally_company_id as string | undefined,
      from_date: options.from_date as string | undefined,
      to_date: options.to_date as string | undefined,
    });
  }
  return importFromZoho(companyName, {
    organization_id: options.organization_id as string | undefined,
    from_date: options.from_date as string | undefined,
    to_date: options.to_date as string | undefined,
  });
}

export async function importAndAssess(opts: ImportAndAssessOptions): Promise<ImportAndAssessResult> {
  const profile = loadMsmeProfile(opts.msmeId);
  let imported = await pullConnectorData(opts.connector, opts.companyName || profile.business_name, opts.connectorOptions ?? {});

  let carbon: CarbonFullIntelligence | undefined;
  let sustainability: SustainabilityReport | undefined;

  if (opts.includeCarbonIntelligence !== false) {
    carbon = await fetchFullIntelligence(opts.msmeId);
    sustainability = buildSustainabilityReport(opts.msmeId, carbon);
    imported = enrichCashFlowsFromCarbon(imported, carbon);
  }

  const request = buildAssessmentRequest(profile, imported, opts.audience ?? "credit_team");
  const applied: string[] = [opts.connector];
  if (carbon) applied.push("ci.sustainow.in");
  const enrichmentLog = {
    applied,
    skipped: [] as string[],
    errors: [] as { source: string; message: string }[],
    mock_mode: imported.mock || carbon?.mock_data !== false,
  };

  const result = await assessRequest(request, carbon, enrichmentLog);
  const stored = await assessAndStore(opts.userId, result, opts.audience ?? "credit_team");

  return {
    import_result: imported,
    carbon_intelligence: carbon,
    sustainability_report: sustainability,
    assessment: { ...stored.result, agent_insights: stored.agent_insights },
  };
}
