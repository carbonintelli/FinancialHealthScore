import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, fetchHtmlReport, openHtmlReport } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { ScoreHero } from "../../components/ScoreHero";
import type { AssessmentSummary } from "../../api/types";

interface BankAssessmentSummary extends AssessmentSummary {
  msme_id: string;
}

interface DetailedReport {
  assessment_id: string;
  business_name: string;
  executive_summary: string;
  overall_score: number;
  grade: string;
  overall_risk_level: string;
  credit_decision_recommendation: string;
}

export function BankReportPage() {
  const [searchParams] = useSearchParams();
  const [report, setReport] = useState<DetailedReport | null>(null);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [assessmentId, setAssessmentId] = useState<string | null>(searchParams.get("id"));

  useEffect(() => {
    let blobUrl: string | null = null;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setReport(null);
      setFrameUrl(null);

      let id = searchParams.get("id");
      const msmeId = searchParams.get("msme");

      try {
        if (!id && msmeId) {
          const list = await api<BankAssessmentSummary[]>("/api/v1/bank/assessments");
          const match = list.find((a) => a.msme_id === msmeId);
          if (match) id = match.assessment_id;
        }

        if (!id) {
          if (!cancelled) setError("No credit assessment selected.");
          return;
        }

        if (!cancelled) setAssessmentId(id);

        const [reportData, htmlUrl] = await Promise.all([
          api<DetailedReport>(`/api/v1/reports/${id}`),
          fetchHtmlReport(id),
        ]);

        if (cancelled) {
          URL.revokeObjectURL(htmlUrl);
          return;
        }

        blobUrl = htmlUrl;
        setReport(reportData);
        setFrameUrl(htmlUrl);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load credit report");
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

  async function handleOpenFullReport() {
    if (!assessmentId) return;
    try {
      await openHtmlReport(assessmentId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to open report");
    }
  }

  return (
    <>
      <PageHeader
        title="MSME Credit Assessment Report"
        actions={
          <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-outline" onClick={() => window.print()}>
              Export / Print
            </button>
            {assessmentId && (
              <button type="button" className="btn btn-primary" onClick={handleOpenFullReport}>
                Open Full Report
              </button>
            )}
          </div>
        }
      />

      <div className="card">
        {loading && <div className="loading-pulse" style={{ height: 140 }} />}
        {error && !loading && (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        )}
        {report && !loading && (
          <>
            <ScoreHero
              score={report.overall_score}
              grade={report.grade}
              riskLevel={report.overall_risk_level}
              title={report.business_name}
              subtitle={report.executive_summary}
            />
            <div className="alert alert-success" style={{ marginTop: "1.25rem" }}>
              <strong>Credit Decision Recommendation:</strong> {report.credit_decision_recommendation}
            </div>
          </>
        )}
      </div>

      {frameUrl && (
        <iframe className="report-frame" src={frameUrl} title="Detailed Credit Assessment Report" />
      )}
    </>
  );
}
