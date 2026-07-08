import { gradeClass, scoreColor } from "../lib/format";
import { RiskBadge } from "./RiskBadge";

interface ScoreRingProps {
  score?: number | null;
  grade?: string | null;
  size?: "sm" | "md" | "lg";
  label?: string;
}

export function ScoreRing({ score, grade, size = "lg", label }: ScoreRingProps) {
  const pct = score != null ? Math.min(100, Math.max(0, score)) : 0;
  const color = scoreColor(score);
  const sizeClass = size === "sm" ? "score-ring-sm" : size === "md" ? "score-ring-md" : "score-ring-lg";

  return (
    <div className={`score-ring-wrap ${sizeClass}`} style={{ ["--pct" as string]: pct, ["--ring-color" as string]: color }}>
      <div className="score-ring">
        <div className="score-ring-inner">
          <span className="score-value">{score != null ? score.toFixed(1) : "—"}</span>
          {grade && <span className={gradeClass(grade)}>{grade}</span>}
          {label && <span className="score-label">{label}</span>}
        </div>
      </div>
    </div>
  );
}

interface ScoreHeroProps {
  score?: number | null;
  grade?: string | null;
  riskLevel?: string | null;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function ScoreHero({ score, grade, riskLevel, title, subtitle, children }: ScoreHeroProps) {
  return (
    <div className="score-hero-card">
      <ScoreRing score={score} grade={grade} label="out of 100" />
      <div className="score-hero-body">
        <h2>{title || "Financial Health Score"}</h2>
        <div className="score-hero-meta">
          {riskLevel && <RiskBadge level={riskLevel} />}
          {grade && <span className={gradeClass(grade)}>{grade} Credit Grade</span>}
        </div>
        {subtitle && <p className="score-hero-sub">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
