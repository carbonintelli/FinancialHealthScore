import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { PageHeader } from "../../components/PageHeader";

interface SchemesCatalog {
  schemes: string[];
}

interface PolicyAgentResult {
  agent_type: string;
  summary: string;
  recommendations: string[];
  confidence: string;
  used_llm?: boolean;
}

export function GovtSchemesPage() {
  const [searchParams] = useSearchParams();
  const [msmeId, setMsmeId] = useState(searchParams.get("msme") ?? "");
  const [catalog, setCatalog] = useState<string[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [result, setResult] = useState<PolicyAgentResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const param = searchParams.get("msme");
    if (param) setMsmeId(param);
  }, [searchParams]);

  useEffect(() => {
    api<SchemesCatalog>("/api/v1/govt/schemes/catalog")
      .then((d) => setCatalog(d.schemes))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load schemes catalogue"))
      .finally(() => setCatalogLoading(false));
  }, []);

  async function handleRecommend() {
    const id = msmeId.trim();
    if (!id) {
      setError("Enter an MSME Registration ID");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const agent = await api<PolicyAgentResult>(`/api/v1/govt/schemes/recommend/${id}`, { method: "POST" });
      setResult(agent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy advisory failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Government Scheme Advisory"
        subtitle="AI-powered policy analysis & scheme eligibility recommendations"
      />

      <div className="card">
        <div className="card-header">
          <h3>AI Policy & Scheme Advisory</h3>
        </div>
        <p className="card-desc">
          Initiate the Policy Advisory AI agent to obtain eligible government scheme recommendations for a registered
          MSME.
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
        <button type="button" className="btn btn-accent btn-lg" onClick={handleRecommend} disabled={loading}>
          {loading ? "Initiating Policy Advisory…" : "Initiate Policy Advisory"}
        </button>

        {loading && <div className="alert alert-info" style={{ marginTop: "1.5rem" }}>Initiating Policy Advisory Agent…</div>}
        {error && <div className="alert alert-error" style={{ marginTop: "1.5rem" }}>{error}</div>}
        {result && (
          <div style={{ marginTop: "1.5rem" }}>
            <div className="alert alert-success">
              <strong>{result.agent_type}</strong> · {result.confidence} confidence
              {result.used_llm ? " · LLM enhanced" : ""}
            </div>
            <p style={{ margin: "1rem 0", color: "var(--text)" }}>{result.summary}</p>
            <h4 style={{ fontSize: ".9rem", color: "var(--primary)", marginBottom: ".5rem" }}>
              Eligible Scheme Recommendations
            </h4>
            <ul style={{ paddingLeft: "1.25rem", color: "var(--muted)" }}>
              {result.recommendations.map((r) => (
                <li key={r} style={{ marginBottom: ".35rem" }}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Government Schemes Catalogue</h3>
        </div>
        {catalogLoading ? (
          <div className="loading-pulse" />
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            {catalog.map((scheme) => (
              <span key={scheme} className="badge badge-low" style={{ fontSize: ".8rem", padding: ".4rem .75rem" }}>
                {scheme}
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
