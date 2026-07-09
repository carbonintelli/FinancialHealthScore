import { getDb } from "../../db/index.js";
import { initiateAaConsent, fetchAaFinancialData, type AaConsentRequest } from "../integrations/alternate-data.js";

export function createAaConsentSession(req: AaConsentRequest) {
  const session = initiateAaConsent(req);
  getDb()
    .prepare(
      `INSERT INTO aa_consent_sessions (session_id, msme_id, consent_handle, status, fi_types, redirect_url, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      session.session_id,
      req.msme_id,
      session.consent_handle,
      session.status,
      JSON.stringify(session.fi_types),
      session.redirect_url,
      session.expires_at,
    );
  return session;
}

export function getAaConsentSession(sessionId: string) {
  return getDb()
    .prepare("SELECT * FROM aa_consent_sessions WHERE session_id = ?")
    .get(sessionId) as
    | {
        session_id: string;
        msme_id: string;
        consent_handle: string;
        status: string;
        fi_types: string;
        redirect_url: string;
        expires_at: string;
        fetched_at: string | null;
      }
    | undefined;
}

export function activateAaConsentSession(sessionId: string) {
  getDb()
    .prepare("UPDATE aa_consent_sessions SET status = 'active' WHERE session_id = ?")
    .run(sessionId);
}

export function fetchAndMarkAaSession(sessionId: string, msmeId: string) {
  const data = fetchAaFinancialData(sessionId, msmeId);
  getDb()
    .prepare("UPDATE aa_consent_sessions SET status = 'active', fetched_at = datetime('now') WHERE session_id = ?")
    .run(sessionId);
  return data;
}

export function listAaSessionsForMsme(msmeId: string) {
  return getDb()
    .prepare(
      "SELECT session_id, msme_id, consent_handle, status, expires_at, fetched_at, created_at FROM aa_consent_sessions WHERE msme_id = ? ORDER BY created_at DESC LIMIT 10",
    )
    .all(msmeId);
}
