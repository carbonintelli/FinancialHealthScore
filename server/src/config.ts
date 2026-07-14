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
  appVersion: "2.1.0",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  useMockIntegrations: process.env.USE_MOCK_INTEGRATIONS !== "false",
  aaApiKey: process.env.ACCOUNT_AGGREGATOR_API_KEY || "",
  aaBaseUrl: process.env.ACCOUNT_AGGREGATOR_BASE_URL || "https://api.accountaggregator.ndml.in",
  aaConsentRedirectBase: process.env.AA_CONSENT_REDIRECT_URL || "https://consent.accountaggregator.example/authorize",
  upiAnalyticsApiKey: process.env.UPI_ANALYTICS_API_KEY || "",
  upiAnalyticsBaseUrl: process.env.UPI_ANALYTICS_BASE_URL || "https://api.upi-analytics.example",
  epfoApiKey: process.env.EPFO_API_KEY || "",
  epfoBaseUrl: process.env.EPFO_BASE_URL || "https://api.epfo.gov.in",
  webhookSecret: process.env.WEBHOOK_SECRET || "",
  carbonApiKey: process.env.CARBON_INTELLIGENCE_API_KEY || "",
  carbonBaseUrl: process.env.CARBON_INTELLIGENCE_BASE_URL || "https://ci.sustainow.in/api",
  tallyApiUrl: process.env.TALLY_API_URL || "",
  tallyApiKey: process.env.TALLY_API_KEY || "",
  zohoBooksApiUrl: process.env.ZOHO_BOOKS_API_URL || "https://books.zoho.in/api/v3",
  zohoClientId: process.env.ZOHO_CLIENT_ID || "",
  zohoClientSecret: process.env.ZOHO_CLIENT_SECRET || "",
  zohoRefreshToken: process.env.ZOHO_REFRESH_TOKEN || "",
  zohoOrganizationId: process.env.ZOHO_ORGANIZATION_ID || "",
  frontendPath: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist"),
  legacyFrontendPath: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../frontend"),
  rootPath: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.."),
};
