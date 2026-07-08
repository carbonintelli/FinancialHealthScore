import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import express from "express";
import cors from "cors";
import { initDatabase } from "../src/db/index.js";
import { authRouter } from "../src/routes/auth.js";
import { apiRouter } from "../src/routes/api.js";

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

describe("Node.js Platform", () => {
  it("health check returns nodejs server", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.server).toBe("nodejs");
    expect(res.body.ai_agents_enabled).toBe(true);
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

  it("msme quick assess with AI agents", async () => {
    const res = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.overall_score).toBeGreaterThan(0);
    expect(res.body.dimension_scores.length).toBe(20);
    expect(res.body.agent_insights).toBeDefined();
  }, 30000);

  it("govt dashboard loads MSME view", async () => {
    const res = await request(app).get("/api/v1/govt/dashboard").set("Authorization", `Bearer ${govtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.registered_msmes).toBeGreaterThan(0);
  });

  it("govt policy agent runs", async () => {
    const res = await request(app).post("/api/v1/govt/schemes/recommend/msme-demo-001").set("Authorization", `Bearer ${govtToken}`);
    expect(res.status).toBe(200);
    expect(res.body.agent_type).toBe("policy_advisory");
  });

  it("regulatory review agent runs", async () => {
    await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const res = await request(app).post("/api/v1/regulatory/review/msme-demo-001").set("Authorization", `Bearer ${regToken}`);
    expect(res.status).toBe(200);
    expect(res.body.agent_review.agent_type).toBe("regulatory_compliance");
  }, 30000);
});
