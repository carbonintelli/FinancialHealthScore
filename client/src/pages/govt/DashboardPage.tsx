import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { WelcomeBanner } from "../../components/WelcomeBanner";
import { formatDate, gradeClass } from "../../lib/format";
import { LABELS } from "../../lib/terminology";

interface MsmeSummary {
  msme_id: string;
  business_name: string;
  sector?: string | null;
  latest_score?: number | null;
  latest_grade?: string | null;
  last_assessed_at?: string | null;
}

interface GovtDashboardData {
  registered_msmes: number;
  scheme_applications: number;
  avg_portfolio_score: number | null;
  msmes: MsmeSummary[];
}

export function GovtDashboardPage() {
  const [data, setData] = useState<GovtDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<GovtDashboardData>("/api/v1/govt/dashboard")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const msmes = data?.msmes ?? [];

  return (
    <>
      <PageHeader
        title="National MSME Dashboard"
        subtitle="Ministry of MSME · National registry & scheme intelligence"
      />
      <WelcomeBanner portal="govt" />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <StatCard label="Registered MSMEs" value={loading ? "…" : (data?.registered_msmes ?? 0)} icon="users" />
        <StatCard label="Scheme Applications" value={loading ? "…" : (data?.scheme_applications ?? 0)} icon="schemes" />
        <StatCard
          label={`Portfolio Avg. ${LABELS.fhsShort}`}
          value={loading ? "…" : data?.avg_portfolio_score != null ? data.avg_portfolio_score.toFixed(1) : "—"}
          icon="score"
          variant="success"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Registered MSME Portfolio — National Registry</h3>
        </div>
        {loading ? (
          <div className="loading-pulse" />
        ) : msmes.length === 0 ? (
          <div className="empty-state">
            <p>No MSMEs registered in the national registry.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Enterprise</th>
                  <th>Sector</th>
                  <th>{LABELS.fhsShort}</th>
                  <th>Credit Grade</th>
                  <th>Last Assessed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {msmes.map((m) => (
                  <tr key={m.msme_id}>
                    <td>
                      <strong>{m.business_name}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{m.msme_id}</small>
                    </td>
                    <td>{m.sector || "—"}</td>
                    <td>
                      {m.latest_score != null ? (
                        <span className="score-cell">{m.latest_score.toFixed(1)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {m.latest_grade ? (
                        <span className={gradeClass(m.latest_grade)}>{m.latest_grade}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{formatDate(m.last_assessed_at)}</td>
                    <td>
                      <Link className="btn btn-sm btn-accent" to={`/govt/schemes?msme=${m.msme_id}`}>
                        Scheme Advisory
                      </Link>
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
