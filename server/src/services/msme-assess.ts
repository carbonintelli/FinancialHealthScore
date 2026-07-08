import { randomUUID } from "crypto";
import { getDb } from "../db/index.js";
import { assessRequest, getMockCarbonData } from "./scoring/bridge.js";
import { assessAndStore } from "./store.js";
import { fetchFullIntelligence } from "./integrations/carbon-intelligence.js";
import {
  buildAssessmentRequestFromProfile,
  getMsmeProfile,
  mergeFinancialData,
  saveMsmeProfile,
  type MsmeFinancialData,
} from "./msme-profile.js";

export interface AssessFromProfileOptions {
  userId: number;
  msmeId: string;
  audience?: string;
  source?: string;
  includeCarbonIntelligence?: boolean;
  financialData?: MsmeFinancialData;
}

export interface DataFeedOptions {
  userId: number;
  msmeId: string;
  organizationId: number;
  businessName: string;
  source: string;
  financialData: MsmeFinancialData;
  profilePatch?: Partial<{
    sector: string;
    gstin: string;
    pan: string;
    state: string;
    annual_turnover_inr: number;
    employee_count: number;
    years_in_operation: number;
  }>;
  runAssessment?: boolean;
  audience?: string;
  includeCarbonIntelligence?: boolean;
}

export async function assessFromProfile(opts: AssessFromProfileOptions) {
  const profile = getMsmeProfile(opts.msmeId);
  if (!profile) throw new Error("MSME profile not found");

  if (opts.financialData) {
    profile.financial_data = mergeFinancialData(profile.financial_data, opts.financialData);
    saveMsmeProfile({
      msme_id: profile.msme_id,
      organization_id: profile.organization_id,
      business_name: profile.business_name,
      sector: profile.sector,
      gstin: profile.gstin,
      pan: profile.pan,
      udyam_number: profile.udyam_number,
      state: profile.state,
      pincode: profile.pincode,
      employee_count: profile.employee_count,
      years_in_operation: profile.years_in_operation,
      annual_turnover_inr: profile.annual_turnover_inr,
      financial_data: profile.financial_data,
    });
  }

  const request = buildAssessmentRequestFromProfile(profile, opts.audience ?? "credit_team");
  let carbonData: unknown;
  if (opts.includeCarbonIntelligence !== false) {
    try {
      carbonData = await fetchFullIntelligence(opts.msmeId);
    } catch {
      carbonData = getMockCarbonData(opts.msmeId);
    }
  }

  const enrichmentLog = {
    applied: [opts.source ?? "msme_data_feed", "ci.sustainow.in"],
    skipped: [] as string[],
    errors: [] as { source: string; message: string }[],
    mock_mode: (carbonData as { mock_data?: boolean } | undefined)?.mock_data !== false,
  };

  const result = await assessRequest(request, carbonData, enrichmentLog);
  const stored = await assessAndStore(opts.userId, result, opts.audience ?? "credit_team");

  return {
    assessment: { ...stored.result, agent_insights: stored.agent_insights },
    profile_completeness: profile.data_completeness_pct,
  };
}

export async function submitDataFeed(opts: DataFeedOptions) {
  const profile = getMsmeProfile(opts.msmeId);
  const mergedFinancial = mergeFinancialData(profile?.financial_data ?? {}, opts.financialData);

  saveMsmeProfile({
    msme_id: opts.msmeId,
    organization_id: opts.organizationId,
    business_name: opts.businessName,
    sector: opts.profilePatch?.sector ?? profile?.sector ?? "general",
    gstin: opts.profilePatch?.gstin ?? profile?.gstin ?? null,
    pan: opts.profilePatch?.pan ?? profile?.pan ?? null,
    udyam_number: profile?.udyam_number ?? null,
    state: opts.profilePatch?.state ?? profile?.state ?? null,
    pincode: profile?.pincode ?? null,
    employee_count: opts.profilePatch?.employee_count ?? profile?.employee_count ?? null,
    years_in_operation: opts.profilePatch?.years_in_operation ?? profile?.years_in_operation ?? null,
    annual_turnover_inr:
      opts.profilePatch?.annual_turnover_inr ??
      profile?.annual_turnover_inr ??
      (Number(mergedFinancial.accounting?.revenue_inr) || null),
    financial_data: mergedFinancial,
  });

  const feedId = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO msme_data_feeds (feed_id, msme_id, submitted_by_user_id, source, payload_json, status)
       VALUES (?, ?, ?, ?, ?, 'received')`,
    )
    .run(feedId, opts.msmeId, opts.userId, opts.source, JSON.stringify(opts.financialData));

  let assessmentResult: Awaited<ReturnType<typeof assessFromProfile>> | null = null;
  if (opts.runAssessment !== false) {
    assessmentResult = await assessFromProfile({
      userId: opts.userId,
      msmeId: opts.msmeId,
      audience: opts.audience ?? "credit_team",
      source: opts.source,
      includeCarbonIntelligence: opts.includeCarbonIntelligence,
      financialData: mergedFinancial,
    });
    if (assessmentResult?.assessment?.assessment_id) {
      getDb()
        .prepare("UPDATE msme_data_feeds SET assessment_id = ?, status = 'assessed' WHERE feed_id = ?")
        .run(assessmentResult.assessment.assessment_id, feedId);
    }
  }

  const updated = getMsmeProfile(opts.msmeId);
  return {
    feed_id: feedId,
    source: opts.source,
    profile: updated,
    assessment: assessmentResult?.assessment ?? null,
  };
}
