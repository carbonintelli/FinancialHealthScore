import { formatDimension } from "../lib/terminology";
import type { DimensionScore } from "../api/types";

export function DimensionBars({ dimensions, limit = 5 }: { dimensions: DimensionScore[]; limit?: number }) {
  if (!dimensions?.length) return null;
  const sorted = [...dimensions].sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, limit);
  const bottom = sorted.slice(-limit).reverse();

  const bar = (d: DimensionScore, type: "strong" | "weak") => (
    <div className="dim-bar-row" key={d.dimension}>
      <span className="dim-name" title={d.dimension}>
        {formatDimension(d.dimension)}
      </span>
      <div className="dim-bar-track">
        <div className={`dim-bar-fill dim-${type}`} style={{ width: `${d.score}%` }} />
      </div>
      <span className="dim-score">{d.score.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="dim-bars-grid">
      <div>
        <h4 className="dim-section-title">Key Credit Strengths</h4>
        {top.map((d) => bar(d, "strong"))}
      </div>
      <div>
        <h4 className="dim-section-title">Areas Requiring Attention</h4>
        {bottom.map((d) => bar(d, "weak"))}
      </div>
    </div>
  );
}
