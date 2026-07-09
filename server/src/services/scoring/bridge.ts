import { config } from "../../config.js";
import type { AssessmentResult } from "./types.js";
import {
  assessDemo as nodeAssessDemo,
  assessRequest as nodeAssessRequest,
  getMockCarbonData,
} from "./index.js";
import { spawn } from "child_process";

export type { AssessmentResult } from "./types.js";
export { getMockCarbonData };

function useNodeScoring(): boolean {
  return config.scoringEngine !== "python";
}

/** Returns true when the legacy Python scoring bridge can run (pydantic + app package). */
export function isPythonBridgeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(
      config.pythonPath,
      ["-c", "import pydantic; from app.data.sample_msme import build_demo_request"],
      { cwd: config.rootPath, stdio: "ignore" },
    );
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

export function runPythonScoring(payload: Record<string, unknown>): Promise<AssessmentResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(config.pythonPath, [config.scoringBridgePath], {
      cwd: config.rootPath,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`Scoring bridge failed: ${stderr}`));
      try {
        resolve(JSON.parse(stdout) as AssessmentResult);
      } catch {
        reject(new Error(`Invalid scoring output: ${stdout.slice(0, 200)}`));
      }
    });
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
}

export async function assessDemo(audience = "credit_team", carbonData?: unknown): Promise<AssessmentResult> {
  if (useNodeScoring()) {
    return nodeAssessDemo(audience, carbonData);
  }
  return runPythonScoring({
    mode: "demo",
    audience,
    carbon_data: carbonData ?? getMockCarbonData("msme-demo-001"),
  });
}

export async function assessRequest(
  request: unknown,
  carbonData?: unknown,
  enrichmentLog?: unknown,
): Promise<AssessmentResult> {
  if (useNodeScoring()) {
    return nodeAssessRequest(request, carbonData, enrichmentLog);
  }
  return runPythonScoring({ mode: "assess", request, carbon_data: carbonData, enrichment_log: enrichmentLog });
}
