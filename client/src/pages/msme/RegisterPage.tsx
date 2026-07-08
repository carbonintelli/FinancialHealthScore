import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setAuth } from "../../api/client";

const STEP_LABELS = ["Account Credentials", "Enterprise Profile", "Financial Statements"];

export function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [sector, setSector] = useState("manufacturing");
  const [udyam, setUdyam] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [state, setState] = useState("maharashtra");
  const [employees, setEmployees] = useState(25);
  const [years, setYears] = useState(5);
  const [turnover, setTurnover] = useState(12000000);
  const [revenue, setRevenue] = useState(12000000);
  const [netProfit, setNetProfit] = useState(1200000);
  const [currentAssets, setCurrentAssets] = useState(3600000);
  const [currentLiabilities, setCurrentLiabilities] = useState(2160000);
  const [totalDebt, setTotalDebt] = useState(3000000);
  const [runAssessment, setRunAssessment] = useState(true);

  function nextStep() {
    if (step === 1 && (!email || password.length < 8)) {
      setError("Enter valid email and password (8+ characters)");
      return;
    }
    if (step === 2 && !businessName.trim()) {
      setError("Registered business name is required");
      return;
    }
    setError("");
    setStep(step + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          business_name: businessName,
          sector,
          udyam_number: udyam || null,
          gstin: gstin || null,
          pan: pan || null,
          state,
          employee_count: employees,
          years_in_operation: years,
          annual_turnover_inr: turnover,
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
              net_profit_inr: netProfit,
              period_end: "2026-03-31",
            },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      setAuth(data.access_token, data.user);
      navigate("/msme/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-logo-wrap">
            <img src="/app/assets/logo.svg" alt="" width={72} height={72} />
            <div>
              <div className="login-brand-title">MSME Enterprise Registration</div>
              <p className="login-brand-tagline">
                Onboard your enterprise, submit statutory and financial data, and obtain your Financial Health Score (FHS).
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-form-panel">
        <div className="login-card" style={{ maxWidth: 520 }}>
          <div className="login-card-header">
            <h1>MSME Enterprise Registration</h1>
            <p className="tagline">
              Step {step} of 3 — {STEP_LABELS[step - 1]}
            </p>
          </div>

          <div className="role-tabs" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginBottom: "1rem" }}>
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={`role-tab${step === i + 1 ? " active" : ""}`}>
                {label}
              </div>
            ))}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <>
                <div className="form-group">
                  <label>Authorised signatory name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Password (min 8 chars)</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="form-group">
                  <label>Registered business name</label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Sector</label>
                  <select value={sector} onChange={(e) => setSector(e.target.value)}>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="auto_components">Auto Components</option>
                    <option value="textiles">Textiles</option>
                    <option value="food_processing">Food Processing</option>
                    <option value="services">Services</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Udyam Registration Number</label>
                  <input value={udyam} onChange={(e) => setUdyam(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>GSTIN</label>
                  <input value={gstin} onChange={(e) => setGstin(e.target.value)} maxLength={15} />
                </div>
                <div className="form-group">
                  <label>PAN</label>
                  <input value={pan} onChange={(e) => setPan(e.target.value)} maxLength={10} />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <select value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="maharashtra">Maharashtra</option>
                    <option value="gujarat">Gujarat</option>
                    <option value="karnataka">Karnataka</option>
                    <option value="tamil_nadu">Tamil Nadu</option>
                    <option value="delhi">Delhi</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Number of employees</label>
                  <input type="number" value={employees} onChange={(e) => setEmployees(Number(e.target.value))} min={1} />
                </div>
                <div className="form-group">
                  <label>Years in operation</label>
                  <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} min={0} step={0.5} />
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="card-desc">Submit your latest financial statements to compute your FHS upon registration.</p>
                <div className="form-group">
                  <label>Annual turnover (INR)</label>
                  <input type="number" value={turnover} onChange={(e) => { setTurnover(Number(e.target.value)); setRevenue(Number(e.target.value)); }} min={100000} step={100000} required />
                </div>
                <div className="form-group">
                  <label>Revenue from operations (INR)</label>
                  <input type="number" value={revenue} onChange={(e) => setRevenue(Number(e.target.value))} min={100000} step={100000} />
                </div>
                <div className="form-group">
                  <label>Net profit after tax (INR)</label>
                  <input type="number" value={netProfit} onChange={(e) => setNetProfit(Number(e.target.value))} min={0} step={50000} />
                </div>
                <div className="form-group">
                  <label>Current assets (INR)</label>
                  <input type="number" value={currentAssets} onChange={(e) => setCurrentAssets(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Current liabilities (INR)</label>
                  <input type="number" value={currentLiabilities} onChange={(e) => setCurrentLiabilities(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Total outstanding debt (INR)</label>
                  <input type="number" value={totalDebt} onChange={(e) => setTotalDebt(Number(e.target.value))} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: ".5rem", fontSize: ".9rem", marginBottom: "1rem" }}>
                  <input type="checkbox" checked={runAssessment} onChange={(e) => setRunAssessment(e.target.checked)} />
                  Initiate credit assessment upon registration
                </label>
              </>
            )}

            <div style={{ display: "flex", gap: ".5rem", marginTop: "1rem" }}>
              {step > 1 && (
                <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)}>
                  Previous
                </button>
              )}
              {step < 3 ? (
                <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={nextStep}>
                  Proceed
                </button>
              ) : (
                <button type="submit" className="btn btn-accent btn-lg" style={{ flex: 1 }} disabled={loading}>
                  {loading ? "Completing registration…" : "Complete Registration & Obtain FHS"}
                </button>
              )}
            </div>
          </form>

          <p style={{ marginTop: "1.25rem", fontSize: ".9rem", textAlign: "center" }}>
            Already registered? <Link to="/">Sign in to Enterprise Portal</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
