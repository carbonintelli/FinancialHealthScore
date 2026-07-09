import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../hooks/useAuth";
import { PageHeader } from "../../components/PageHeader";
import { ScoreHero } from "../../components/ScoreHero";

interface QuickAssessResult {
  assessment_id: string;
  overall_score: number;
  grade: string;
  overall_risk_level: string;
  metadata?: {
    borrower_segment?: { segment?: string; is_thin_file?: boolean };
  };
}

interface LoanSubmitResult {
  application_ref: string;
}

export function MsmeAssessPage() {
  const { user } = useAuth();
  const isViewer = user?.role === "msme_viewer";

  const [assessing, setAssessing] = useState(false);
  const [altAssessing, setAltAssessing] = useState(false);
  const [result, setResult] = useState<QuickAssessResult | null>(null);
  const [assessError, setAssessError] = useState("");
  const [lastAssessmentId, setLastAssessmentId] = useState<string | null>(null);

  const [loanType, setLoanType] = useState("working_capital");
  const [amount, setAmount] = useState(2500000);
  const [tenure, setTenure] = useState(36);
  const [purpose, setPurpose] = useState("");
  const [loanMsg, setLoanMsg] = useState<ReactNode>(null);
  const [loanSubmitting, setLoanSubmitting] = useState(false);

  async function handleQuickAssess() {
    setAssessing(true);
    setAssessError("");
    setResult(null);
    try {
      const r = await api<QuickAssessResult>("/api/v1/msme/assess/quick", { method: "POST" });
      setResult(r);
      setLastAssessmentId(r.assessment_id);
    } catch (err) {
      setAssessError(err instanceof Error ? err.message : "Credit assessment failed");
    } finally {
      setAssessing(false);
    }
  }

  async function handleAlternateDataAssess() {
    setAltAssessing(true);
    setAssessError("");
    setResult(null);
    try {
      const r = await api<QuickAssessResult>("/api/v1/msme/assess/alternate-data", {
        method: "POST",
        body: JSON.stringify({
          include_aa: true,
          include_upi: true,
          include_epfo: true,
          thin_file_mode: true,
          borrower_segment: "NTC_NTB",
        }),
      });
      setResult(r);
      setLastAssessmentId(r.assessment_id);
    } catch (err) {
      setAssessError(err instanceof Error ? err.message : "Alternate-data assessment failed");
    } finally {
      setAltAssessing(false);
    }
  }

  async function handleLoanSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoanSubmitting(true);
    setLoanMsg(null);
    try {
      const res = await api<LoanSubmitResult>("/api/v1/msme/loans", {
        method: "POST",
        body: JSON.stringify({
          loan_type: loanType,
          amount_inr: amount,
          tenure_months: tenure,
          purpose,
          assessment_id: lastAssessmentId,
        }),
      });
      setLoanMsg(
        <div className="alert alert-success">
          Credit application <strong>{res.application_ref}</strong> submitted successfully.
        </div>,
      );
    } catch (err) {
      setLoanMsg(
        <div className="alert alert-error">{err instanceof Error ? err.message : "Application submission failed"}</div>,
      );
    } finally {
      setLoanSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Credit Assessment"
        subtitle="Generate your Financial Health Score with AI-assisted credit analytics"
      />

      <div className="card">
        <div className="card-header">
          <h3>Credit Assessment</h3>
        </div>
        <p className="card-desc">
          Initiate a 20-dimension Financial Health Score assessment with Carbon Intelligence enrichment,
          alternate data (GST, UPI, AA, EPFO), and AI-assisted credit analytics.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-accent btn-lg"
            onClick={handleQuickAssess}
            disabled={assessing || altAssessing || isViewer}
          >
            {assessing ? "Initiating credit assessment…" : "Initiate Credit Assessment"}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleAlternateDataAssess}
            disabled={assessing || altAssessing || isViewer}
          >
            {altAssessing ? "Aggregating alternate data…" : "NTC/NTB Alternate-Data Assessment"}
          </button>
        </div>
        {isViewer && (
          <p className="card-desc" style={{ marginTop: ".75rem" }}>
            Read-only access: credit assessment initiation is not permitted for Enterprise Viewer accounts.
          </p>
        )}
        <div style={{ marginTop: "1.5rem" }}>
          {assessing && (
            <div className="alert alert-info">
              Initiating 20-dimension credit assessment with AI orchestration…
            </div>
          )}
          {altAssessing && (
            <div className="alert alert-info">
              Aggregating GST, UPI, Account Aggregator, and EPFO data for thin-file scoring…
            </div>
          )}
          {assessError && <div className="alert alert-error">{assessError}</div>}
          {result && (
            <>
              <ScoreHero
                score={result.overall_score}
                grade={result.grade}
                riskLevel={result.overall_risk_level}
                title="Credit Assessment Complete"
                subtitle="Multi-phase AI orchestration across enrichment, dimensional analysis, risk synthesis & reporting"
              >
                <Link className="btn btn-primary" to={`/msme/report?id=${result.assessment_id}`}>
                  View Credit Assessment Report
                </Link>
              </ScoreHero>
              <div className="alert alert-success" style={{ marginTop: "1rem" }}>
                Assessment Reference: <code>{result.assessment_id}</code>
                {result.metadata?.borrower_segment?.segment && (
                  <>
                    {" "}
                    · Borrower segment: <strong>{result.metadata.borrower_segment.segment}</strong>
                    {result.metadata.borrower_segment.is_thin_file ? " (thin-file scoring)" : ""}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isViewer && (
        <div className="card">
          <div className="card-header">
            <h3>Credit Facility Application</h3>
          </div>
          <p className="card-desc">
            Submit a credit facility application to IDBI Bank upon completion of your credit assessment.
          </p>
          <form onSubmit={handleLoanSubmit}>
            <div className="form-group">
              <label>Facility Type</label>
              <select value={loanType} onChange={(e) => setLoanType(e.target.value)}>
                <option value="working_capital">Working Capital Facility</option>
                <option value="term_loan">Term Loan</option>
                <option value="equipment_finance">Equipment Finance</option>
                <option value="green_finance">Green / ESG-Linked Finance</option>
              </select>
            </div>
            <div className="form-group">
              <label>Sanction Amount (INR)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={100000}
                step={50000}
                required
              />
            </div>
            <div className="form-group">
              <label>Repayment Tenure (months)</label>
              <input
                type="number"
                value={tenure}
                onChange={(e) => setTenure(Number(e.target.value))}
                min={6}
                max={120}
                required
              />
            </div>
            <div className="form-group">
              <label>Facility Purpose</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
                placeholder="Describe the intended use of credit facility…"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loanSubmitting}>
              {loanSubmitting ? "Submitting application…" : "Submit Credit Application to IDBI Bank"}
            </button>
          </form>
          {loanMsg && <div style={{ marginTop: "1rem" }}>{loanMsg}</div>}
        </div>
      )}
    </>
  );
}
