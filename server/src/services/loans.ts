import { getDb } from "../db/index.js";

export interface LoanRow {
  id: number;
  application_ref: string;
  msme_id: string;
  business_name: string;
  bank_org_id: number;
  submitted_by_user_id: number;
  assessment_id: string | null;
  loan_type: string;
  amount_inr: number;
  tenure_months: number;
  purpose: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function listLoansForMsme(msmeId: string): LoanRow[] {
  return getDb()
    .prepare("SELECT * FROM loan_applications WHERE msme_id = ? ORDER BY created_at DESC")
    .all(msmeId) as LoanRow[];
}

export function listLoansForBank(bankOrgId: number): LoanRow[] {
  return getDb()
    .prepare("SELECT * FROM loan_applications WHERE bank_org_id = ? ORDER BY created_at DESC")
    .all(bankOrgId) as LoanRow[];
}

export function openLoanCountForMsme(msmeId: string): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM loan_applications
       WHERE msme_id = ? AND status IN ('submitted', 'under_review', 'draft')`
    )
    .get(msmeId) as { c: number };
  return row.c;
}

export function pendingLoanCountForBank(bankOrgId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM loan_applications
       WHERE bank_org_id = ? AND status IN ('submitted', 'under_review')`
    )
    .get(bankOrgId) as { c: number };
  return row.c;
}

export function approvedLoansTotalInr(bankOrgId: number): number {
  const row = getDb()
    .prepare(
      `SELECT COALESCE(SUM(amount_inr), 0) as total FROM loan_applications
       WHERE bank_org_id = ? AND status IN ('approved', 'disbursed')`
    )
    .get(bankOrgId) as { total: number };
  return row.total;
}

export function assessmentsThisMonth(msmeIds: string[]): number {
  if (!msmeIds.length) return 0;
  const placeholders = msmeIds.map(() => "?").join(",");
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as c FROM assessment_records
       WHERE msme_id IN (${placeholders})
       AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
    )
    .get(...msmeIds) as { c: number };
  return row.c;
}

export function unreadNotificationCount(userId: number): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0")
    .get(userId) as { c: number };
  return row.c;
}

export function createNotification(userId: number, title: string, message: string, category = "info"): void {
  getDb()
    .prepare("INSERT INTO notifications (user_id, title, message, category) VALUES (?, ?, ?, ?)")
    .run(userId, title, message, category);
}

export function updateLoanStatus(
  loanId: number,
  bankOrgId: number,
  status: string,
  reviewerNotes: string | null
): LoanRow | null {
  const loan = getDb().prepare("SELECT * FROM loan_applications WHERE id = ?").get(loanId) as LoanRow | undefined;
  if (!loan || loan.bank_org_id !== bankOrgId) return null;

  getDb()
    .prepare(
      `UPDATE loan_applications SET status = ?, reviewer_notes = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .run(status, reviewerNotes, loanId);

  const statusLabel = status.replace(/_/g, " ");
  createNotification(
    loan.submitted_by_user_id,
    `Loan ${loan.application_ref} — ${statusLabel}`,
    reviewerNotes || `Your loan application status is now ${statusLabel}.`,
    "loan"
  );

  return getDb().prepare("SELECT * FROM loan_applications WHERE id = ?").get(loanId) as LoanRow;
}
