import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { StatCard } from "../../components/StatCard";
import { formatDate } from "../../lib/format";
import { formatDataSource, formatFeedStatus } from "../../lib/terminology";

interface AccountingData {
  revenue_inr?: number;
  net_profit_inr?: number;
  current_assets_inr?: number;
  current_liabilities_inr?: number;
  total_debt_inr?: number;
}

interface MsmeProfile {
  business_name: string;
  sector: string;
  msme_id: string;
  data_completeness_pct: number;
  last_feed_at?: string | null;
  gstin?: string | null;
  udyam_number?: string | null;
  financial_data?: { accounting?: AccountingData };
}

interface DataFeed {
  created_at: string;
  source: string;
  status: string;
  assessment_id?: string | null;
}

interface DataFeedResponse {
  assessment?: { overall_score?: number; grade?: string };
}

export function MsmeProfilePage() {
  const [profile, setProfile] = useState<MsmeProfile | null>(null);
  const [feeds, setFeeds] = useState<DataFeed[]>([]);
  const [profileError, setProfileError] = useState("");
  const [feedResult, setFeedResult] = useState<ReactNode>(null);
  const [submitting, setSubmitting] = useState(false);

  const [source, setSource] = useState("manual");
  const [revenue, setRevenue] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [currentAssets, setCurrentAssets] = useState(0);
  const [currentLiabilities, setCurrentLiabilities] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [runAssessment, setRunAssessment] = useState(true);

  async function loadProfile() {
    try {
      const p = await api<MsmeProfile>("/api/v1/msme/profile");
      setProfile(p);
      setProfileError("");
      const acct = p.financial_data?.accounting;
      if (acct?.revenue_inr) setRevenue(acct.revenue_inr);
      if (acct?.net_profit_inr) setNetProfit(acct.net_profit_inr);
      if (acct?.current_assets_inr) setCurrentAssets(acct.current_assets_inr);
      if (acct?.current_liabilities_inr) setCurrentLiabilities(acct.current_liabilities_inr);
      if (acct?.total_debt_inr) setTotalDebt(acct.total_debt_inr);
    } catch {
      setProfileError("Complete your enterprise profile by submitting financial data below.");
    }
  }

  async function loadFeeds() {
    const data = await api<{ feeds: DataFeed[] }>("/api/v1/msme/data-feeds");
    setFeeds(data.feeds ?? []);
  }

  useEffect(() => {
    loadProfile().catch(() => undefined);
    loadFeeds().catch(() => undefined);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFeedResult(null);
    try {
      const res = await api<DataFeedResponse>("/api/v1/msme/data-feed", {
        method: "POST",
        body: JSON.stringify({
          source,
          run_assessment: runAssessment,
          financial_data: {
            accounting: {
              revenue_inr: revenue,
              cost_of_goods_inr: revenue * 0.65,
              operating_expenses_inr: revenue * 0.2,
              current_assets_inr: currentAssets,
              current_liabilities_inr: currentLiabilities,
              total_debt_inr: totalDebt,
              equity_inr: revenue * 0.35,
              net_profit_inr: netProfit || revenue * 0.1,
              period_end: "2026-03-31",
            },
          },
        }),
      });
      const a = res.assessment;
      setFeedResult(
        a ? (
          <div className="alert alert-success">
            Financial data received. Financial Health Score:{" "}
            <strong>{a.overall_score?.toFixed?.(1) ?? a.overall_score}</strong> · Credit Grade {a.grade}
          </div>
        ) : (
          <div className="alert alert-success">Financial data submission recorded.</div>
        ),
      );
      await loadProfile();
      await loadFeeds();
    } catch (err) {
      setFeedResult(
        <div className="alert alert-error">{err instanceof Error ? err.message : "Submission failed"}</div>,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Enterprise Profile & Financial Data"
        subtitle="Maintain current financial statements for accurate credit assessment"
      />

      <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
        {profileError ? (
          <div className="alert alert-warn">{profileError}</div>
        ) : profile ? (
          <>
            <StatCard
              label="Registered Enterprise"
              value={<span style={{ fontSize: "1rem" }}>{profile.business_name}</span>}
              trend={`${profile.sector.replace(/_/g, " ")} · ${profile.msme_id}`}
            />
            <StatCard
              label="Profile completeness"
              value={`${profile.data_completeness_pct}%`}
              trend={`Last submission: ${profile.last_feed_at ? formatDate(profile.last_feed_at) : "—"}`}
            />
            <StatCard
              label="GSTIN"
              value={<span style={{ fontSize: "1rem" }}>{profile.gstin || "—"}</span>}
              trend={`Udyam: ${profile.udyam_number || "—"}`}
            />
          </>
        ) : (
          <div className="loading-pulse" />
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Submit Financial Data</h3>
        </div>
        <p className="card-desc">
          Update your financial statements to recalculate your Financial Health Score. All submissions are logged for
          audit and linked to credit assessments.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Data source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="manual">Manual Financial Entry</option>
              <option value="tally">Tally ERP Integration</option>
              <option value="zoho">Zoho Books Integration</option>
              <option value="bank_statement">Bank Statement Upload</option>
            </select>
          </div>
          <div className="form-group">
            <label>Revenue from operations (INR)</label>
            <input
              type="number"
              value={revenue || ""}
              onChange={(e) => setRevenue(Number(e.target.value))}
              min={100000}
              step={100000}
              required
            />
          </div>
          <div className="form-group">
            <label>Net profit after tax (INR)</label>
            <input
              type="number"
              value={netProfit || ""}
              onChange={(e) => setNetProfit(Number(e.target.value))}
              min={0}
              step={50000}
            />
          </div>
          <div className="form-group">
            <label>Current assets (INR)</label>
            <input
              type="number"
              value={currentAssets || ""}
              onChange={(e) => setCurrentAssets(Number(e.target.value))}
              min={0}
              step={50000}
            />
          </div>
          <div className="form-group">
            <label>Current liabilities (INR)</label>
            <input
              type="number"
              value={currentLiabilities || ""}
              onChange={(e) => setCurrentLiabilities(Number(e.target.value))}
              min={0}
              step={50000}
            />
          </div>
          <div className="form-group">
            <label>Total debt (INR)</label>
            <input
              type="number"
              value={totalDebt || ""}
              onChange={(e) => setTotalDebt(Number(e.target.value))}
              min={0}
              step={50000}
            />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".9rem", marginBottom: "1rem" }}>
            <input type="checkbox" checked={runAssessment} onChange={(e) => setRunAssessment(e.target.checked)} />
            Recalculate Financial Health Score after submission
          </label>
          <button type="submit" className="btn btn-accent btn-lg" disabled={submitting}>
            {submitting ? "Submitting financial data…" : "Submit Financial Data"}
          </button>
        </form>
        {feedResult && <div style={{ marginTop: "1.25rem" }}>{feedResult}</div>}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Financial Data Submission Log</h3>
        </div>
        {!feeds.length ? (
          <p className="card-desc">No financial data submissions on record.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Submission Date</th>
                <th>Data Source</th>
                <th>Status</th>
                <th>Assessment Reference</th>
              </tr>
            </thead>
            <tbody>
              {feeds.map((f) => (
                <tr key={`${f.created_at}-${f.source}`}>
                  <td>{new Date(f.created_at).toLocaleString()}</td>
                  <td>{formatDataSource(f.source)}</td>
                  <td>
                    <span className="badge">{formatFeedStatus(f.status)}</span>
                  </td>
                  <td>{f.assessment_id ? `${f.assessment_id.slice(0, 8)}…` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
