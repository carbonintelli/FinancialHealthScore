import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import { initDatabase } from "../src/db/index.js";
import { authRouter } from "../src/routes/auth.js";
import { apiRouter } from "../src/routes/api.js";
import { getArchitecture } from "../src/services/agents/orchestrator.js";
import { DIMENSION_CATALOG, validateWeights } from "../src/services/agents/catalog.js";

let app: express.Application;
let bankToken: string;
let msmeToken: string;
let govtToken: string;
let regToken: string;

beforeAll(async () => {
  initDatabase();
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", apiRouter);

  const bankLogin = await request(app).post("/api/v1/auth/login").send({ email: "credit@idbi.bank.in", password: "IDBI@2026" });
  bankToken = bankLogin.body.access_token;

  const msmeLogin = await request(app).post("/api/v1/auth/login").send({ email: "rajesh@shreeganesh.in", password: "MSME@2026" });
  msmeToken = msmeLogin.body.access_token;

  const govtLogin = await request(app).post("/api/v1/auth/login").send({ email: "admin@msme.gov.in", password: "GOVT@2026" });
  govtToken = govtLogin.body.access_token;

  const regLogin = await request(app).post("/api/v1/auth/login").send({ email: "supervisor@rbi.org.in", password: "REG@2026" });
  regToken = regLogin.body.access_token;
});

describe("Agentic AI Architecture", () => {
  it("dimension catalog has 20 agents with weights summing to 1", () => {
    expect(DIMENSION_CATALOG.length).toBe(20);
    expect(validateWeights()).toBe(true);
  });

  it("architecture endpoint describes orchestration phases", async () => {
    const res = await request(app).get("/api/v1/agents/architecture");
    expect(res.status).toBe(200);
    expect(res.body.phases.length).toBe(6);
    expect(res.body.dimension_agents.length).toBe(20);
    expect(res.body.total_agents_per_full_run).toBe(27);
  });

  it("getArchitecture returns valid structure", () => {
    const arch = getArchitecture();
    expect(arch.pattern).toBe("multi-phase agentic orchestration");
    expect(arch.phases.find((p: { id: string }) => p.id === "dimension_analysis")?.count).toBe(20);
  });
});

describe("Node.js Platform", () => {
  it("health check returns agentic orchestration", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.agentic_orchestration).toBe(true);
    expect(res.body.dimension_agents).toBe(20);
  });

  it("demo credentials include all stakeholders", async () => {
    const res = await request(app).get("/api/v1/auth/demo-credentials");
    expect(res.body.government.length).toBeGreaterThan(0);
    expect(res.body.regulatory.length).toBeGreaterThan(0);
  });

  it("bank can access portfolio", async () => {
    const res = await request(app).get("/api/v1/bank/portfolio").set("Authorization", `Bearer ${bankToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  it("msme quick assess runs full agent orchestration", async () => {
    const res = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.overall_score).toBeGreaterThan(0);
    expect(res.body.dimension_scores.length).toBe(20);

    const orch = res.body.agent_insights;
    expect(orch.orchestration_id).toBeDefined();
    expect(orch.dimension_agents.length).toBe(20);
    expect(orch.risk_synthesis.composite_risk_level).toBeDefined();
    expect(orch.health_score.agent_validated_score).toBeGreaterThan(0);
    expect(orch.reporting.credit_decision).toBeDefined();
    expect(orch.summary.total_agents_run).toBe(27);
    expect(orch.phases.length).toBe(6);
  }, 60000);

  it("orchestration can be re-run on existing assessment", async () => {
    const assess = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const assessmentId = assess.body.assessment_id;

    const res = await request(app)
      .post(`/api/v1/agents/orchestrate/${assessmentId}`)
      .set("Authorization", `Bearer ${msmeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.dimension_agents.length).toBe(20);

    const getOrch = await request(app)
      .get(`/api/v1/agents/orchestration/${res.body.orchestration_id}`)
      .set("Authorization", `Bearer ${msmeToken}`);
    expect(getOrch.status).toBe(200);
  }, 90000);

  it("dimension agent endpoint returns single agent", async () => {
    const assess = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const assessmentId = assess.body.assessment_id;

    const res = await request(app)
      .get(`/api/v1/agents/dimension/tax_compliance?assessment_id=${assessmentId}`)
      .set("Authorization", `Bearer ${msmeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.dimension).toBe("tax_compliance");
    expect(res.body.agent_type).toBe("dimension_agent");
  }, 60000);

  it("report includes agent orchestration", async () => {
    const assess = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const assessmentId = assess.body.assessment_id;

    const report = await request(app)
      .get(`/api/v1/reports/${assessmentId}`)
      .set("Authorization", `Bearer ${msmeToken}`);
    expect(report.status).toBe(200);
    expect(report.body.agent_orchestration).toBeDefined();
    expect(report.body.agent_orchestration.dimension_agents.length).toBe(20);
    expect(report.body.report_title).toContain("Agentic");
  }, 60000);

  it("govt dashboard loads MSME view", async () => {
    const res = await request(app).get("/api/v1/govt/dashboard").set("Authorization", `Bearer ${govtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.registered_msmes).toBeGreaterThan(0);
  });

  it("regulatory review agent runs", async () => {
    await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const res = await request(app).post("/api/v1/regulatory/review/msme-demo-001").set("Authorization", `Bearer ${regToken}`);
    expect(res.status).toBe(200);
    expect(res.body.agent_review.agent_type).toBe("regulatory_compliance");
  }, 60000);
});
