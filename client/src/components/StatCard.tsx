import { iconSvg } from "../lib/portals";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: string;
  trend?: string;
  variant?: "" | "success" | "risk";
}

export function StatCard({ label, value, icon = "score", trend, variant = "" }: StatCardProps) {
  const variantClass = variant ? ` stat-${variant}` : "";
  return (
    <div className={`stat-card${variantClass}`}>
      <div className="stat-icon">{iconSvg(icon)}</div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {trend && <div className="stat-trend">{trend}</div>}
      </div>
    </div>
  );
}
