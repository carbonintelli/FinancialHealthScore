/** @deprecated Use orchestrator.ts — re-exports for backward compatibility */
export {
  orchestrateAgents,
  orchestrateAssessment,
  getArchitecture,
  runCreditAgent,
  runPolicyAgent,
  runRegulatoryAgent,
  runEnrichmentAgent,
} from "./orchestrator.js";
export type { AgentContext, AgentResult, OrchestrationResult } from "./types.js";
