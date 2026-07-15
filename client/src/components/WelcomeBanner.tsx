import { WELCOME } from "../lib/terminology";
import type { PortalKey } from "../lib/portals";
import { FhsLogo } from "./FhsLogo";

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
        <FhsLogo size={56} title="" />
        <span>IDBI Innovate 2026</span>
      </div>
    </div>
  );
}
