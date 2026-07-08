/**
 * Collect application snapshots and generate APPLICATION_SNAPSHOTS.md
 * Usage: npm run collect:app-snapshots
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import { initDatabase } from "../src/db/index.js";
import { createApp } from "../src/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "../../docs");
const SNAP_DIR = path.join(DOCS_DIR, "snapshots");

type App = ReturnType<typeof createApp>;

async function login(app: App, email: string, password: string) {
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return res.body.access_token as string;
}

async function get(app: App, p: string, token?: string) {
  const req = request(app).get(p);
  if (token) req.set("Authorization", `Bearer ${token}`);
  const res = await req;
  return res.body;
}

function trimAssessment(a: Record<string, unknown>) {
  return {
    assessment_id: a.assessment_id,
    business_name: a.business_name,
    msme_id: a.msme_id,
    overall_score: a.overall_score,
    grade: a.grade,
    overall_risk_level: a.overall_risk_level,
    overall_confidence: a.overall_confidence,
    created_at: a.generated_at ?? a.created_at,
    dimension_count: Array.isArray(a.dimension_scores) ? a.dimension_scores.length : 20,
  };
}

function trimPortfolioRow(p: Record<string, unknown>) {
  return {
    msme_id: p.msme_id,
    business_name: p.business_name,
    sector: p.sector,
    latest_score: p.latest_score,
    latest_grade: p.latest_grade,
    latest_risk_level: p.latest_risk_level,
    credit_limit_inr: p.credit_limit_inr,
    relationship_manager: p.relationship_manager,
  };
}

function trimLoan(l: Record<string, unknown>) {
  return {
    application_ref: l.application_ref,
    business_name: l.business_name,
    loan_type: l.loan_type,
    amount_inr: l.amount_inr,
    tenure_months: l.tenure_months,
    status: l.status,
    created_at: l.created_at,
  };
}

function mdTable(headers: string[], rows: string[][]) {
  const sep = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function generateMarkdown(data: Record<string, unknown>) {
  const meta = data.meta as Record<string, string>;
  const pub = data.public as Record<string, unknown>;
  const bank = data.bank as Record<string, unknown>;
  const msme = data.msme as Record<string, unknown>;
  const govt = data.govt as Record<string, unknown>;
  const reg = data.regulatory as Record<string, unknown>;
  const routes = data.ui_routes as Record<string, unknown>;

  const demo = trimAssessment(pub.demo_assessment as Record<string, unknown>);
  const bankDash = bank.dashboard as Record<string, number>;
  const msmeDash = msme.dashboard as Record<string, unknown>;
  const govtDash = (govt.dashboard as Record<string, unknown>);
  const regDash = reg.dashboard as Record<string, unknown>;

  const portfolio = (bank.portfolio as Record<string, unknown>[]).slice(0, 5);
  const msmeAssess = (msme.assessments as Record<string, unknown>[]).slice(0, 3);
  const bankLoans = (bank.loans as Record<string, unknown>[]).slice(0, 3);
  const govtMsmes = ((govtDash.msmes as Record<string, unknown>[]) ?? []).slice(0, 5);
  const schemes = (govt.schemes_catalog as { schemes: string[] }).schemes?.slice(0, 8) ?? [];

  return `# Application Snapshots

Live snapshot catalogue of the **Financial Health Score (FHS)** platform — React TypeScript UI routes, stakeholder portals, and representative API payloads.

| | |
|---|---|
| **Generated** | ${meta.generated_at} |
| **Platform** | ${meta.platform} |
| **Stack** | ${meta.stack} |
| **UI base** | \`${meta.ui_base}\` |
| **API base** | \`${meta.base_url}\` |

Machine-readable export: [snapshots/application-snapshots.json](./snapshots/application-snapshots.json)

Regenerate: \`cd server && npm run collect:app-snapshots\`

Related: [PRODUCT_SNAPSHOTS.md](./PRODUCT_SNAPSHOTS.md) (API golden files) · [PLATFORM.md](./PLATFORM.md) · [TERMINOLOGY.md](./TERMINOLOGY.md)

---

## Platform Snapshot

\`\`\`json
${JSON.stringify(pub.health, null, 2)}
\`\`\`

| Capability | Value |
|---|---|
| Scoring dimensions | 20 |
| AI agents (full pipeline) | 27 per assessment |
| Scoring engine | Node.js (default) |
| UI | React 19 + TypeScript SPA |
| Integrations | Mock mode (demo) |

---

## Demo Credentials Snapshot

| Portal | Email | Password | Role |
|---|---|---|---|
| Lending Institution | \`credit@idbi.bank.in\` | \`IDBI@2026\` | Credit Analyst |
| Enterprise (MSME) | \`rajesh@shreeganesh.in\` | \`MSME@2026\` | Enterprise Proprietor |
| Government | \`admin@msme.gov.in\` | \`GOVT@2026\` | Ministry Administrator |
| Regulatory | \`supervisor@rbi.org.in\` | \`REG@2026\` | RBI Supervisory Officer |

Full list: \`GET /api/v1/auth/demo-credentials\`

---

## UI Route Catalogue

### Public routes

| Route | Page | Description |
|---|---|---|
| \`/app/\` | Secure Sign In | Stakeholder authentication with demo credentials |
| \`/app/msme/register\` | MSME Enterprise Registration | 3-step onboarding wizard |

### Lending Institution Portal

| Route | Page | Primary API |
|---|---|---|
| \`/app/bank/dashboard\` | Executive Dashboard | \`GET /api/v1/bank/dashboard\` |
| \`/app/bank/portfolio\` | MSME Lending Portfolio | \`GET /api/v1/bank/portfolio\` |
| \`/app/bank/loans\` | Credit Applications | \`GET /api/v1/bank/loans\` |
| \`/app/bank/report?id=\` | MSME Credit Assessment Report | \`GET /api/v1/reports/{id}\` |

### Enterprise Portal (MSME)

| Route | Page | Primary API |
|---|---|---|
| \`/app/msme/dashboard\` | Enterprise Dashboard | \`GET /api/v1/msme/dashboard\` |
| \`/app/msme/profile\` | Financial Data Submission | \`GET/POST /api/v1/msme/profile\`, \`POST /api/v1/msme/data-feed\` |
| \`/app/msme/import\` | ERP Data Integration | \`POST /api/v1/msme/assess/import\` |
| \`/app/msme/assess\` | Credit Assessment | \`POST /api/v1/msme/assess/quick\` |
| \`/app/msme/report\` | Credit Assessment Report | \`GET /api/v1/reports/{id}\` |
| \`/app/msme/loans\` | Credit Applications | \`GET /api/v1/msme/loans\` |

### Government Portal

| Route | Page | Primary API |
|---|---|---|
| \`/app/govt/dashboard\` | National MSME Dashboard | \`GET /api/v1/govt/dashboard\` |
| \`/app/govt/schemes\` | Scheme Advisory | \`POST /api/v1/govt/schemes/recommend/{msme_id}\` |

### Regulatory Portal

| Route | Page | Primary API |
|---|---|---|
| \`/app/regulatory/dashboard\` | Supervisory Dashboard | \`GET /api/v1/regulatory/dashboard\` |
| \`/app/regulatory/review\` | Compliance Review | \`POST /api/v1/regulatory/review/{msme_id}\` |

---

## Demo MSME — Credit Assessment Snapshot

**Enterprise:** Shree Ganesh Auto Components Pvt Ltd (\`msme-demo-001\`)

\`\`\`json
${JSON.stringify(demo, null, 2)}
\`\`\`

| Metric | Value |
|---|---|
| Financial Health Score (FHS) | **${demo.overall_score}** |
| Credit Grade | **${demo.grade}** |
| Credit Risk Rating | ${demo.overall_risk_level} (Low Credit Risk) |
| Dimensions evaluated | ${demo.dimension_count} |

---

## Lending Institution Portal Snapshots

### Executive Dashboard

\`\`\`json
${JSON.stringify(bankDash, null, 2)}
\`\`\`

| Stat | Value |
|---|---|
| Portfolio MSMEs | ${bankDash.portfolio_count} |
| Portfolio Avg. FHS | ${bankDash.average_score} |
| Assessments (MTD) | ${bankDash.assessments_this_month} |
| Sanctioned (INR) | ₹${(bankDash.approved_loans_inr / 100000).toFixed(1)} L |

### MSME Lending Portfolio (sample)

${mdTable(
  ["Enterprise", "Sector", "FHS", "Grade", "Risk"],
  portfolio.map((p) => [
    String(p.business_name),
    String(p.sector ?? "—"),
    p.latest_score != null ? String(p.latest_score) : "—",
    String(p.latest_grade ?? "—"),
    String(p.latest_risk_level ?? "—"),
  ]),
)}

### Credit Applications (sample)

${mdTable(
  ["Ref.", "Enterprise", "Facility", "Amount", "Status"],
  bankLoans.map((l) => [
    String(l.application_ref),
    String(l.business_name),
    String(l.loan_type),
    `₹${Number(l.amount_inr).toLocaleString("en-IN")}`,
    String(l.status),
  ]),
)}

---

## Enterprise Portal Snapshots

### Enterprise Dashboard

\`\`\`json
${JSON.stringify(msmeDash, null, 2)}
\`\`\`

### Enterprise Profile (sample)

\`\`\`json
${JSON.stringify(msme.profile, null, 2)}
\`\`\`

### Credit Assessment History (sample)

${mdTable(
  ["Date", "FHS", "Grade", "Risk", "Assessment ID"],
  msmeAssess.map((a) => [
    String(a.created_at).slice(0, 10),
    String(a.overall_score),
    String(a.grade),
    String(a.overall_risk_level),
    String(a.assessment_id).slice(0, 8) + "…",
  ]),
)}

### ERP Connectors

${mdTable(
  ["Connector", "Mode"],
  ((msme.connectors as { connectors: { name: string; configured: boolean }[] }).connectors ?? []).map((c) => [
    c.name,
    c.configured ? "Live" : "Demo",
  ]),
)}

---

## Government Portal Snapshots

### National MSME Dashboard

| Stat | Value |
|---|---|
| Registered MSMEs | ${govtDash.registered_msmes} |
| Scheme Applications | ${govtDash.scheme_applications} |
| Portfolio Avg. FHS | ${govtDash.avg_portfolio_score} |

### Registered MSMEs (sample)

${mdTable(
  ["Enterprise", "Sector", "FHS", "Grade"],
  govtMsmes.map((m) => [
    String(m.business_name),
    String(m.sector ?? "—"),
    m.latest_score != null ? String(m.latest_score) : "—",
    String(m.latest_grade ?? "—"),
  ]),
)}

### Schemes Catalogue (sample)

${schemes.map((s) => `- ${s}`).join("\n")}

---

## Regulatory Portal Snapshot

### Supervisory Dashboard

| Stat | Value |
|---|---|
| Pending Reviews | ${regDash.pending_reviews} |
| Elevated-Risk MSMEs | ${(regDash.high_risk_assessments as unknown[])?.length ?? 0} |
| Regulatory Submissions | ${(regDash.submissions as unknown[])?.length ?? 0} |

---

## User Journey Snapshots

\`\`\`mermaid
flowchart LR
    subgraph Public
        LOGIN[Sign In /app/]
        REG[MSME Registration]
    end
    subgraph Enterprise
        ED[Enterprise Dashboard]
        PROF[Financial Data Submission]
        IMP[ERP Integration]
        ASSESS[Credit Assessment]
        REP[Credit Report]
        LOAN[Credit Application]
    end
    subgraph Bank
        BD[Executive Dashboard]
        PORT[Lending Portfolio]
        BLOAN[Credit Applications]
        BREP[Credit Report]
    end
    LOGIN --> ED
    LOGIN --> BD
    REG --> ED
    PROF --> ASSESS
    IMP --> ASSESS
    ASSESS --> REP
    ASSESS --> LOAN
    PORT --> BREP
    LOAN -.-> BLOAN
\`\`\`

---

## Full Route Index

\`\`\`json
${JSON.stringify(routes, null, 2)}
\`\`\`
`;
}

async function main() {
  initDatabase();
  const app = createApp();

  const bankToken = await login(app, "credit@idbi.bank.in", "IDBI@2026");
  const msmeToken = await login(app, "rajesh@shreeganesh.in", "MSME@2026");
  const govtToken = await login(app, "admin@msme.gov.in", "GOVT@2026");
  const regToken = await login(app, "supervisor@rbi.org.in", "REG@2026");

  const demoFull = await get(app, "/api/v1/assess/demo?audience=credit_team");
  const bankPortfolio = await get(app, "/api/v1/bank/portfolio", bankToken);
  const bankAssessments = await get(app, "/api/v1/bank/assessments", bankToken);
  const bankLoans = await get(app, "/api/v1/bank/loans", bankToken);
  const msmeAssessments = await get(app, "/api/v1/msme/assessments", msmeToken);
  const msmeLoans = await get(app, "/api/v1/msme/loans", msmeToken);

  const data = {
    meta: {
      generated_at: new Date().toISOString(),
      platform: "Financial Health Score v2.1.0",
      stack: "Node.js Express API + React TypeScript SPA",
      base_url: "http://localhost:8080",
      ui_base: "/app/",
    },
    public: {
      root: await get(app, "/api"),
      health: await get(app, "/api/v1/health"),
      demo_credentials: await get(app, "/api/v1/auth/demo-credentials"),
      agents_architecture_summary: {
        pattern: "multi-phase agentic orchestration",
        scoring_agents: 20,
        total_agents_per_full_run: 27,
        phases: 7,
      },
      demo_assessment: trimAssessment(demoFull),
      demo_assessment_dimensions: (demoFull.dimension_scores as { dimension: string; score: number; risk_level: string }[]).map(
        (d) => ({ dimension: d.dimension, score: d.score, risk_level: d.risk_level }),
      ),
    },
    bank: {
      dashboard: await get(app, "/api/v1/bank/dashboard", bankToken),
      portfolio: (bankPortfolio as Record<string, unknown>[]).map(trimPortfolioRow),
      assessments: (bankAssessments as Record<string, unknown>[]).slice(0, 10).map(trimAssessment),
      loans: (bankLoans as Record<string, unknown>[]).slice(0, 10).map(trimLoan),
    },
    msme: {
      dashboard: await get(app, "/api/v1/msme/dashboard", msmeToken),
      profile: await get(app, "/api/v1/msme/profile", msmeToken),
      assessments: (msmeAssessments as Record<string, unknown>[]).slice(0, 10).map(trimAssessment),
      data_feeds: await get(app, "/api/v1/msme/data-feeds", msmeToken),
      loans: (msmeLoans as Record<string, unknown>[]).slice(0, 10).map(trimLoan),
      connectors: await get(app, "/api/v1/integrations/connectors", msmeToken),
    },
    govt: {
      dashboard: await get(app, "/api/v1/govt/dashboard", govtToken),
      schemes_catalog: await get(app, "/api/v1/govt/schemes/catalog", govtToken),
    },
    regulatory: {
      dashboard: await get(app, "/api/v1/regulatory/dashboard", regToken),
    },
    ui_routes: {
      sign_in: "/app/",
      msme_register: "/app/msme/register",
      bank: ["/app/bank/dashboard", "/app/bank/portfolio", "/app/bank/loans", "/app/bank/report"],
      msme: [
        "/app/msme/dashboard",
        "/app/msme/profile",
        "/app/msme/import",
        "/app/msme/assess",
        "/app/msme/report",
        "/app/msme/loans",
      ],
      govt: ["/app/govt/dashboard", "/app/govt/schemes"],
      regulatory: ["/app/regulatory/dashboard", "/app/regulatory/review"],
    },
  };

  fs.mkdirSync(SNAP_DIR, { recursive: true });
  const jsonPath = path.join(SNAP_DIR, "application-snapshots.json");
  const mdPath = path.join(DOCS_DIR, "APPLICATION_SNAPSHOTS.md");

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  fs.writeFileSync(mdPath, generateMarkdown(data));

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
