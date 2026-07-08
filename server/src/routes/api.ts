import { Router } from "express";
import { config } from "../config.js";
import { assessDemo, assessRequest, getMockCarbonData } from "../services/scoring/bridge.js";
import { assessAndStore } from "../services/store.js";
import { requireAuth, requireRoles, type AuthRequest } from "../middleware/auth.js";
import { BANK_ROLES, MSME_ROLES, GOVT_ROLES, REG_ROLES } from "../auth/index.js";
import {
  getPortfolio,
  getPortfolioMsmeIds,
  bankHasMsme,
  listAssessmentsForBank,
  listAssessmentsForMsme,
  getAssessment,
  getAllMsmesSummary,
} from "../services/store.js";
import { buildDetailedReport, renderHtmlReport } from "../services/reports/index.js";
import { runPolicyAgent, runRegulatoryAgent } from "../services/agents/legacy-agents.js";
import { orchestrateAssessment, getArchitecture } from "../services/agents/orchestrator.js";
import { getOrchestrationRun, listAgentRuns } from "../services/agents/logger.js";
import { pullBureauReport, verifyTax } from "../services/integrations/mock-clients.js";
import { getApplicablePolicies, toPolicyResponse } from "../data/government-policies.js";
import {
  listLoansForMsme,
  listLoansForBank,
  openLoanCountForMsme,
  pendingLoanCountForBank,
  approvedLoansTotalInr,
  assessmentsThisMonth,
  unreadNotificationCount,
  updateLoanStatus,
} from "../services/loans.js";
import { getDb } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    version: config.appVersion,
    server: "nodejs",
    carbon_intelligence_connected: !!config.carbonApiKey,
    mock_mode: !config.carbonApiKey,
    integrations_mock_mode: config.useMockIntegrations,
    dimension_count: 20,
    ai_agents_enabled: true,
    agentic_orchestration: true,
    dimension_agents: 20,
    openai_configured: !!config.openaiApiKey,
  });
});

apiRouter.get("/", (_req, res) => {
  res.redirect("/app/index.html");
});

// Public assessment
apiRouter.post("/assess", async (req, res) => {
  try {
    const carbon = req.body.include_carbon_intelligence !== false
      ? getMockCarbonData(req.body.financial_data?.profile?.msme_id ?? "unknown")
      : undefined;
    const result = await assessRequest(req.body, carbon);
    res.json(result);
  } catch (e) {
    res.status(500).json({ detail: String(e) });
  }
});

apiRouter.get("/assess/demo", async (req, res) => {
  try {
    const audience = (req.query.audience as string) || "credit_team";
    const result = await assessDemo(audience);
    res.json(result);
  } catch (e) {
    res.status(500).json({ detail: String(e) });
  }
});

apiRouter.get("/integrations/status", (_req, res) => {
  res.json({
    mock_mode: config.useMockIntegrations,
    server: "nodejs",
    integrations: {
      credit_bureau: { configured: false, source: "CIBIL/CRISIL" },
      tax_verification: { configured: false, source: "GSTN/ITR" },
      legal_search: { configured: false, source: "e-Courts/MCA" },
      document_intelligence: { configured: false, source: "OCR" },
      carbon_intelligence: { configured: !!config.carbonApiKey, source: "ci.sustainow.in" },
    },
    ai_agents: {
      orchestration: "multi-phase",
      dimension_agents: 20,
      synthesis_agents: ["risk_synthesis", "health_score_synthesis", "report_orchestration"],
      stakeholder_agents: ["credit_analysis", "policy_advisory", "regulatory_compliance"],
      enrichment: "data_enrichment",
    },
    dimension_count: 20,
  });
});

apiRouter.get("/agents/architecture", (_req, res) => {
  res.json(getArchitecture());
});

apiRouter.get("/policies/catalog", (req, res) => {
  const sector = (req.query.sector as string) || "general";
  const policies = getApplicablePolicies(sector);
  res.json({
    sector,
    count: policies.length,
    policies: policies.map(toPolicyResponse),
  });
});

apiRouter.post("/integrations/bureau/pull", (req, res) => {
  const gstin = (req.query.gstin as string) || (req.body?.gstin as string);
  const pan = (req.query.pan as string) || (req.body?.pan as string);
  const businessName =
    (req.query.business_name as string) || (req.body?.business_name as string) || "MSME";
  try {
    res.json(pullBureauReport(gstin, pan, businessName));
  } catch (e) {
    res.status(503).json({ detail: String(e) });
  }
});

apiRouter.post("/integrations/tax/verify", (req, res) => {
  const gstin = (req.query.gstin as string) || (req.body?.gstin as string);
  const pan = (req.query.pan as string) || (req.body?.pan as string);
  try {
    res.json(verifyTax(gstin, pan));
  } catch (e) {
    res.status(503).json({ detail: String(e) });
  }
});

apiRouter.get("/agents/status", requireAuth, (req, res) => {
  const assessmentId = req.query.assessment_id as string | undefined;
  const runs = listAgentRuns(assessmentId);
  res.json({ agents: runs, openai_configured: !!config.openaiApiKey, architecture: getArchitecture() });
});

apiRouter.post("/agents/orchestrate/:assessmentId", requireAuth, async (req: AuthRequest, res) => {
  const assessmentId = String(req.params.assessmentId);
  const record = getAssessment(assessmentId);
  if (!record) return res.status(404).json({ detail: "Assessment not found" });
  if (!canAccess(req.user!, record.msme_id)) return res.status(403).json({ detail: "Access denied" });

  try {
    const result = JSON.parse(record.result_json);
    const orchestration = await orchestrateAssessment({
      msmeId: record.msme_id,
      businessName: record.business_name,
      assessment: result,
      sector: "auto_components",
      triggerSource: "manual_orchestration",
      audience: record.audience,
    });
    getDb()
      .prepare("UPDATE assessment_records SET agent_insights_json = ? WHERE assessment_id = ?")
      .run(JSON.stringify(orchestration), assessmentId);
    res.json(orchestration);
  } catch (e) {
    res.status(500).json({ detail: String(e) });
  }
});

apiRouter.get("/agents/orchestration/:orchestrationId", requireAuth, (req: AuthRequest, res) => {
  const run = getOrchestrationRun(String(req.params.orchestrationId));
  if (!run) return res.status(404).json({ detail: "Orchestration not found" });
  if (run.assessment_id) {
    const record = getAssessment(run.assessment_id);
    if (!record || !canAccess(req.user!, record.msme_id)) {
      return res.status(403).json({ detail: "Access denied" });
    }
  }
  res.json(JSON.parse(run.output_json));
});

apiRouter.get("/agents/dimension/:dimensionId", requireAuth, async (req: AuthRequest, res) => {
  const assessmentId = req.query.assessment_id as string;
  if (!assessmentId) return res.status(400).json({ detail: "assessment_id required" });
  const record = getAssessment(assessmentId);
  if (!record) return res.status(404).json({ detail: "Assessment not found" });

  const insights = record.agent_insights_json ? JSON.parse(record.agent_insights_json) : null;
  if (!insights?.dimension_agents) {
    return res.status(404).json({ detail: "No dimension agent data — run orchestration first" });
  }
  const dim = insights.dimension_agents.find(
    (d: { dimension: string }) => d.dimension === req.params.dimensionId
  );
  if (!dim) return res.status(404).json({ detail: "Dimension agent not found" });
  res.json(dim);
});

// Bank routes
const bankAuth = [requireAuth, requireRoles(...BANK_ROLES)];

apiRouter.get("/bank/dashboard", ...bankAuth, (req: AuthRequest, res) => {
  const msmeIds = getPortfolioMsmeIds(req.user!.organization_id);
  const portfolio = getPortfolio(req.user!.organization_id);
  const scores = portfolio.filter((p) => p.latest_score != null).map((p) => p.latest_score!);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  res.json({
    portfolio_count: portfolio.length,
    assessments_this_month: assessmentsThisMonth(msmeIds),
    average_score: avg ? Math.round(avg * 10) / 10 : null,
    high_risk_count: portfolio.filter((p) => ["elevated", "high", "critical"].includes(p.latest_risk_level ?? "")).length,
    pending_loans: pendingLoanCountForBank(req.user!.organization_id),
    approved_loans_inr: approvedLoansTotalInr(req.user!.organization_id),
  });
});

apiRouter.get("/bank/portfolio", ...bankAuth, (req: AuthRequest, res) => {
  res.json(getPortfolio(req.user!.organization_id));
});

apiRouter.get("/bank/assessments", ...bankAuth, (req: AuthRequest, res) => {
  const msmeIds = getPortfolioMsmeIds(req.user!.organization_id);
  const records = listAssessmentsForBank(msmeIds);
  res.json(records.map(toSummary));
});

apiRouter.post("/bank/assess/:msmeId", ...bankAuth, async (req: AuthRequest, res) => {
  const msmeId = String(req.params.msmeId);
  if (!bankHasMsme(req.user!.organization_id, msmeId)) {
    return res.status(404).json({ detail: "MSME not in portfolio" });
  }
  try {
    const audience = (req.query.audience as string) || "credit_team";
    const result = await assessDemo(audience, getMockCarbonData(msmeId));
    const stored = await assessAndStore(req.user!.id, result, audience);
    res.json({ ...stored.result, agent_insights: stored.agent_insights });
  } catch (e) {
    res.status(500).json({ detail: String(e) });
  }
});

// MSME routes
const msmeAuth = [requireAuth, requireRoles(...MSME_ROLES)];

apiRouter.get("/msme/dashboard", ...msmeAuth, (req: AuthRequest, res) => {
  const org = getDb().prepare("SELECT name FROM organizations WHERE id = ?").get(req.user!.organization_id) as { name: string };
  const latest = listAssessmentsForMsme(req.user!.msme_id ?? "", 1)[0];
  const msmeId = req.user!.msme_id ?? "";
  res.json({
    msme_id: msmeId,
    business_name: org?.name ?? "MSME",
    latest_score: latest?.overall_score ?? null,
    latest_grade: latest?.grade ?? null,
    latest_risk_level: latest?.overall_risk_level ?? null,
    last_assessed_at: latest?.created_at ?? null,
    open_loan_applications: msmeId ? openLoanCountForMsme(msmeId) : 0,
    unread_notifications: unreadNotificationCount(req.user!.id),
    improvement_count: latest ? JSON.parse(latest.result_json).recommended_improvements?.length ?? 0 : 0,
  });
});

apiRouter.post("/msme/assess/quick", ...msmeAuth, async (req: AuthRequest, res) => {
  if (req.user!.role === "msme_viewer") return res.status(403).json({ detail: "Viewers cannot assess" });
  try {
    const result = await assessDemo("credit_team", getMockCarbonData(req.user!.msme_id!));
    const stored = await assessAndStore(req.user!.id, result, "credit_team");
    res.json({ ...stored.result, agent_insights: stored.agent_insights });
  } catch (e) {
    res.status(500).json({ detail: String(e) });
  }
});

apiRouter.get("/msme/assessments", ...msmeAuth, (req: AuthRequest, res) => {
  const records = listAssessmentsForMsme(req.user!.msme_id ?? "");
  res.json(records.map(toSummary));
});

// Government routes
const govtAuth = [requireAuth, requireRoles(...GOVT_ROLES)];

apiRouter.get("/govt/dashboard", ...govtAuth, async (_req, res) => {
  const msmes = getAllMsmesSummary() as { latest_score: number | null }[];
  const withScores = msmes.filter((m) => m.latest_score != null);
  const schemes = getDb().prepare("SELECT COUNT(*) as c FROM scheme_applications").get() as { c: number };
  res.json({
    registered_msmes: msmes.length,
    scheme_applications: schemes.c,
    avg_portfolio_score:
      withScores.length > 0
        ? Math.round(withScores.reduce((a, m) => a + (m.latest_score as number), 0) / withScores.length)
        : null,
    msmes,
  });
});

apiRouter.get("/govt/schemes/catalog", ...govtAuth, (_req, res) => {
  res.json({
    schemes: ["UDYAM", "CGTMSE", "PMMY", "PLI_AUTO", "CLCSS", "SAMADHAN", "ZED", "MUDRA", "GECL", "ASPIRE"],
  });
});

apiRouter.post("/govt/schemes/recommend/:msmeId", ...govtAuth, async (req, res) => {
  const msmeId = String(req.params.msmeId);
  const link = getDb().prepare("SELECT * FROM portfolio_links WHERE msme_id = ?").get(msmeId) as
    | { business_name: string; sector: string }
    | undefined;
  if (!link) return res.status(404).json({ detail: "MSME not found" });
  const agent = await runPolicyAgent({
    msmeId,
    businessName: link.business_name,
    sector: link.sector,
    triggerSource: "govt_portal",
  });
  res.json(agent);
});

apiRouter.get("/govt/scheme-applications", ...govtAuth, (_req, res) => {
  res.json(getDb().prepare("SELECT * FROM scheme_applications ORDER BY created_at DESC").all());
});

// Regulatory routes
const regAuth = [requireAuth, requireRoles(...REG_ROLES)];

apiRouter.get("/regulatory/dashboard", ...regAuth, (_req, res) => {
  const submissions = getDb().prepare("SELECT * FROM regulatory_submissions ORDER BY created_at DESC LIMIT 50").all() as {
    status: string;
    msme_id: string;
  }[];
  const flagged = getDb()
    .prepare(
      `SELECT * FROM assessment_records WHERE overall_risk_level IN ('elevated','high','critical') ORDER BY created_at DESC LIMIT 20`
    )
    .all() as { msme_id: string }[];
  const reviewedMsmeIds = new Set(
    submissions.filter((s) => s.status === "reviewed").map((s) => s.msme_id)
  );
  const pendingReviews = flagged.filter((a) => !reviewedMsmeIds.has(a.msme_id)).length;
  res.json({
    submissions,
    high_risk_assessments: flagged,
    pending_reviews: pendingReviews,
  });
});

apiRouter.post("/regulatory/review/:msmeId", ...regAuth, async (req: AuthRequest, res) => {
  const msmeId = String(req.params.msmeId);
  const record = getDb()
    .prepare("SELECT * FROM assessment_records WHERE msme_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(msmeId) as { result_json: string; business_name: string } | undefined;
  if (!record) return res.status(404).json({ detail: "No assessment for MSME" });

  const result = JSON.parse(record.result_json);
  const regulator = req.user!.role.includes("gstn") ? "gstn" : req.user!.role.includes("mca") ? "mca" : "rbi";
  const agent = await runRegulatoryAgent(
    { msmeId, businessName: record.business_name, assessment: result, triggerSource: "regulatory_portal" },
    regulator
  );

  const ref = `REG-${Date.now()}`;
  getDb()
    .prepare(
      `INSERT INTO regulatory_submissions (submission_ref, msme_id, business_name, submitted_by_user_id, regulator_type, submission_type, status, payload_json, agent_review_json)
       VALUES (?, ?, ?, ?, ?, 'compliance_review', 'pending', ?, NULL)`
    )
    .run(ref, msmeId, record.business_name, req.user!.id, regulator, JSON.stringify(result));

  getDb()
    .prepare(
      `UPDATE regulatory_submissions SET status = 'reviewed', agent_review_json = ? WHERE submission_ref = ?`
    )
    .run(JSON.stringify(agent), ref);

  res.json({ submission_ref: ref, agent_review: agent });
});

// Reports
apiRouter.get("/reports/:assessmentId", requireAuth, (req: AuthRequest, res) => {
  const assessmentId = String(req.params.assessmentId);
  const record = getAssessment(assessmentId);
  if (!record) return res.status(404).json({ detail: "Assessment not found" });
  if (!canAccess(req.user!, record.msme_id)) return res.status(403).json({ detail: "Access denied" });
  const result = JSON.parse(record.result_json);
  const agents = record.agent_insights_json ? JSON.parse(record.agent_insights_json) : null;
  res.json(buildDetailedReport(result, agents));
});

apiRouter.get("/reports/:assessmentId/html", requireAuth, (req: AuthRequest, res) => {
  const assessmentId = String(req.params.assessmentId);
  const record = getAssessment(assessmentId);
  if (!record) return res.status(404).json({ detail: "Assessment not found" });
  if (!canAccess(req.user!, record.msme_id)) return res.status(403).json({ detail: "Access denied" });
  const result = JSON.parse(record.result_json);
  const agents = record.agent_insights_json ? JSON.parse(record.agent_insights_json) : null;
  const report = buildDetailedReport(result, agents);
  res.type("html").send(renderHtmlReport(result, report));
});

// Loans
apiRouter.post("/msme/loans", ...msmeAuth, (req: AuthRequest, res) => {
  if (req.user!.role === "msme_viewer") return res.status(403).json({ detail: "Viewers cannot submit loans" });
  const org = getDb().prepare("SELECT name FROM organizations WHERE id = ?").get(req.user!.organization_id) as { name: string };
  const idbi = getDb().prepare("SELECT id FROM organizations WHERE registration_id = 'BANK-IDBI-001'").get() as { id: number };
  const ref = `LN-${Date.now()}-${uuidv4().slice(0, 6).toUpperCase()}`;
  const result = getDb()
    .prepare(
      `INSERT INTO loan_applications (application_ref, msme_id, business_name, bank_org_id, submitted_by_user_id, assessment_id, loan_type, amount_inr, tenure_months, purpose)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      ref,
      req.user!.msme_id,
      org.name,
      idbi.id,
      req.user!.id,
      req.body.assessment_id ?? null,
      req.body.loan_type ?? "working_capital",
      req.body.amount_inr,
      req.body.tenure_months ?? 36,
      req.body.purpose ?? null
    );
  const loan = getDb().prepare("SELECT * FROM loan_applications WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(loan);
});

apiRouter.get("/msme/loans", ...msmeAuth, (req: AuthRequest, res) => {
  const msmeId = req.user!.msme_id;
  if (!msmeId) return res.json([]);
  res.json(listLoansForMsme(msmeId));
});

apiRouter.get("/bank/loans", ...bankAuth, (req: AuthRequest, res) => {
  res.json(listLoansForBank(req.user!.organization_id));
});

apiRouter.patch("/bank/loans/:loanId", ...bankAuth, (req: AuthRequest, res) => {
  const loanId = Number(req.params.loanId);
  const { status, reviewer_notes } = req.body as { status?: string; reviewer_notes?: string };
  if (!status) return res.status(400).json({ detail: "status required" });
  const allowed = ["under_review", "approved", "rejected", "disbursed"];
  if (!allowed.includes(status)) return res.status(400).json({ detail: `status must be one of: ${allowed.join(", ")}` });
  const updated = updateLoanStatus(loanId, req.user!.organization_id, status, reviewer_notes ?? null);
  if (!updated) return res.status(404).json({ detail: "Loan not found" });
  res.json(updated);
});

function toSummary(r: { assessment_id: string; msme_id: string; business_name: string; overall_score: number; grade: string; overall_risk_level: string; audience: string; created_at: string }) {
  return {
    assessment_id: r.assessment_id,
    msme_id: r.msme_id,
    business_name: r.business_name,
    overall_score: r.overall_score,
    grade: r.grade,
    overall_risk_level: r.overall_risk_level,
    audience: r.audience,
    created_at: r.created_at,
  };
}

function canAccess(user: { role: string; msme_id: string | null; organization_id: number }, msmeId: string): boolean {
  if (MSME_ROLES.has(user.role)) return user.msme_id === msmeId;
  if (BANK_ROLES.has(user.role)) return bankHasMsme(user.organization_id, msmeId);
  if (GOVT_ROLES.has(user.role) || REG_ROLES.has(user.role)) return true;
  return false;
}
