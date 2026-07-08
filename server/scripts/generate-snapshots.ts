#!/usr/bin/env tsx
/** Regenerate API response snapshots for regression testing (Node.js platform). */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import { initDatabase } from "../src/db/index.js";
import { createApp } from "../src/app.js";
import { normalizeSnapshot } from "../src/utils/snapshot-normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.resolve(__dirname, "../../tests/snapshots");

initDatabase();
const app = createApp();

async function writeSnapshot(name: string, data: unknown) {
  const normalized = normalizeSnapshot(data);
  const out = path.join(SNAPSHOT_DIR, `${name}.json`);
  fs.writeFileSync(out, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${out}`);
}

async function main() {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });

  const root = await request(app).get("/api");
  await writeSnapshot("root", root.body);

  const health = await request(app).get("/api/v1/health");
  await writeSnapshot("health", health.body);

  const integrations = await request(app).get("/api/v1/integrations/status");
  await writeSnapshot("integrations_status", integrations.body);

  const demoCredit = await request(app).get("/api/v1/assess/demo").query({ audience: "credit_team" });
  await writeSnapshot("demo_assessment_credit", demoCredit.body);

  const demoRisk = await request(app).get("/api/v1/assess/demo").query({ audience: "risk_team" });
  await writeSnapshot("demo_assessment_risk", demoRisk.body);

  const policies = await request(app).get("/api/v1/policies/catalog").query({ sector: "auto_components" });
  await writeSnapshot("policies_auto", policies.body);

  const bureau = await request(app).post("/api/v1/integrations/bureau/pull").query({
    gstin: "27AABCS1234F1Z5",
    pan: "AABCS1234F",
    business_name: "Shree Ganesh Auto Components Pvt Ltd",
  });
  await writeSnapshot("bureau_pull", bureau.body);

  const tax = await request(app).post("/api/v1/integrations/tax/verify").query({
    gstin: "27AABCS1234F1Z5",
    pan: "AABCS1234F",
  });
  await writeSnapshot("tax_verify", tax.body);

  const architecture = await request(app).get("/api/v1/agents/architecture");
  await writeSnapshot("agents_architecture", architecture.body);

  const credentials = await request(app).get("/api/v1/auth/demo-credentials");
  await writeSnapshot("demo_credentials", credentials.body);

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "rajesh@shreeganesh.in", password: "MSME@2026" });
  const assess = await request(app)
    .post("/api/v1/msme/assess/quick")
    .set("Authorization", `Bearer ${login.body.access_token}`);
  await writeSnapshot("msme_orchestration", assess.body.agent_insights);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
