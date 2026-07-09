/**
 * Capture UI screenshots for APPLICATION_UI_SNAPSHOTS.md / .html
 * Usage: npm run capture:ui-snapshots
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import { execSync } from "child_process";
import request from "supertest";
import { initDatabase } from "../src/db/index.js";
import { createApp } from "../src/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const IMG_DIR = path.resolve(ROOT, "docs/snapshots/images");
const DOCS_DIR = path.resolve(ROOT, "docs");
const PORT = parseInt(process.env.SNAPSHOT_PORT || "8090", 10);
const BASE = `http://127.0.0.1:${PORT}`;

interface Shot {
  id: string;
  title: string;
  route: string;
  portal: string;
  file: string;
  auth?: { email: string; password: string };
  prepare?: (page: Page) => Promise<void>;
}

const SHOTS: Shot[] = [
  { id: "login", title: "Secure Sign In", route: "/app/", portal: "Public", file: "01-login.png" },
  { id: "register", title: "MSME Enterprise Registration", route: "/app/msme/register", portal: "Public", file: "02-msme-register.png" },
  {
    id: "bank-dashboard",
    title: "Executive Dashboard",
    route: "/app/bank/dashboard",
    portal: "Lending Institution",
    file: "03-bank-dashboard.png",
    auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" },
  },
  {
    id: "bank-portfolio",
    title: "MSME Lending Portfolio",
    route: "/app/bank/portfolio",
    portal: "Lending Institution",
    file: "04-bank-portfolio.png",
    auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" },
  },
  {
    id: "bank-loans",
    title: "Credit Applications",
    route: "/app/bank/loans",
    portal: "Lending Institution",
    file: "05-bank-loans.png",
    auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" },
  },
  {
    id: "bank-report",
    title: "MSME Credit Assessment Report",
    route: "/app/bank/report",
    portal: "Lending Institution",
    file: "06-bank-report.png",
    auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" },
  },
  {
    id: "msme-dashboard",
    title: "Enterprise Dashboard",
    route: "/app/msme/dashboard",
    portal: "Enterprise (MSME)",
    file: "07-msme-dashboard.png",
    auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" },
  },
  {
    id: "msme-profile",
    title: "Financial Data Submission",
    route: "/app/msme/profile",
    portal: "Enterprise (MSME)",
    file: "08-msme-profile.png",
    auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" },
  },
  {
    id: "msme-assess",
    title: "Credit Assessment",
    route: "/app/msme/assess",
    portal: "Enterprise (MSME)",
    file: "09-msme-assess.png",
    auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" },
  },
  {
    id: "msme-import",
    title: "ERP Data Integration",
    route: "/app/msme/import",
    portal: "Enterprise (MSME)",
    file: "10-msme-import.png",
    auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" },
  },
  {
    id: "msme-report",
    title: "Credit Assessment Report",
    route: "/app/msme/report",
    portal: "Enterprise (MSME)",
    file: "11-msme-report.png",
    auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" },
  },
  {
    id: "msme-loans",
    title: "Credit Applications",
    route: "/app/msme/loans",
    portal: "Enterprise (MSME)",
    file: "12-msme-loans.png",
    auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" },
  },
  {
    id: "govt-dashboard",
    title: "National MSME Dashboard",
    route: "/app/govt/dashboard",
    portal: "Government",
    file: "13-govt-dashboard.png",
    auth: { email: "admin@msme.gov.in", password: "GOVT@2026" },
  },
  {
    id: "govt-schemes",
    title: "Scheme Advisory",
    route: "/app/govt/schemes?msme=msme-demo-001",
    portal: "Government",
    file: "14-govt-schemes.png",
    auth: { email: "admin@msme.gov.in", password: "GOVT@2026" },
    prepare: async (page) => {
      const btn = page.getByRole("button", { name: /recommend|advisory|scheme/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(2500);
      }
    },
  },
  {
    id: "regulatory-dashboard",
    title: "Supervisory Dashboard",
    route: "/app/regulatory/dashboard",
    portal: "Regulatory",
    file: "15-regulatory-dashboard.png",
    auth: { email: "supervisor@rbi.org.in", password: "REG@2026" },
  },
  {
    id: "regulatory-review",
    title: "Compliance Review",
    route: "/app/regulatory/review?msme=msme-demo-001",
    portal: "Regulatory",
    file: "16-regulatory-review.png",
    auth: { email: "supervisor@rbi.org.in", password: "REG@2026" },
    prepare: async (page) => {
      const btn = page.getByRole("button", { name: /review|compliance|submit/i });
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(2500);
      }
    },
  },
];

let cachedAssessmentId: string | null = null;

async function getAuthToken(email: string, password: string): Promise<{ token: string; user: object }> {
  initDatabase();
  const app = createApp();
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  if (!res.body.access_token) throw new Error(`Login failed for ${email}`);
  return { token: res.body.access_token, user: res.body.user };
}

async function resolveAssessmentId(): Promise<string> {
  if (cachedAssessmentId) return cachedAssessmentId;
  const { token } = await getAuthToken("credit@idbi.bank.in", "IDBI@2026");
  initDatabase();
  const app = createApp();
  const res = await request(app)
    .get("/api/v1/bank/assessments")
    .set("Authorization", `Bearer ${token}`);
  const list = res.body as { assessment_id: string; msme_id?: string }[];
  const preferred = list.find((a) => a.msme_id === "msme-demo-001") ?? list[0];
  if (!preferred?.assessment_id) throw new Error("No assessment found for report screenshots");
  cachedAssessmentId = preferred.assessment_id;
  return cachedAssessmentId;
}

function resolveRoute(shot: Shot): string {
  if (shot.id === "bank-report" || shot.id === "msme-report") {
    return `${shot.route}?id=${cachedAssessmentId}`;
  }
  return shot.route;
}

async function injectAuth(page: Page, email: string, password: string) {
  const { token, user } = await getAuthToken(email, password);
  await page.goto(`${BASE}/app/`);
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem("fhs_token", token);
      localStorage.setItem("fhs_user", JSON.stringify(user));
    },
    { token, user },
  );
}

async function waitForPage(page: Page, shot: Shot) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForSelector("h1, .page-header, main, .login-card", { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  if (shot.id.includes("report")) {
    await page.waitForTimeout(2000);
  } else {
    await page.waitForTimeout(1000);
  }
}

async function capture(browser: Browser, shot: Shot) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    if (shot.auth) await injectAuth(page, shot.auth.email, shot.auth.password);
    const route = resolveRoute(shot);
    await page.goto(`${BASE}${route.replace(/^\/app/, "/app")}`, { waitUntil: "domcontentloaded" });
    await waitForPage(page, shot);
    if (shot.prepare) await shot.prepare(page);
    const out = path.join(IMG_DIR, shot.file);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  ✓ ${shot.file} — ${shot.title}`);
    return { ...shot, captured: true, route: route };
  } catch (e) {
    console.error(`  ✗ ${shot.file}:`, e instanceof Error ? e.message : e);
    return { ...shot, captured: false };
  } finally {
    await page.close();
  }
}

function startServer(): Promise<{ proc: ChildProcess; close: () => void }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("npx", ["tsx", "src/index.ts"], {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, PORT: String(PORT), HOST: "127.0.0.1" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let started = false;
    const timer = setTimeout(() => {
      if (!started) {
        proc.kill();
        reject(new Error("Server start timeout"));
      }
    }, 45000);

    const check = async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/health`);
        if (res.ok) {
          started = true;
          clearTimeout(timer);
          resolve({ proc, close: () => proc.kill("SIGTERM") });
        } else {
          setTimeout(check, 500);
        }
      } catch {
        setTimeout(check, 500);
      }
    };

    setTimeout(check, 1500);
  });
}

function ensureClientBuilt() {
  const distIndex = path.resolve(ROOT, "client/dist/index.html");
  if (!fs.existsSync(distIndex)) {
    console.log("Building React client…");
    execSync("npm run build", { cwd: path.resolve(ROOT, "client"), stdio: "inherit" });
  }
}

type CaptureResult = Shot & { captured?: boolean };

function buildVisualGalleryMarkdown(results: CaptureResult[], generated: string) {
  const sections = new Map<string, CaptureResult[]>();
  for (const r of results) {
    const list = sections.get(r.portal) ?? [];
    list.push(r);
    sections.set(r.portal, list);
  }

  let md = `# Application UI Snapshots

Visual screenshots of the **Financial Health Score (FHS)** React application — all stakeholder portals captured at **1440×900** viewport.

| | |
|---|---|
| **Generated** | ${generated} |
| **Platform** | Financial Health Score v2.1.0 |
| **UI** | React 19 + TypeScript SPA |
| **Images** | \`docs/snapshots/images/\` |
| **Self-contained** | [APPLICATION_UI_SNAPSHOTS.html](./APPLICATION_UI_SNAPSHOTS.html) |

Regenerate: \`cd server && npm run capture:ui-snapshots\`

Data snapshots: [APPLICATION_SNAPSHOTS.md](./APPLICATION_SNAPSHOTS.md)

---

`;

  for (const [portal, shots] of sections) {
    md += `## ${portal}\n\n`;
    for (const s of shots) {
      if (!s.captured) continue;
      md += `### ${s.title}\n\n`;
      md += `**Route:** \`${s.route}\`\n\n`;
      md += `![${s.title}](./snapshots/images/${s.file})\n\n`;
    }
  }

  md += `---

## Capture Index

| # | Portal | Page | Route | Image |
|---|---|---|---|---|
`;
  for (const s of results) {
    if (!s.captured) continue;
    md += `| ${s.file.slice(0, 2)} | ${s.portal} | ${s.title} | \`${s.route}\` | [${s.file}](./snapshots/images/${s.file}) |\n`;
  }

  return md;
}

function buildHtmlGallery(results: CaptureResult[], generated: string) {
  const sections = new Map<string, CaptureResult[]>();
  for (const r of results) {
    if (!r.captured) continue;
    const list = sections.get(r.portal) ?? [];
    list.push(r);
    sections.set(r.portal, list);
  }

  let body = "";
  for (const [portal, shots] of sections) {
    body += `<section><h2>${portal}</h2>\n`;
    for (const s of shots) {
      const imgPath = path.join(IMG_DIR, s.file);
      const b64 = fs.readFileSync(imgPath).toString("base64");
      body += `<article class="shot">
  <h3>${s.title}</h3>
  <p class="route"><code>${s.route}</code></p>
  <img alt="${s.title}" src="data:image/png;base64,${b64}" />
</article>\n`;
    }
    body += `</section>\n`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Financial Health Score — Application UI Snapshots</title>
  <style>
    :root { --ink: #0f172a; --muted: #64748b; --border: #e2e8f0; --bg: #f8fafc; }
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; margin: 0; background: var(--bg); color: var(--ink); line-height: 1.5; }
    header { background: linear-gradient(135deg, #0f2b5b, #1a6b4a); color: #fff; padding: 2rem 2.5rem; }
    header h1 { margin: 0 0 .5rem; font-size: 1.75rem; }
    header p { margin: 0; opacity: .9; }
    main { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
    section { margin-bottom: 3rem; }
    h2 { font-size: 1.35rem; border-bottom: 2px solid var(--border); padding-bottom: .5rem; margin: 0 0 1.5rem; }
    .shot { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(15,23,42,.06); }
    .shot h3 { margin: 0 0 .35rem; }
    .route { margin: 0 0 1rem; color: var(--muted); font-size: .9rem; }
    img { width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; display: block; }
    footer { text-align: center; color: var(--muted); font-size: .85rem; padding: 2rem; }
  </style>
</head>
<body>
  <header>
    <h1>Financial Health Score — Application UI Snapshots</h1>
    <p>Generated ${generated} · React 19 SPA · 1440×900 viewport · ${results.filter((r) => r.captured).length} screens</p>
  </header>
  <main>
${body}
  </main>
  <footer>Financial Health Score v2.1.0 · Sustainow Technologies · IDBI Innovate 2026</footer>
</body>
</html>`;
}

async function main() {
  ensureClientBuilt();
  fs.mkdirSync(IMG_DIR, { recursive: true });

  console.log(`Starting server on port ${PORT}…`);
  const { close } = await startServer();
  console.log("Server ready.");

  await resolveAssessmentId();
  console.log(`Using assessment ID: ${cachedAssessmentId}`);

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    console.log("Capturing screenshots…");
    const results: CaptureResult[] = [];
    for (const shot of SHOTS) {
      results.push(await capture(browser, shot));
    }

    const generated = new Date().toISOString();
    const mdPath = path.join(DOCS_DIR, "APPLICATION_UI_SNAPSHOTS.md");
    const htmlPath = path.join(DOCS_DIR, "APPLICATION_UI_SNAPSHOTS.html");

    fs.writeFileSync(mdPath, buildVisualGalleryMarkdown(results, generated));
    fs.writeFileSync(htmlPath, buildHtmlGallery(results, generated));

    const ok = results.filter((r) => r.captured).length;
    console.log(`\nCaptured ${ok}/${results.length} screenshots`);
    console.log(`Wrote ${mdPath}`);
    console.log(`Wrote ${htmlPath}`);
    console.log(`Images: ${IMG_DIR}/`);

    if (ok < results.length) process.exit(1);
  } finally {
    if (browser) await browser.close();
    close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
