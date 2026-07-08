const VOLATILE_KEYS = new Set([
  "assessment_id",
  "generated_at",
  "orchestration_id",
  "run_id",
  "completed_at",
  "duration_ms",
  "started_at",
  "created_at",
  "submission_ref",
  "application_ref",
  "access_token",
  "scoring_orchestration_id",
]);

const TIMESTAMP_RE = /^\d{4}-\d{2}-\d{2}/;

export function normalizeSnapshot(obj: unknown, parentKey?: string): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeSnapshot(item, parentKey));
  }
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([key, value]) => {
        if (VOLATILE_KEYS.has(key)) {
          if (typeof value === "number") return [key, "<NUMBER>"];
          return [key, "<UUID>"];
        }
        return [key, normalizeSnapshot(value, key)];
      })
    );
  }
  if (typeof obj === "string" && parentKey && VOLATILE_KEYS.has(parentKey)) {
    return TIMESTAMP_RE.test(obj) ? "<TIMESTAMP>" : "<UUID>";
  }
  return obj;
}
