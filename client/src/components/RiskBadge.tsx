import { formatRiskLevel, riskBadgeClass } from "../lib/terminology";

export function RiskBadge({ level }: { level?: string | null }) {
  if (!level) return <>—</>;
  const cls = riskBadgeClass(level);
  const label = formatRiskLevel(level);
  return (
    <span className={`badge badge-${cls}`} title={label}>
      {label}
    </span>
  );
}
