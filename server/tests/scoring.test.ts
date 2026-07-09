import { describe, it, expect, beforeAll } from "vitest";
import { assessDemo } from "../src/services/scoring/index.js";
import { validateScorerCatalog } from "../src/services/scoring/dimensions/index.js";
import { runPythonScoring, getMockCarbonData, isPythonBridgeAvailable } from "../src/services/scoring/bridge.js";

describe("Node scoring engine", () => {
  let pythonBridgeAvailable = false;

  beforeAll(async () => {
    pythonBridgeAvailable = await isPythonBridgeAvailable();
  });

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

  it("matches Python scoring engine for demo MSME", async (ctx) => {
    if (!pythonBridgeAvailable) {
      ctx.skip();
      return;
    }
    const carbon = getMockCarbonData("msme-demo-001");
    const node = await assessDemo("credit_team", carbon);
    const py = await runPythonScoring({ mode: "demo", audience: "credit_team", carbon_data: carbon });
    expect(node.overall_score).toBe(py.overall_score);
    expect(node.grade).toBe(py.grade);
    for (const dim of node.dimension_scores) {
      const pyDim = (py.dimension_scores as { dimension: string; score: number }[]).find(
        (d) => d.dimension === dim.dimension,
      );
      expect(pyDim?.score).toBe(dim.score);
    }
  }, 30000);
});
