import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, fetchHtmlReport } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { ScoreHero } from "../../components/ScoreHero";
import type { AssessmentSummary } from "../../api/types";

interface ReportDetail {
  overall_score: number;
  grade: string;
  overall_risk_level: string;
  business_name: string;
  executive_summary?: string;
  recommended_improvements?: string[];
}

export function MsmeReportPage() {
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    async function load() {
      try {
        let id = searchParams.get("id");
        if (!id) {
          const list = await api<AssessmentSummary[]>("/api/v1/msme/assessments");
          if (list.length) id = list[0].assessment_id;
        }

        if (!id) {
          if (!cancelled) {
            setEmpty(true);
            setLoading(false);
          }
          return;
        }

        const [detail, url] = await Promise.all([
          api<ReportDetail>(`/api/v1/reports/${id}`),
          fetchHtmlReport(id),
        ]);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }

        blobUrl = url;
        setReport(detail);
        setFrameUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load report");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [searchParams]);

  return (
    <>
      <PageHeader
        title="Financial Health Score Report"
        subtitle="Credit Assessment Report"
        actions={
          <button type="button" className="btn btn-outline" onClick={() => window.print()}>
            Export / Print PDF
          </button>
        }
      />

      {loading && <div className="loading-pulse" style={{ height: 140 }} />}

      {error && <div className="alert alert-error">{error}</div>}

      {empty && (
        <div className="card">
          <div className="empty-state">
            <p>No credit assessment on record.</p>
            <Link className="btn btn-accent" to="/msme/assess" style={{ marginTop: "1rem" }}>
              Initiate Credit Assessment
            </Link>
          </div>
        </div>
      )}

      {report && (
        <div className="card">
          <ScoreHero
            score={report.overall_score}
            grade={report.grade}
            riskLevel={report.overall_risk_level}
            title={report.business_name}
            subtitle={report.executive_summary}
          />
          {(report.recommended_improvements ?? []).slice(0, 5).length > 0 && (
            <>
              <h3 style={{ marginTop: "1.5rem", fontSize: ".95rem", color: "var(--primary)" }}>
                Recommended Credit Improvement Actions
              </h3>
              <ul style={{ marginTop: ".75rem", paddingLeft: "1.25rem", color: "var(--muted)" }}>
                {(report.recommended_improvements ?? []).slice(0, 5).map((item) => (
                  <li key={item} style={{ marginBottom: ".35rem" }}>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {frameUrl && <iframe className="report-frame" src={frameUrl} title="Detailed Credit Assessment Report" />}
    </>
  );
}
