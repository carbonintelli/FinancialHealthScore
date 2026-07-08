import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { RiskBadge } from "../../components/RiskBadge";
import { formatInr, gradeClass } from "../../lib/format";

interface PortfolioItem {
  msme_id: string;
  business_name: string;
  sector: string;
  relationship_manager: string | null;
  credit_limit_inr: number | null;
  latest_score: number | null;
  latest_grade: string | null;
  latest_risk_level: string | null;
}

interface AssessResult {
  assessment_id: string;
}

export function BankPortfolioPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState<string | null>(null);

  useEffect(() => {
    api<PortfolioItem[]>("/api/v1/bank/portfolio")
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load portfolio"))
      .finally(() => setLoading(false));
  }, []);

  async function initiateAssessment(msmeId: string, businessName: string) {
    if (!confirm(`Initiate credit assessment for ${businessName}?`)) return;
    setAssessing(msmeId);
    try {
      const result = await api<AssessResult>(`/api/v1/bank/assess/${msmeId}`, { method: "POST" });
      navigate(`/bank/report?id=${result.assessment_id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setAssessing(null);
    }
  }

  if (loading) {
    return <div className="loading-pulse" style={{ minHeight: 200 }} />;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <>
      <PageHeader
        title="MSME Lending Portfolio"
        subtitle="Assess creditworthiness and manage borrower relationships across your lending book"
      />

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Enterprise</th>
                <th>Sector</th>
                <th>FHS</th>
                <th>Credit Grade</th>
                <th>Risk Rating</th>
                <th>Sanctioned Limit</th>
                <th>RM</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.msme_id}>
                  <td>
                    <strong>{p.business_name}</strong>
                    <br />
                    <small style={{ color: "var(--muted)" }}>{p.msme_id}</small>
                  </td>
                  <td>{p.sector}</td>
                  <td>
                    {p.latest_score != null ? (
                      <span className="score-cell">{p.latest_score.toFixed(1)}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {p.latest_grade ? (
                      <span className={gradeClass(p.latest_grade)}>{p.latest_grade}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <RiskBadge level={p.latest_risk_level} />
                  </td>
                  <td>{formatInr(p.credit_limit_inr)}</td>
                  <td>{p.relationship_manager || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-accent"
                      disabled={assessing === p.msme_id}
                      onClick={() => initiateAssessment(p.msme_id, p.business_name)}
                    >
                      {assessing === p.msme_id ? "Assessing…" : "Initiate Assessment"}
                    </button>
                    {p.latest_score != null && (
                      <Link to={`/bank/report?msme=${p.msme_id}`} className="btn btn-sm btn-outline" style={{ marginLeft: ".35rem" }}>
                        Credit Report
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
