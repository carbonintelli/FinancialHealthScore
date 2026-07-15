import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATIC_FILE = /\.\w{1,8}$/;

/** Serve the React SPA build from client/dist at /app */
export function mountFrontend(app: Express) {
  const distPath = config.frontendPath;
  const indexPath = path.join(distPath, "index.html");
  const assetsPath = path.join(distPath, "assets");

  if (!fs.existsSync(indexPath)) {
    console.warn(
      `React client not built — run "cd client && npm install && npm run build". Falling back to legacy HTML frontend.`,
    );
    app.use("/app", express.static(config.legacyFrontendPath, { index: "index.html" }));
    return;
  }

  // Built JS/CSS + public assets (logo, favicon). Mounted at both /app/assets and /assets
  // so logos work whether Vite base is "/app/" or a reverse-proxy serves assets at "/assets/".
  if (fs.existsSync(assetsPath)) {
    app.use("/app/assets", express.static(assetsPath, { index: false, fallthrough: false }));
    app.use("/assets", express.static(assetsPath, { index: false, fallthrough: false }));
  }

  app.use("/app", express.static(distPath, { index: false }));

  app.get(["/app", "/app/*"], (req: Request, res: Response, next: NextFunction) => {
    // Never SPA-fallback file-looking paths (prevents logo.svg returning index.html)
    if (STATIC_FILE.test(req.path)) {
      res.status(404).type("text").send("Not found");
      return;
    }
    res.sendFile(indexPath, (err) => {
      if (err) next(err);
    });
  });
}
