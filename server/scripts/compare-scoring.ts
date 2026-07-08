import { assessDemo } from "../src/services/scoring/index.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const carbon = {
  carbon_summary: { totalEmissionsTco2e: 142.5, carbonIntensityKgPerRevenue: 0.42, energyCostSharePct: 12.4, dataCompletenessPct: 78 },
  transactions_summary: { avgMonthlyInflowInr: 4100000, avgMonthlyOutflowInr: 3750000, inflowVolatilityPct: 18.5, latePaymentRatePct: 8.2, supplierConcentrationTop3Pct: 42, customerConcentrationTop3Pct: 38.5 },
  reports_overview: { reportingReadiness: "partial", brsrLiteReady: false, transitionPlanDocumented: false },
  mock_data: true,
};

function pyDemo(): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", ["server/scoring_bridge.py"], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error("python failed"));
      resolve(JSON.parse(stdout));
    });
    proc.stdin.write(JSON.stringify({ mode: "demo", audience: "credit_team", carbon_data: carbon }));
    proc.stdin.end();
  });
}

const node = await assessDemo("credit_team", carbon);
const py = await pyDemo();
console.log("Node overall:", node.overall_score, "Python:", (py as { overall_score: number }).overall_score);
const pyDims = (py as { dimension_scores: { dimension: string; score: number }[] }).dimension_scores;
for (const d of node.dimension_scores) {
  const p = pyDims.find((x) => x.dimension === d.dimension);
  const diff = p ? (d.score - p.score).toFixed(1) : "N/A";
  if (diff !== "0.0" && diff !== "N/A") console.log(d.dimension, "node", d.score, "py", p?.score, "diff", diff);
}
