import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { ScoreHero } from "../../components/ScoreHero";
import { formatInrShort } from "../../lib/format";

type Connector = "tally" | "zoho";

interface ConnectorInfo {
  name: string;
  configured: boolean;
  description: string;
}

interface ImportAccounting {
  revenue_inr: number;
  net_profit_inr: number;
}

interface ImportResult {
  source: string;
  mock?: boolean;
  period_label: string;
  financial_data: {
    accounting: ImportAccounting;
    cash_flows: unknown[];
  };
}

interface SustainabilityReport {
  sustainability_score: number;
  grade: string;
  carbon_footprint: {
    total_emissions_tco2e?: number;
    carbon_intensity_kg_per_revenue?: number;
  };
  reporting: { readiness?: string };
  recommendations: string[];
}

interface PreviewResponse {
  import_result: ImportResult;
  sustainability_report?: SustainabilityReport;
}

interface ImportAssessResponse extends PreviewResponse {
  assessment: {
    assessment_id: string;
    overall_score: number;
    grade: string;
    overall_risk_level: string;
  };
}

export function MsmeImportPage() {
  const [connector, setConnector] = useState<Connector>("tally");
  const [periodEnd, setPeriodEnd] = useState("2026-03-31");
  const [includeCi, setIncludeCi] = useState(true);
  const [connectors, setConnectors] = useState<ConnectorInfo[]>([]);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [assessResult, setAssessResult] = useState<ImportAssessResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [assessLoading, setAssessLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ connectors: ConnectorInfo[] }>("/api/v1/integrations/connectors")
      .then((data) => setConnectors(data.connectors ?? []))
      .catch(() => undefined);
  }, []);

  async function runPreview() {
    setPreviewLoading(true);
    setError("");
    try {
      const data = await api<PreviewResponse>("/api/v1/msme/assess/import/preview", {
        method: "POST",
        body: JSON.stringify({
          connector,
          include_carbon_intelligence: includeCi,
          options: { to_date: periodEnd },
        }),
      });
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function runImportAssess() {
    setAssessLoading(true);
    setError("");
    setAssessResult(null);
    try {
      const data = await api<ImportAssessResponse>("/api/v1/msme/assess/import", {
        method: "POST",
        body: JSON.stringify({
          connector,
          include_carbon_intelligence: includeCi,
          options: { to_date: periodEnd },
        }),
      });
      setPreview(data);
      setAssessResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import assessment failed");
    } finally {
      setAssessLoading(false);
    }
  }

  function renderPreviewContent(data: PreviewResponse) {
    const imp = data.import_result;
    const acc = imp.financial_data.accounting;
    const sus = data.sustainability_report;

    return (
      <>
        <div className="alert alert-info">
          Imported from <strong>{imp.source.toUpperCase()}</strong>
          {imp.mock ? " (demo mode)" : ""} · {imp.period_label}
        </div>
        <div className="stats-grid" style={{ marginTop: "1rem" }}>
          <StatCard label="Revenue" value={formatInrShort(acc.revenue_inr)} icon="trend" />
          <StatCard label="Net Profit" value={formatInrShort(acc.net_profit_inr)} icon="score" />
          <StatCard label="Cash Flow Months" value={imp.financial_data.cash_flows.length} icon="assess" />
          {sus && (
            <StatCard
              label="Sustainability"
              value={`${sus.sustainability_score} / ${sus.grade}`}
              icon="check"
              variant="success"
            />
          )}
        </div>
        {sus && (
          <>
            <h4 style={{ margin: "1.25rem 0 .5rem", fontSize: ".9rem", color: "var(--primary)" }}>
              Carbon Footprint (ci.sustainow.in)
            </h4>
            <p style={{ color: "var(--muted)", fontSize: ".88rem" }}>
              {sus.carbon_footprint.total_emissions_tco2e ?? "—"} tCO₂e total · Intensity{" "}
              {sus.carbon_footprint.carbon_intensity_kg_per_revenue ?? "—"} kg/₹ · Reporting:{" "}
              {sus.reporting.readiness ?? "—"}
            </p>
            <ul style={{ marginTop: ".75rem", paddingLeft: "1.25rem", color: "var(--muted)", fontSize: ".85rem" }}>
              {sus.recommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="ERP Data Integration & Assessment"
        subtitle="Tally ERP · Zoho Books · Sustainow Carbon Intelligence"
      />

      <div className="welcome-banner" style={{ marginBottom: "1.5rem" }}>
        <div className="welcome-banner-glow" />
        <div className="welcome-banner-content">
          <h2>ERP Integration & Credit Assessment</h2>
          <p>
            Connect Tally ERP or Zoho Books, enrich with Sustainow Carbon Intelligence (ci.sustainow.in), and compute
            your 20-dimension Financial Health Score.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Accounting System Connector</h3>
        </div>
        <p className="card-desc">Select your enterprise resource planning (ERP) system to import financial statements.</p>
        <div className="role-tabs" style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "1.25rem" }}>
          {(["tally", "zoho"] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={`role-tab${connector === c ? " active" : ""}`}
              onClick={() => setConnector(c)}
            >
              {c === "tally" ? "Tally ERP" : "Zoho Books"}
            </button>
          ))}
        </div>
        <div className="form-group">
          <label>Financial year / period end</label>
          <input type="text" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} placeholder="YYYY-MM-DD" />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".9rem", marginBottom: "1rem" }}>
          <input type="checkbox" checked={includeCi} onChange={(e) => setIncludeCi(e.target.checked)} />
          Include Sustainow carbon footprint & sustainability intelligence report
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
          <button type="button" className="btn btn-outline" onClick={runPreview} disabled={previewLoading}>
            {previewLoading ? "Loading preview…" : "Preview Data Import"}
          </button>
          <button type="button" className="btn btn-accent btn-lg" onClick={runImportAssess} disabled={assessLoading}>
            {assessLoading ? "Importing & assessing…" : "Import & Initiate Credit Assessment"}
          </button>
        </div>
        {error && (
          <div className="alert alert-error" style={{ marginTop: "1rem" }}>
            {error}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Available Connectors</h3>
        </div>
        {!connectors.length ? (
          <div className="loading-pulse" />
        ) : (
          <div className="stats-grid">
            {connectors.map((c) => (
              <div key={c.name} className={`stat-card${c.configured ? " stat-success" : ""}`}>
                <div className="stat-body">
                  <div className="stat-label">{c.name}</div>
                  <div className="stat-value" style={{ fontSize: "1rem" }}>
                    {c.configured ? "Live" : "Demo"}
                  </div>
                  <div className="stat-trend">{c.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="card">
          <div className="card-header">
            <h3>Import Preview</h3>
          </div>
          {renderPreviewContent(preview)}
        </div>
      )}

      {(assessLoading || assessResult) && (
        <div className="card">
          <div className="card-header">
            <h3>Credit Assessment Result</h3>
          </div>
          {assessLoading && !assessResult ? (
            <div className="alert alert-info">
              Computing 20-dimension Financial Health Score with imported data and Carbon Intelligence…
            </div>
          ) : assessResult ? (
            <>
              <ScoreHero
                score={assessResult.assessment.overall_score}
                grade={assessResult.assessment.grade}
                riskLevel={assessResult.assessment.overall_risk_level}
                title="Financial Health Score (FHS)"
                subtitle={`Data source: ${assessResult.import_result.source.toUpperCase()} + Sustainow CI${
                  assessResult.sustainability_report
                    ? ` · Sustainability Index ${assessResult.sustainability_report.sustainability_score}/100`
                    : ""
                }`}
              >
                <Link
                  className="btn btn-primary"
                  to={`/msme/report?id=${assessResult.assessment.assessment_id}`}
                >
                  View Credit Assessment Report
                </Link>
              </ScoreHero>
              <div className="alert alert-success" style={{ marginTop: "1rem" }}>
                AI-assisted credit assessment complete · Reference:{" "}
                <code>{assessResult.assessment.assessment_id}</code>
              </div>
            </>
          ) : null}
        </div>
      )}
    </>
  );
}
