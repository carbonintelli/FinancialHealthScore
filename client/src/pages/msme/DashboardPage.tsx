import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { AssessmentSummary, DimensionScore } from "../../api/types";
import { PageHeader } from "../../components/PageHeader";
import { WelcomeBanner } from "../../components/WelcomeBanner";
import { StatCard } from "../../components/StatCard";
import { ScoreHero } from "../../components/ScoreHero";
import { RiskBadge } from "../../components/RiskBadge";
import { DimensionBars } from "../../components/DimensionBars";
import { formatDate, gradeClass } from "../../lib/format";
import { formatRiskLevel } from "../../lib/terminology";
import { useAuth } from "../../hooks/useAuth";

interface MsmeDashboard {
  msme_id: string;
  business_name: string;
  latest_score: number | null;
  latest_grade: string | null;
  latest_risk_level: string | null;
  last_assessed_at: string | null;
  open_loan_applications: number;
  improvement_count: number;
}

interface ReportDetail {
  dimension_scores?: DimensionScore[];
  dimension_breakdown?: DimensionScore[];
}

export function MsmeDashboardPage() {
  const { user } = useAuth();
  const [dash, setDash] = useState<MsmeDashboard | null>(null);
  const [history, setHistory] = useState<AssessmentSummary[]>([]);
  const [dimensions, setDimensions] = useState<DimensionScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [dashboard, assessments] = await Promise.all([
          api<MsmeDashboard>("/api/v1/msme/dashboard"),
          api<AssessmentSummary[]>("/api/v1/msme/assessments"),
        ]);
        if (cancelled) return;

        setDash(dashboard);
        setHistory(assessments);

        const latest = assessments[0];
        if (latest) {
          try {
            const full = await api<ReportDetail>(`/api/v1/reports/${latest.assessment_id}`);
            if (!cancelled) {
              setDimensions(full.dimension_scores ?? full.dimension_breakdown ?? []);
            }
          } catch {
            /* dimension breakdown is optional */
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <>
        <PageHeader title="Enterprise Dashboard" subtitle="Loading credit intelligence…" />
        <div className="loading-pulse" style={{ height: 120 }} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Enterprise Dashboard" subtitle="Financial Health & credit overview" />
        <div className="alert alert-error">{error}</div>
      </>
    );
  }

  if (!dash) return null;

  const riskElevated = ["elevated", "high", "critical"].includes(dash.latest_risk_level ?? "");

  return (
    <>
      <PageHeader
        title={dash.business_name}
        subtitle={`Udyam / MSME ID: ${dash.msme_id || user?.msme_id || "—"}`}
        badge={dash.latest_grade ? <span className={gradeClass(dash.latest_grade)}>{dash.latest_grade}</span> : undefined}
      />
      <WelcomeBanner portal="msme" />

      <div className="stats-grid">
        <StatCard
          label="Latest FHS"
          value={dash.latest_score != null ? dash.latest_score.toFixed(1) : "—"}
          icon="score"
          variant={dash.latest_score != null && dash.latest_score >= 70 ? "success" : ""}
        />
        <StatCard label="Credit Grade" value={dash.latest_grade ?? "—"} icon="check" />
        <StatCard
          label="Credit Risk Rating"
          value={dash.latest_risk_level ? formatRiskLevel(dash.latest_risk_level) : "—"}
          icon="risk"
          variant={riskElevated ? "risk" : ""}
        />
        <StatCard label="Open Credit Applications" value={dash.open_loan_applications} icon="loans" />
        <StatCard label="Improvement Actions" value={dash.improvement_count} icon="trend" />
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Financial Health Score (FHS)</h3>
        </div>
        {dash.latest_score != null ? (
          <ScoreHero
            score={dash.latest_score}
            grade={dash.latest_grade}
            riskLevel={dash.latest_risk_level}
            title="Financial Health Score (FHS)"
            subtitle={`Last assessed ${formatDate(dash.last_assessed_at)} · 20 dimensions evaluated with AI-assisted credit analytics`}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem", marginTop: ".5rem" }}>
              <Link className="btn btn-primary" to="/msme/report">
                View Credit Assessment Report
              </Link>
              <Link className="btn btn-outline" to="/msme/assess">
                Initiate New Assessment
              </Link>
            </div>
          </ScoreHero>
        ) : (
          <div className="empty-state">
            <h4>No credit assessment on record</h4>
            <p style={{ marginBottom: "1rem" }}>
              Initiate your first 20-dimension Financial Health Score assessment to unlock credit insights and facility
              applications.
            </p>
            <Link className="btn btn-accent btn-lg" to="/msme/assess">
              Initiate Credit Assessment
            </Link>
          </div>
        )}
      </div>

      {dimensions.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3>Dimensional Credit Analysis</h3>
          </div>
          <DimensionBars dimensions={dimensions} />
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>Credit Assessment History</h3>
        </div>
        {!history.length ? (
          <p className="card-desc">No credit assessment history on record.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Assessment Date</th>
                  <th>FHS</th>
                  <th>Credit Grade</th>
                  <th>Risk Rating</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {history.map((a) => (
                  <tr key={a.assessment_id}>
                    <td>{formatDate(a.created_at)}</td>
                    <td>
                      <span className="score-cell">{a.overall_score.toFixed(1)}</span>
                    </td>
                    <td>
                      <span className={gradeClass(a.grade)}>{a.grade}</span>
                    </td>
                    <td>
                      <RiskBadge level={a.overall_risk_level} />
                    </td>
                    <td>
                      <Link className="btn btn-sm btn-primary" to={`/msme/report?id=${a.assessment_id}`}>
                        View Report
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
