import { WELCOME } from "../lib/terminology";
import type { PortalKey } from "../lib/portals";

export function WelcomeBanner({ portal }: { portal: PortalKey }) {
  const m = WELCOME[portal];
  return (
    <div className="welcome-banner">
      <div className="welcome-banner-glow" />
      <div className="welcome-banner-content">
        <h2>{m.title}</h2>
        <p>{m.text}</p>
      </div>
      <div className="welcome-banner-badge">
        <img src="/app/assets/logo.svg" alt="" width={56} height={56} />
        <span>IDBI Innovate 2026</span>
      </div>
    </div>
  );
}
