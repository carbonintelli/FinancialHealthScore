import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { initDatabase } from "./db/index.js";
import { authRouter } from "./routes/auth.js";
import { apiRouter } from "./routes/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initDatabase();

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
    login: "/app/index.html",
    docs: "/api/v1/health",
    stakeholders: ["bank", "msme", "government", "regulatory"],
    ai_agents: ["credit_analysis", "policy_advisory", "regulatory_compliance", "data_enrichment", "report_narrative"],
    competition: "IDBI Innovate 2026",
  });
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1", apiRouter);

app.use("/app", express.static(config.frontendPath, { index: "index.html" }));

app.listen(config.port, config.host, () => {
  console.log(`${config.appName} v${config.appVersion} (Node.js)`);
  console.log(`Platform: http://localhost:${config.port}/app/index.html`);
  console.log(`API: http://localhost:${config.port}/api/v1/health`);
  console.log(`AI agents: ${config.openaiApiKey ? "OpenAI enabled" : "rule-based mode"}`);
});

export default app;
