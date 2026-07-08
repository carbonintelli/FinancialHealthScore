import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env") });

export const config = {
  port: parseInt(process.env.PORT || "8080", 10),
  host: process.env.HOST || "0.0.0.0",
  secretKey: process.env.SECRET_KEY || "change-me-in-production-use-long-random-string",
  jwtExpireMinutes: parseInt(process.env.JWT_EXPIRE_MINUTES || "480", 10),
  databaseUrl: process.env.DATABASE_URL || "data/financial_health_node.db",
  appName: "Financial Health Score",
  appVersion: "2.0.0",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  useMockIntegrations: process.env.USE_MOCK_INTEGRATIONS !== "false",
  carbonApiKey: process.env.CARBON_INTELLIGENCE_API_KEY || "",
  carbonBaseUrl: process.env.CARBON_INTELLIGENCE_BASE_URL || "https://ci.sustainow.in/api",
  pythonPath: process.env.PYTHON_PATH || "python3",
  scoringBridgePath: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../scoring_bridge.py"),
  frontendPath: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend"),
  rootPath: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
};
