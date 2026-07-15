import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, getToken } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { homePathForUser } from "../api/client";
import { FhsLogo } from "../components/FhsLogo";

type Stakeholder = "bank" | "msme" | "government" | "regulatory";

interface DemoCred {
  email: string;
  password: string;
  role: string;
}

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<Stakeholder>("bank");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demos, setDemos] = useState<Record<Stakeholder, DemoCred[]>>({
    bank: [],
    msme: [],
    government: [],
    regulatory: [],
  });

  useEffect(() => {
    if (getToken() && user) navigate(homePathForUser(user));
  }, [user, navigate]);

  useEffect(() => {
    api<Record<Stakeholder, DemoCred[]>>("/api/v1/auth/demo-credentials").then((data) => {
      setDemos(data);
      if (data.bank[0]) {
        setEmail(data.bank[0].email);
        setPassword(data.bank[0].password);
      }
    });
  }, []);

  useEffect(() => {
    const first = demos[role]?.[0];
    if (first) {
      setEmail(first.email);
      setPassword(first.password);
    }
  }, [role, demos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
      setLoading(false);
    }
  }

  const roleLabels: Record<Stakeholder, string> = {
    bank: "Lending Institution",
    msme: "Enterprise (MSME)",
    government: "Government",
    regulatory: "Regulatory",
  };

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-logo-wrap">
            <FhsLogo size={72} />
            <div>
              <div className="login-brand-title">Financial Health Score</div>
              <p className="login-brand-tagline">
                AI-powered 20-dimension MSME credit intelligence for lending institutions, enterprises, government, and regulators
              </p>
            </div>
          </div>
          <div className="login-competition">IDBI Innovate 2026 · SUSTAINOW TECHNOLOGIES</div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <FhsLogo size={52} className="login-mobile-logo" title="" />
            <h1>Secure Sign In</h1>
            <p className="tagline">Access your authorised stakeholder portal</p>
          </div>

          <div className="role-tabs">
            {(Object.keys(roleLabels) as Stakeholder[]).map((r) => (
              <div key={r} className={`role-tab${role === r ? " active" : ""}`} onClick={() => setRole(r)}>
                {roleLabels[r]}
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: ".25rem" }} disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          {role === "msme" && (
            <p style={{ marginTop: "1rem", textAlign: "center", fontSize: ".9rem" }}>
              New enterprise? <Link to="/msme/register">Register your MSME & obtain your Financial Health Score</Link>
            </p>
          )}

          <div className="demo-creds">
            <strong>Demonstration credentials</strong>
            <div>
              {(demos[role] || []).map((d) => (
                <div key={d.email} className="demo-cred-item">
                  <code>{d.email}</code> · <code>{d.password}</code>
                  <br />
                  <small>{d.role}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
