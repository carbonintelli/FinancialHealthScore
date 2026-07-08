import demoFixture from "./demo-request.fixture.json" with { type: "json" };
import type { AssessmentRequest } from "./types.js";

export function buildDemoRequest(audience = "credit_team"): AssessmentRequest {
  return {
    ...(demoFixture as AssessmentRequest),
    audience: audience as AssessmentRequest["audience"],
  };
}
