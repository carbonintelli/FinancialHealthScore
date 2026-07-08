/**
 * Capture UI screenshots for APPLICATION_SNAPSHOTS.md
 * Usage: npm run capture:ui-snapshots
 * Requires: playwright (devDependency), built client, server running or auto-started
 */
import { chromium, type Browser, type Page } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, type ChildProcess } from "child_process";
import request from "supertest";
import { initDatabase } from "../src/db/index.js";
import { createApp } from "../src/app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.resolve(__dirname, "../../docs/snapshots/images");
const DOCS_DIR = path.resolve(__dirname, "../../docs");
const PORT = parseInt(process.env.SNAPSHOT_PORT || "8090", 10);
const BASE = `http://127.0.0.1:${PORT}`;

interface Shot {
  id: string;
  title: string;
  route: string;
  portal: string;
  file: string;
  auth?: { email: string; password: string };
}

const SHOTS: Shot[] = [
  { id: "login", title: "Secure Sign In", route: "/app/", portal: "Public", file: "01-login.png" },
  { id: "register", title: "MSME Enterprise Registration", route: "/app/msme/register", portal: "Public", file: "02-msme-register.png" },
  { id: "bank-dashboard", title: "Executive Dashboard", route: "/app/bank/dashboard", portal: "Lending Institution", file: "03-bank-dashboard.png", auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" } },
  { id: "bank-portfolio", title: "MSME Lending Portfolio", route: "/app/bank/portfolio", portal: "Lending Institution", file: "04-bank-portfolio.png", auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" } },
  { id: "bank-loans", title: "Credit Applications", route: "/app/bank/loans", portal: "Lending Institution", file: "05-bank-loans.png", auth: { email: "credit@idbi.bank.in", password: "IDBI@2026" } },
  { id: "msme-dashboard", title: "Enterprise Dashboard", route: "/app/msme/dashboard", portal: "Enterprise (MSME)", file: "06-msme-dashboard.png", auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" } },
  { id: "msme-profile", title: "Financial Data Submission", route: "/app/msme/profile", portal: "Enterprise (MSME)", file: "07-msme-profile.png", auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" } },
  { id: "msme-assess", title: "Credit Assessment", route: "/app/msme/assess", portal: "Enterprise (MSME)", file: "08-msme-assess.png", auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" } },
  { id: "msme-import", title: "ERP Data Integration", route: "/app/msme/import", portal: "Enterprise (MSME)", file: "09-msme-import.png", auth: { email: "rajesh@shreeganesh.in", password: "MSME@2026" } },
  { id: "govt-dashboard", title: "National MSME Dashboard", route: "/app/govt/dashboard", portal: "Government", file: "10-govt-dashboard.png", auth: { email: "admin@msme.gov.in", password: "GOVT@2026" } },
  { id: "regulatory-dashboard", title: "Supervisory Dashboard", route: "/app/regulatory/dashboard", portal: "Regulatory", file: "11-regulatory-dashboard.png", auth: { email: "supervisor@rbi.org.in", password: "REG@2026" } },
];

async function getAuthToken(email: string, password: string): Promise<{ token: string; user: object }> {
  initDatabase();
  const app = createApp();
  const res = await request(app).post("/api/v1/auth/login").send({ email, password });
  return { token: res.body.access_token, user: res.body.user };
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

async function waitForPage(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
}

async function capture(browser: Browser, shot: Shot) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    if (shot.auth) {
      await injectAuth(page, shot.auth.email, shot.auth.password);
    }
    await page.goto(`${BASE}${shot.route.replace("/app", "/app")}`, { waitUntil: "domcontentloaded" });
    await waitForPage(page);
    const out = path.join(IMG_DIR, shot.file);
    await page.screenshot({ path: out, fullPage: true });
    console.log(`  ✓ ${shot.file} — ${shot.title}`);
    return { ...shot, captured: true };
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
    }, 30000);

    const check = async () => {
      try {
        const res = await fetch(`${BASE}/api/v1/health`);
        if (res.ok) {
          started = true;
          clearTimeout(timer);
          resolve({
            proc,
            close: () => {
              proc.kill("SIGTERM");
            },
          });
        }
      } catch {
        setTimeout(check, 500);
      }
    };

    setTimeout(check, 1500);
  });
}

function buildVisualGalleryMarkdown(results: (Shot & { captured?: boolean })[]) {
  const generated = new Date().toISOString();
  const sections = new Map<string, (Shot & { captured?: boolean })[]>();
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

Regenerate images: \`cd server && npm run capture:ui-snapshots\`

Data snapshots (API payloads): [APPLICATION_SNAPSHOTS.md](./APPLICATION_SNAPSHOTS.md)

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

async function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });

  console.log(`Starting server on port ${PORT}…`);
  const { close } = await startServer();
  console.log("Server ready.");

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    console.log("Capturing screenshots…");
    const results: (Shot & { captured?: boolean })[] = [];
    for (const shot of SHOTS) {
      results.push(await capture(browser, shot));
    }

    const mdPath = path.join(DOCS_DIR, "APPLICATION_UI_SNAPSHOTS.md");
    fs.writeFileSync(mdPath, buildVisualGalleryMarkdown(results));
    console.log(`\nWrote ${mdPath}`);
    console.log(`Images: ${IMG_DIR}/`);
  } finally {
    if (browser) await browser.close();
    close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
