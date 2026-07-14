import { describe, it, expect } from "vitest";
import { assessDemo, getMockCarbonData } from "../src/services/scoring/index.js";
import { validateScorerCatalog } from "../src/services/scoring/dimensions/index.js";

describe("Node scoring engine", () => {
  it("scorer catalog aligns with 20 dimension agents", () => {
    expect(validateScorerCatalog()).toBe(true);
  });

  it("demo assessment produces 20 dimensions and B+ grade", async () => {
    const result = await assessDemo("credit_team");
    expect(result.dimension_scores).toHaveLength(20);
    expect(result.overall_score).toBeGreaterThan(70);
    expect(result.grade).toBe("B+");
    expect(result.metadata.scoring_engine).toBe("nodejs");
    expect(result.metadata.scoring_agents_run).toBe(20);
  });

  it("demo assessment accepts carbon enrichment data", async () => {
    const carbon = getMockCarbonData("msme-demo-001");
    const result = await assessDemo("credit_team", carbon);
    expect(result.dimension_scores).toHaveLength(20);
    expect(result.overall_score).toBeGreaterThan(0);
    expect(result.metadata.scoring_engine).toBe("nodejs");
  });
});
