import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { formatInr, formatDate } from "../../lib/format";
import { formatLoanStatus, formatLoanType } from "../../lib/terminology";
import type { LoanApplication } from "../../api/types";

function statusBadgeClass(status: string) {
  if (status === "approved" || status === "disbursed") return "low";
  if (status === "rejected") return "critical";
  return "moderate";
}

export function BankLoansPage() {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api<LoanApplication[]>("/api/v1/bank/loans")
      .then(setLoans)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load credit applications"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: number, status: string) {
    const notes = prompt("Credit officer remarks (optional):") || "";
    try {
      await api(`/api/v1/bank/loans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewer_notes: notes }),
      });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status update failed");
    }
  }

  if (loading && !loans.length) {
    return <div className="loading-pulse" style={{ minHeight: 200 }} />;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <>
      <PageHeader
        title="Credit Applications"
        subtitle="Review, sanction, or decline MSME credit facility requests"
      />

      <div className="card">
        {!loans.length ? (
          <div className="empty-state">
            <p>No credit applications on record.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Application Ref.</th>
                  <th>Enterprise</th>
                  <th>Facility Type</th>
                  <th>Amount</th>
                  <th>Tenure</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loans.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <code>{l.application_ref}</code>
                    </td>
                    <td>
                      <strong>{l.business_name}</strong>
                    </td>
                    <td>{formatLoanType(l.loan_type)}</td>
                    <td>{formatInr(l.amount_inr)}</td>
                    <td>{l.tenure_months} mo</td>
                    <td>
                      <span className={`badge badge-${statusBadgeClass(l.status)}`}>
                        {formatLoanStatus(l.status)}
                      </span>
                    </td>
                    <td>{formatDate(l.created_at)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {l.status === "submitted" && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline"
                          onClick={() => updateStatus(l.id, "under_review")}
                        >
                          Begin Review
                        </button>
                      )}
                      {["submitted", "under_review"].includes(l.status) && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-accent"
                            onClick={() => updateStatus(l.id, "approved")}
                          >
                            Sanction
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => updateStatus(l.id, "rejected")}
                          >
                            Decline
                          </button>
                        </>
                      )}
                    </td>
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
