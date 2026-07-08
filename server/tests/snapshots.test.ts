import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import request from "supertest";
import { initDatabase } from "../src/db/index.js";
import { createApp } from "../src/app.js";
import { normalizeSnapshot } from "../src/utils/snapshot-normalize.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.resolve(__dirname, "../../tests/snapshots");

let app: ReturnType<typeof createApp>;
let msmeToken: string;

function loadSnapshot(name: string) {
  const file = path.join(SNAPSHOT_DIR, `${name}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function assertMatchesSnapshot(actual: unknown, name: string) {
  expect(normalizeSnapshot(actual)).toEqual(loadSnapshot(name));
}

beforeAll(async () => {
  initDatabase();
  app = createApp();

  const login = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "rajesh@shreeganesh.in", password: "MSME@2026" });
  msmeToken = login.body.access_token;
});

describe("API snapshots", () => {
  it("root", async () => {
    const res = await request(app).get("/api");
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "root");
  });

  it("health", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "health");
  });

  it("integrations status", async () => {
    const res = await request(app).get("/api/v1/integrations/status");
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "integrations_status");
  });

  it("demo assessment credit", async () => {
    const res = await request(app).get("/api/v1/assess/demo").query({ audience: "credit_team" });
    expect(res.status).toBe(200);
    expect(res.body.overall_score).toBe(78.1);
    expect(res.body.grade).toBe("B+");
    expect(res.body.dimension_scores).toHaveLength(20);
    assertMatchesSnapshot(res.body, "demo_assessment_credit");
  });

  it("demo assessment risk", async () => {
    const res = await request(app).get("/api/v1/assess/demo").query({ audience: "risk_team" });
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "demo_assessment_risk");
  });

  it("policies catalog auto_components", async () => {
    const res = await request(app).get("/api/v1/policies/catalog").query({ sector: "auto_components" });
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "policies_auto");
  });

  it("bureau pull", async () => {
    const res = await request(app).post("/api/v1/integrations/bureau/pull").query({
      gstin: "27AABCS1234F1Z5",
      pan: "AABCS1234F",
      business_name: "Shree Ganesh Auto Components Pvt Ltd",
    });
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "bureau_pull");
  });

  it("tax verify", async () => {
    const res = await request(app).post("/api/v1/integrations/tax/verify").query({
      gstin: "27AABCS1234F1Z5",
      pan: "AABCS1234F",
    });
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "tax_verify");
  });

  it("agents architecture", async () => {
    const res = await request(app).get("/api/v1/agents/architecture");
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "agents_architecture");
  });

  it("demo credentials", async () => {
    const res = await request(app).get("/api/v1/auth/demo-credentials");
    expect(res.status).toBe(200);
    assertMatchesSnapshot(res.body, "demo_credentials");
  });

  it("msme orchestration", async () => {
    const res = await request(app)
      .post("/api/v1/msme/assess/quick")
      .set("Authorization", `Bearer ${msmeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.agent_insights.summary.total_agents_run).toBe(27);
    assertMatchesSnapshot(res.body.agent_insights, "msme_orchestration");
  }, 60000);
});
