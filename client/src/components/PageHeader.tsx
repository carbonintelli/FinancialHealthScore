import { LABELS } from "../lib/terminology";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, badge, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-text">
        <p className="page-eyebrow">{LABELS.platformName}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {badge && <div className="page-header-badge">{badge}</div>}
      {actions}
    </header>
  );
}
