import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: "*", credentials: true }));
  app.use(express.json({ limit: "10mb" }));

  app.get("/api", (_req, res) => {
    res.json({
      service: config.appName,
      version: config.appVersion,
      server: "nodejs",
      dimension_count: 20,
      platform: "/app/",
      login: "/app/",
      docs: "/api/v1/health",
      stakeholders: ["bank", "msme", "government", "regulatory"],
      ai_agents: [
        "credit_analysis",
        "policy_advisory",
        "regulatory_compliance",
        "data_enrichment",
        "report_narrative",
      ],
      competition: "IDBI Innovate 2026",
    });
  });

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1", apiRouter);

  return app;
}
