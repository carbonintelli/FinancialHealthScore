/**
 * Near-real-time reassessment pipeline — triggered by alternate-data webhooks.
 */

import { v4 as uuidv4 } from "uuid";
import { getDb } from "../../db/index.js";
import { assessRequest } from "../scoring/bridge.js";
import { detectBorrowerSegment } from "../scoring/thin-file.js";
import { enrichFinancialData } from "../integrations/enrichment.js";
import { getMockCarbonData } from "../scoring/index.js";
import { getMsmeProfile } from "../msme-profile.js";
import { saveAssessment } from "../store.js";
import type { FinancialDataInput } from "../scoring/types.js";

export type WebhookSource = "gst" | "account_aggregator" | "upi" | "epfo";
export type WebhookEventType =
  | "gst.filing.updated"
  | "aa.statement.received"
  | "upi.analytics.refresh"
  | "epfo.contribution.posted";

export interface AlternateDataWebhookPayload {
  event_type: WebhookEventType;
  msme_id: string;
  source: WebhookSource;
  timestamp?: string;
  data?: Record<string, unknown>;
  aa_session_id?: string;
  upi_vpa?: string;
  epfo_establishment_id?: string;
}

export interface WebhookProcessResult {
  event_id: string;
  msme_id: string;
  status: "processed" | "skipped" | "failed";
  assessment_id?: string;
  borrower_segment?: string;
  overall_score?: number;
  message: string;
  processed_at: string;
}

function buildFinancialDataFromProfile(msmeId: string): FinancialDataInput | null {
  const profile = getMsmeProfile(msmeId);
  if (!profile) return null;
  const fd = profile.financial_data ?? {};
  return {
    profile: {
      msme_id: msmeId,
      business_name: profile.business_name,
      sector: profile.sector,
      gstin: profile.gstin,
      pan: profile.pan,
      udyam_number: profile.udyam_number,
      state: profile.state,
      employee_count: profile.employee_count,
      years_in_operation: profile.years_in_operation,
    },
    accounting: fd.accounting ?? {},
    ...fd,
  } as FinancialDataInput;
}

export function recordWebhookEvent(payload: AlternateDataWebhookPayload): string {
  const eventId = uuidv4();
  getDb()
    .prepare(
      `INSERT INTO webhook_events (event_id, msme_id, source, event_type, payload_json, status)
       VALUES (?, ?, ?, ?, ?, 'received')`,
    )
    .run(eventId, payload.msme_id, payload.source, payload.event_type, JSON.stringify(payload));
  return eventId;
}

export function updateWebhookEvent(
  eventId: string,
  status: string,
  assessmentId?: string,
): void {
  getDb()
    .prepare(
      `UPDATE webhook_events SET status = ?, assessment_id = ?, processed_at = datetime('now') WHERE event_id = ?`,
    )
    .run(status, assessmentId ?? null, eventId);
}

export function listWebhookEvents(msmeId: string, limit = 20) {
  return getDb()
    .prepare(
      `SELECT event_id, msme_id, source, event_type, status, assessment_id, created_at, processed_at
       FROM webhook_events WHERE msme_id = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .all(msmeId, limit);
}

export async function processAlternateDataWebhook(
  payload: AlternateDataWebhookPayload,
  userId = 0,
): Promise<WebhookProcessResult> {
  const eventId = recordWebhookEvent(payload);
  const processedAt = new Date().toISOString();

  try {
    let fd = buildFinancialDataFromProfile(payload.msme_id);
    if (!fd) {
      updateWebhookEvent(eventId, "skipped");
      return {
        event_id: eventId,
        msme_id: payload.msme_id,
        status: "skipped",
        message: "MSME profile not found — register enterprise before webhook reassessment",
        processed_at: processedAt,
      };
    }

    const enrichOpts = {
      msme_id: payload.msme_id,
      include_bureau: true,
      include_tax: payload.source === "gst" || payload.event_type === "gst.filing.updated",
      include_aa: payload.source === "account_aggregator" || !!payload.aa_session_id,
      include_upi: payload.source === "upi",
      include_epfo: payload.source === "epfo",
      aa_session_id: payload.aa_session_id ?? (payload.data?.session_id as string | undefined),
      upi_vpa: payload.upi_vpa ?? (payload.data?.vpa as string | undefined),
      epfo_establishment_id:
        payload.epfo_establishment_id ?? (payload.data?.establishment_id as string | undefined),
    };

    const { financial_data, enrichment_log } = await enrichFinancialData(fd, enrichOpts);
    fd = financial_data;

    const thinFile = detectBorrowerSegment(fd);
    const carbon = getMockCarbonData(payload.msme_id);

    const result = await assessRequest(
      {
        financial_data: fd,
        include_carbon_intelligence: true,
        audience: "credit_team",
        auto_enrich: false,
        thin_file_mode: thinFile.is_thin_file,
      },
      carbon,
      {
        ...enrichment_log,
        webhook_event_id: eventId,
        webhook_source: payload.source,
        borrower_segment: thinFile.segment,
      },
    );

    result.metadata = {
      ...result.metadata,
      borrower_segment: thinFile,
      reassessment_trigger: payload.event_type,
      real_time: true,
    };

    if (userId > 0) {
      saveAssessment(userId, result, "credit_team");
    } else {
      saveAssessment(1, result, "credit_team");
    }

    updateWebhookEvent(eventId, "processed", result.assessment_id);

    return {
      event_id: eventId,
      msme_id: payload.msme_id,
      status: "processed",
      assessment_id: result.assessment_id,
      borrower_segment: thinFile.segment,
      overall_score: result.overall_score,
      message: `Reassessment complete — FHS ${result.overall_score} (${thinFile.segment})`,
      processed_at: processedAt,
    };
  } catch (e) {
    updateWebhookEvent(eventId, "failed");
    return {
      event_id: eventId,
      msme_id: payload.msme_id,
      status: "failed",
      message: String(e),
      processed_at: processedAt,
    };
  }
}
