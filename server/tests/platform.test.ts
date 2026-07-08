import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { initDatabase } from "../src/db/index.js";
import { createApp } from "../src/app.js";
import { getArchitecture } from "../src/services/agents/orchestrator.js";
import { DIMENSION_CATALOG, validateWeights } from "../src/services/agents/catalog.js";

let app: ReturnType<typeof createApp>;
let bankToken: string;
let msmeToken: string;
let govtToken: string;
let regToken: string;

beforeAll(async () => {
  initDatabase();
  app = createApp();

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
    expect(res.body.phases.length).toBe(7);
    expect(res.body.phases.find((p: { id: string }) => p.id === "dimension_scoring")?.count).toBe(20);
    expect(res.body.scoring_agents).toBe(20);
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

  it("msme can submit and list loan applications", async () => {
    const assess = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const submit = await request(app)
      .post("/api/v1/msme/loans")
      .set("Authorization", `Bearer ${msmeToken}`)
      .send({
        loan_type: "working_capital",
        amount_inr: 1500000,
        tenure_months: 24,
        purpose: "Inventory",
        assessment_id: assess.body.assessment_id,
      });
    expect(submit.status).toBe(201);
    expect(submit.body.application_ref).toMatch(/^LN-/);

    const list = await request(app).get("/api/v1/msme/loans").set("Authorization", `Bearer ${msmeToken}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThan(0);
    expect(list.body[0].application_ref).toBe(submit.body.application_ref);
  }, 60000);

  it("bank can approve loan applications", async () => {
    const loans = await request(app).get("/api/v1/bank/loans").set("Authorization", `Bearer ${bankToken}`);
    expect(loans.status).toBe(200);
    const submitted = loans.body.find((l: { status: string }) => l.status === "submitted");
    if (!submitted) return;

    const updated = await request(app)
      .patch(`/api/v1/bank/loans/${submitted.id}`)
      .set("Authorization", `Bearer ${bankToken}`)
      .send({ status: "approved", reviewer_notes: "Meets credit criteria" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("approved");
  });

  it("HTML report requires authentication", async () => {
    const assess = await request(app).post("/api/v1/msme/assess/quick").set("Authorization", `Bearer ${msmeToken}`);
    const assessmentId = assess.body.assessment_id;

    const unauth = await request(app).get(`/api/v1/reports/${assessmentId}/html`);
    expect(unauth.status).toBe(401);

    const authed = await request(app)
      .get(`/api/v1/reports/${assessmentId}/html`)
      .set("Authorization", `Bearer ${msmeToken}`);
    expect(authed.status).toBe(200);
    expect(authed.text).toContain("<!DOCTYPE html>");
  }, 60000);

  it("dashboard stats reflect loan data", async () => {
    const msmeDash = await request(app).get("/api/v1/msme/dashboard").set("Authorization", `Bearer ${msmeToken}`);
    expect(msmeDash.status).toBe(200);
    expect(typeof msmeDash.body.open_loan_applications).toBe("number");

    const bankDash = await request(app).get("/api/v1/bank/dashboard").set("Authorization", `Bearer ${bankToken}`);
    expect(bankDash.status).toBe(200);
    expect(typeof bankDash.body.approved_loans_inr).toBe("number");
  });

  it("lists data connectors including tally, zoho, and carbon", async () => {
    const res = await request(app).get("/api/v1/integrations/connectors");
    expect(res.status).toBe(200);
    const ids = res.body.connectors.map((c: { id: string }) => c.id);
    expect(ids).toContain("tally");
    expect(ids).toContain("zoho");
    expect(ids).toContain("carbon_intelligence");
  });

  it("preview import from tally with carbon intelligence", async () => {
    const res = await request(app)
      .post("/api/v1/msme/assess/import/preview")
      .set("Authorization", `Bearer ${msmeToken}`)
      .send({ connector: "tally", include_carbon_intelligence: true });
    expect(res.status).toBe(200);
    expect(res.body.import_result.source).toBe("tally");
    expect(res.body.import_result.financial_data.accounting.revenue_inr).toBeGreaterThan(0);
    expect(res.body.sustainability_report.sustainability_score).toBeGreaterThan(0);
    expect(res.body.carbon_intelligence.source).toBe("ci.sustainow.in");
  });

  it("import from zoho and calculate financial health score", async () => {
    const res = await request(app)
      .post("/api/v1/msme/assess/import")
      .set("Authorization", `Bearer ${msmeToken}`)
      .send({ connector: "zoho", include_carbon_intelligence: true });
    expect(res.status).toBe(200);
    expect(res.body.import_result.source).toBe("zoho");
    expect(res.body.assessment.overall_score).toBeGreaterThan(0);
    expect(res.body.assessment.dimension_scores).toHaveLength(20);
    expect(res.body.assessment.agent_insights.summary.total_agents_run).toBe(27);
    expect(res.body.sustainability_report.carbon_footprint.total_emissions_tco2e).toBeGreaterThan(0);
  }, 90000);
});

describe("MSME Registration & Data Feed", () => {
  it("registers new MSME with financial data and health score", async () => {
    const email = `new-msme-${Date.now()}@example.in`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "TestMSME@2026",
        full_name: "Test Founder",
        business_name: "Test Components Pvt Ltd",
        sector: "manufacturing",
        gstin: "27AABCT1234F1Z9",
        udyam_number: `UDYAM-MH-99-${Date.now()}`,
        state: "maharashtra",
        annual_turnover_inr: 15_000_000,
        financial_data: {
          accounting: {
            revenue_inr: 15_000_000,
            cost_of_goods_inr: 9_750_000,
            operating_expenses_inr: 3_000_000,
            current_assets_inr: 4_500_000,
            current_liabilities_inr: 2_700_000,
            total_debt_inr: 3_750_000,
            equity_inr: 5_250_000,
            net_profit_inr: 1_500_000,
          },
        },
        run_assessment: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.msme_id).toMatch(/^msme-/);
    expect(res.body.assessment.assessment.overall_score).toBeGreaterThan(0);
    expect(res.body.assessment.assessment.dimension_scores).toHaveLength(20);
  }, 60000);

  it("submits data feed and recalculates score", async () => {
    const email = `feed-msme-${Date.now()}@example.in`;
    const reg = await request(app).post("/api/v1/auth/register").send({
      email,
      password: "TestMSME@2026",
      full_name: "Feed Test",
      business_name: "Feed Test Industries",
      sector: "textiles",
      annual_turnover_inr: 8_000_000,
      run_assessment: false,
    });
    const token = reg.body.access_token;

    const feed = await request(app)
      .post("/api/v1/msme/data-feed")
      .set("Authorization", `Bearer ${token}`)
      .send({
        source: "manual",
        financial_data: {
          accounting: {
            revenue_inr: 10_000_000,
            cost_of_goods_inr: 6_500_000,
            operating_expenses_inr: 2_000_000,
            current_assets_inr: 3_000_000,
            current_liabilities_inr: 1_800_000,
            total_debt_inr: 2_500_000,
            equity_inr: 3_500_000,
            net_profit_inr: 1_000_000,
          },
        },
        run_assessment: true,
      });
    expect(feed.status).toBe(201);
    expect(feed.body.feed_id).toBeDefined();
    expect(feed.body.assessment.overall_score).toBeGreaterThan(0);

    const profile = await request(app).get("/api/v1/msme/profile").set("Authorization", `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.financial_data.accounting.revenue_inr).toBe(10_000_000);

    const feeds = await request(app).get("/api/v1/msme/data-feeds").set("Authorization", `Bearer ${token}`);
    expect(feeds.body.feeds.length).toBeGreaterThanOrEqual(1);
  }, 60000);
});
