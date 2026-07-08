import { getDb } from "../../db/index.js";
import type { AgentContext, AgentResult } from "./types.js";

export function logAgentRun(agentType: string, ctx: AgentContext, output: AgentResult): void {
  getDb()
    .prepare(
      `INSERT INTO agent_runs (run_id, agent_type, trigger_source, msme_id, assessment_id, input_json, output_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      output.run_id,
      agentType,
      ctx.triggerSource,
      ctx.msmeId ?? null,
      (ctx.assessment?.assessment_id as string) ?? null,
      JSON.stringify({ agent_type: agentType, msme_id: ctx.msmeId }),
      JSON.stringify(output)
    );
}

export function logOrchestration(orchestrationId: string, assessmentId: string, output: unknown): void {
  getDb()
    .prepare(
      `INSERT INTO agent_runs (run_id, agent_type, trigger_source, msme_id, assessment_id, input_json, output_json)
       VALUES (?, 'orchestration', 'orchestrator', NULL, ?, '{}', ?)`
    )
    .run(orchestrationId, assessmentId, JSON.stringify(output));
}

export function getOrchestrationRun(orchestrationId: string) {
  return getDb()
    .prepare(
      "SELECT output_json, created_at, assessment_id FROM agent_runs WHERE run_id = ? AND agent_type = 'orchestration'"
    )
    .get(orchestrationId) as { output_json: string; created_at: string; assessment_id: string | null } | undefined;
}

export function listAgentRuns(assessmentId?: string, limit = 50) {
  if (assessmentId) {
    return getDb()
      .prepare("SELECT * FROM agent_runs WHERE assessment_id = ? ORDER BY created_at DESC LIMIT ?")
      .all(assessmentId, limit);
  }
  return getDb().prepare("SELECT agent_type, COUNT(*) as count FROM agent_runs GROUP BY agent_type").all();
}
