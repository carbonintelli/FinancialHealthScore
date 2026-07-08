import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { formatRole, LABELS, PORTALS } from "../lib/terminology";
import { initials } from "../lib/format";
import { PORTAL_CONFIG, iconSvg, type PortalKey } from "../lib/portals";

interface AppLayoutProps {
  portal: PortalKey;
  children: React.ReactNode;
}

export function AppLayout({ portal, children }: AppLayoutProps) {
  const { user, logout } = useAuth();
  const config = PORTAL_CONFIG[portal];
  const meta = PORTALS[portal];

  return (
    <div className={`layout ${config.theme}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/app/assets/logo.svg" alt="Financial Health Score" className="logo-img" width={44} height={44} />
          <div>
            <div className="brand-title">{LABELS.fhsShort}</div>
            <div className="brand-sub">{meta.portalSub}</div>
          </div>
        </div>
        <div className="portal-pill">{meta.portalLabel}</div>
        <nav className="sidebar-nav">
          {config.nav.map((item) =>
            item.external ? (
              <a key={item.id} href={item.path} className="nav-link" target="_blank" rel="noopener noreferrer">
                <span className="nav-icon">{iconSvg(item.icon)}</span>
                {item.label}
              </a>
            ) : (
              <NavLink
                key={item.id}
                to={item.path}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                end={item.id === "dashboard"}
              >
                <span className="nav-icon">{iconSvg(item.icon)}</span>
                {item.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">{initials(user?.full_name)}</div>
            <div className="user-meta">
              <div className="user-name">{user?.full_name}</div>
              <div className="user-role">{formatRole(user?.role)}</div>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={logout}>
            <span className="nav-icon">{iconSvg("logout")}</span>
            <span>{LABELS.signOut}</span>
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
