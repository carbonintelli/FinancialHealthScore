import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Serve the React SPA build from client/dist at /app */
export function mountFrontend(app: Express) {
  const distPath = config.frontendPath;
  const indexPath = path.join(distPath, "index.html");

  if (!fs.existsSync(indexPath)) {
    console.warn(
      `React client not built — run "cd client && npm install && npm run build". Falling back to legacy HTML frontend.`,
    );
    app.use("/app", express.static(config.legacyFrontendPath, { index: "index.html" }));
    return;
  }

  app.use("/app", express.static(distPath, { index: false }));
  app.get(["/app", "/app/*"], (_req, res, next) => {
    if (_req.path.includes(".")) return next();
    res.sendFile(indexPath);
  });
}
