import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { initDatabase } from "./db/index.js";
import { createApp } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

initDatabase();

const app = createApp();

app.use("/app", express.static(config.frontendPath, { index: "index.html" }));

app.listen(config.port, config.host, () => {
  console.log(`${config.appName} v${config.appVersion} (Node.js)`);
  console.log(`Platform: http://localhost:${config.port}/app/index.html`);
  console.log(`API: http://localhost:${config.port}/api/v1/health`);
  console.log(`AI agents: ${config.openaiApiKey ? "OpenAI enabled" : "rule-based mode"}`);
});

export default app;
