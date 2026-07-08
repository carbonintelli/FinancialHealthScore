import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { RiskBadge } from "../../components/RiskBadge";
import { StatCard } from "../../components/StatCard";
import { WelcomeBanner } from "../../components/WelcomeBanner";
import { formatDate } from "../../lib/format";
import { LABELS } from "../../lib/terminology";

interface FlaggedAssessment {
  msme_id: string;
  business_name: string;
  overall_score?: number | null;
  overall_risk_level?: string | null;
  created_at: string;
}

interface RegulatorySubmission {
  submission_ref: string;
  business_name: string;
  regulator_type: string;
  status: string;
  created_at: string;
}

interface RegulatoryDashboardData {
  submissions: RegulatorySubmission[];
  high_risk_assessments: FlaggedAssessment[];
  pending_reviews: number;
}

export function RegulatoryDashboardPage() {
  const [data, setData] = useState<RegulatoryDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<RegulatoryDashboardData>("/api/v1/regulatory/dashboard")
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const flagged = data?.high_risk_assessments ?? [];
  const submissions = data?.submissions ?? [];

  return (
    <>
      <PageHeader
        title="Regulatory Supervisory Dashboard"
        subtitle="RBI · GSTN · MCA compliance & credit risk oversight"
      />
      <WelcomeBanner portal="regulatory" />

      {error && <div className="alert alert-error">{error}</div>}

      <div className="stats-grid">
        <StatCard label="Pending Reviews" value={loading ? "…" : (data?.pending_reviews ?? 0)} icon="review" />
        <StatCard
          label="Elevated-Risk MSMEs"
          value={loading ? "…" : flagged.length}
          icon="risk"
          variant="risk"
        />
        <StatCard label="Regulatory Submissions" value={loading ? "…" : submissions.length} icon="report" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Elevated Credit Risk Assessments</h3>
        </div>
        {loading ? (
          <div className="loading-pulse" />
        ) : flagged.length === 0 ? (
          <div className="empty-state">
            <p>No elevated-risk assessments flagged.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Enterprise</th>
                  <th>{LABELS.fhsShort}</th>
                  <th>Risk Rating</th>
                  <th>Assessment Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {flagged.map((a) => (
                  <tr key={`${a.msme_id}-${a.created_at}`}>
                    <td>
                      <strong>{a.business_name}</strong>
                      <br />
                      <small style={{ color: "var(--muted)" }}>{a.msme_id}</small>
                    </td>
                    <td>
                      {a.overall_score != null ? (
                        <span className="score-cell">{a.overall_score.toFixed(1)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <RiskBadge level={a.overall_risk_level} />
                    </td>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <Link className="btn btn-sm btn-primary" to={`/regulatory/review?msme=${a.msme_id}`}>
                        Compliance Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Regulatory Submission Log</h3>
        </div>
        {loading ? (
          <div className="loading-pulse" />
        ) : submissions.length === 0 ? (
          <div className="empty-state">
            <p>No regulatory submissions on record.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Submission Ref.</th>
                  <th>Enterprise</th>
                  <th>Regulator</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {submissions.slice(0, 10).map((s) => (
                  <tr key={s.submission_ref}>
                    <td>
                      <code>{s.submission_ref}</code>
                    </td>
                    <td>{s.business_name}</td>
                    <td>{s.regulator_type.toUpperCase()}</td>
                    <td>
                      <RiskBadge level={s.status === "reviewed" ? "low" : "elevated"} />
                    </td>
                    <td>{formatDate(s.created_at)}</td>
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
