import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { WelcomeBanner } from "../../components/WelcomeBanner";
import { StatCard } from "../../components/StatCard";
import { ScoreHero } from "../../components/ScoreHero";
import { RiskBadge } from "../../components/RiskBadge";
import { formatInr, formatDate, gradeClass } from "../../lib/format";
import { useAuth } from "../../hooks/useAuth";
import type { AssessmentSummary } from "../../api/types";

interface BankDashboardStats {
  portfolio_count: number;
  assessments_this_month: number;
  average_score: number | null;
  high_risk_count: number;
  pending_loans: number;
  approved_loans_inr: number;
}

function portfolioGrade(score: number) {
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";
  return "C+";
}

export function BankDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<BankDashboardStats | null>(null);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api<BankDashboardStats>("/api/v1/bank/dashboard"),
      api<AssessmentSummary[]>("/api/v1/bank/assessments"),
    ])
      .then(([dashboard, list]) => {
        setStats(dashboard);
        setAssessments(list);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="loading-pulse" style={{ minHeight: 200 }} />;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <>
      <PageHeader
        title="Executive Dashboard"
        subtitle={`${user?.organization_name || "Lending Institution"} · MSME Credit & Risk Intelligence`}
      />
      <WelcomeBanner portal="bank" />

      {stats && (
        <div className="stats-grid">
          <StatCard label="Portfolio MSMEs" value={stats.portfolio_count} icon="users" />
          <StatCard
            label="Portfolio Avg. FHS"
            value={stats.average_score ?? "—"}
            icon="score"
            variant="success"
          />
          <StatCard
            label="Elevated Credit Risk"
            value={stats.high_risk_count}
            icon="risk"
            variant={stats.high_risk_count > 0 ? "risk" : ""}
          />
          <StatCard label="Assessments (MTD)" value={stats.assessments_this_month} icon="trend" />
          <StatCard label="Pending Applications" value={stats.pending_loans} icon="loans" />
          <StatCard label="Sanctioned (INR)" value={formatInr(stats.approved_loans_inr)} icon="check" />
        </div>
      )}

      {stats?.average_score != null && (
        <div className="card">
          <div className="card-header">
            <h3>Portfolio Credit Health Overview</h3>
          </div>
          <ScoreHero
            score={stats.average_score}
            grade={portfolioGrade(stats.average_score)}
            riskLevel={stats.high_risk_count > 0 ? "moderate" : "low"}
            title="Portfolio Average FHS"
            subtitle={`Across ${stats.portfolio_count} MSME borrowers · ${stats.high_risk_count} flagged elevated credit risk`}
          >
            <Link to="/bank/portfolio" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              View Lending Portfolio
            </Link>
          </ScoreHero>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Recent Credit Assessments</h3>
          <Link to="/bank/portfolio" className="btn btn-sm btn-outline">
            View Portfolio
          </Link>
        </div>

        {!assessments.length ? (
          <div className="empty-state">
            <p>No credit assessments on record. Initiate one from the Lending Portfolio.</p>
            <Link to="/bank/portfolio" className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Go to Lending Portfolio
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Enterprise</th>
                  <th>FHS</th>
                  <th>Credit Grade</th>
                  <th>Risk Rating</th>
                  <th>Assessment Date</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {assessments.slice(0, 10).map((a) => (
                  <tr key={a.assessment_id}>
                    <td>
                      <strong>{a.business_name}</strong>
                    </td>
                    <td>
                      <span className="score-cell">{a.overall_score.toFixed(1)}</span>
                    </td>
                    <td>
                      <span className={gradeClass(a.grade)}>{a.grade}</span>
                    </td>
                    <td>
                      <RiskBadge level={a.overall_risk_level} />
                    </td>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <Link to={`/bank/report?id=${a.assessment_id}`} className="btn btn-sm btn-primary">
                        Credit Report
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
