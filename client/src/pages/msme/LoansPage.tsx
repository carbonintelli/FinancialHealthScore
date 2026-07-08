import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { LoanApplication } from "../../api/types";
import { PageHeader } from "../../components/PageHeader";
import { formatInr, formatDate } from "../../lib/format";
import { formatLoanStatus, formatLoanType } from "../../lib/terminology";

export function MsmeLoansPage() {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api<LoanApplication[]>("/api/v1/msme/loans")
      .then(setLoans)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load applications"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Credit Facility Applications"
        subtitle="Track your credit applications submitted to IDBI Bank"
      />

      <div className="card">
        {loading && <div className="loading-pulse" />}
        {error && <div className="alert alert-error">{error}</div>}
        {!loading && !error && !loans.length && (
          <div className="empty-state">
            <h4>No credit applications on record</h4>
            <p style={{ marginBottom: "1rem" }}>
              Complete a credit assessment, then apply for MSME credit facilities.
            </p>
            <Link className="btn btn-accent" to="/msme/assess">
              Initiate Assessment & Apply
            </Link>
          </div>
        )}
        {!loading && loans.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application Ref.</th>
                  <th>Facility Type</th>
                  <th>Sanction Amount</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Credit Officer Notes</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code>{l.application_ref}</code>
                    </td>
                    <td>{formatLoanType(l.loan_type)}</td>
                    <td>{formatInr(l.amount_inr)}</td>
                    <td>
                      <span className="badge badge-moderate">{formatLoanStatus(l.status)}</span>
                    </td>
                    <td>{formatDate(l.created_at)}</td>
                    <td>{l.reviewer_notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
