import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";

interface AgentReview {
  agent_type: string;
  summary: string;
  recommendations: string[];
  structured_output?: Record<string, unknown>;
}

interface ReviewResponse {
  submission_ref: string;
  agent_review: AgentReview;
}

export function RegulatoryReviewPage() {
  const [searchParams] = useSearchParams();
  const [msmeId, setMsmeId] = useState(searchParams.get("msme") ?? "");
  const [result, setResult] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const param = searchParams.get("msme");
    if (param) setMsmeId(param);
  }, [searchParams]);

  async function handleReview() {
    const id = msmeId.trim();
    if (!id) {
      setError("Enter an MSME Registration ID");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api<ReviewResponse>(`/api/v1/regulatory/review/${id}`, { method: "POST" });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compliance review failed");
    } finally {
      setLoading(false);
    }
  }

  const agent = result?.agent_review;

  return (
    <>
      <PageHeader
        title="Regulatory Compliance Review"
        subtitle="AI-assisted supervisory review and statutory compliance flagging"
      />

      <div className="card">
        <div className="card-header">
          <h3>AI Regulatory Compliance Review</h3>
        </div>
        <p className="card-desc">
          Initiate the Regulatory Compliance agent to review MSME credit assessments under RBI, GSTN, or MCA
          supervisory jurisdiction.
        </p>
        <div className="form-group">
          <label htmlFor="msme-id">MSME Registration ID</label>
          <input
            id="msme-id"
            type="text"
            value={msmeId}
            onChange={(e) => setMsmeId(e.target.value)}
            placeholder="msme-demo-001"
          />
        </div>
        <button type="button" className="btn btn-primary btn-lg" onClick={handleReview} disabled={loading}>
          {loading ? "Initiating Compliance Review…" : "Initiate Compliance Review"}
        </button>

        {loading && (
          <div className="alert alert-info" style={{ marginTop: "1.5rem" }}>
            Initiating Regulatory Compliance Agent…
          </div>
        )}
        {error && <div className="alert alert-error" style={{ marginTop: "1.5rem" }}>{error}</div>}
        {result && agent && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="alert alert-success">
              Regulatory submission <strong>{result.submission_ref}</strong> recorded
            </div>
            <p style={{ margin: "1rem 0" }}>
              <strong>{agent.agent_type}</strong> — {agent.summary}
            </p>
            <h4 style={{ fontSize: ".9rem", color: "var(--primary)" }}>Supervisory Recommendations</h4>
            <ul style={{ margin: ".5rem 0 1rem", paddingLeft: "1.25rem", color: "var(--muted)" }}>
              {agent.recommendations.map((r) => (
                <li key={r} style={{ marginBottom: ".35rem" }}>
                  {r}
                </li>
              ))}
            </ul>
            {agent.structured_output && (
              <pre
                style={{
                  background: "#f8fafc",
                  padding: "1rem",
                  borderRadius: "var(--radius-sm)",
                  fontSize: ".82rem",
                  border: "1px solid var(--border)",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(agent.structured_output, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </>
  );
}
