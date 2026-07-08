import type { ReactNode } from "react";

export type PortalKey = "bank" | "msme" | "govt" | "regulatory";

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: string;
  external?: boolean;
}

export interface PortalConfig {
  key: PortalKey;
  theme: string;
  nav: NavItem[];
}

export const PORTAL_CONFIG: Record<PortalKey, PortalConfig> = {
  bank: {
    key: "bank",
    theme: "theme-bank",
    nav: [
      { id: "dashboard", path: "/bank/dashboard", label: "Executive Dashboard", icon: "dashboard" },
      { id: "portfolio", path: "/bank/portfolio", label: "MSME Lending Portfolio", icon: "portfolio" },
      { id: "loans", path: "/bank/loans", label: "Credit Applications", icon: "loans" },
      { id: "api", path: "/api/v1/health", label: "Platform Health", icon: "api", external: true },
    ],
  },
  msme: {
    key: "msme",
    theme: "theme-msme",
    nav: [
      { id: "dashboard", path: "/msme/dashboard", label: "Enterprise Dashboard", icon: "dashboard" },
      { id: "profile", path: "/msme/profile", label: "Financial Data Submission", icon: "portfolio" },
      { id: "import", path: "/msme/import", label: "ERP Data Integration", icon: "portfolio" },
      { id: "assess", path: "/msme/assess", label: "Credit Assessment", icon: "assess" },
      { id: "report", path: "/msme/report", label: "Credit Assessment Report", icon: "report" },
      { id: "loans", path: "/msme/loans", label: "Credit Applications", icon: "loans" },
    ],
  },
  govt: {
    key: "govt",
    theme: "theme-govt",
    nav: [
      { id: "dashboard", path: "/govt/dashboard", label: "National MSME Dashboard", icon: "dashboard" },
      { id: "schemes", path: "/govt/schemes", label: "Scheme Advisory", icon: "schemes" },
    ],
  },
  regulatory: {
    key: "regulatory",
    theme: "theme-regulatory",
    nav: [
      { id: "dashboard", path: "/regulatory/dashboard", label: "Supervisory Dashboard", icon: "dashboard" },
      { id: "review", path: "/regulatory/review", label: "Compliance Review", icon: "review" },
    ],
  },
};

export function portalForOrgType(orgType?: string): PortalKey | null {
  if (orgType === "bank") return "bank";
  if (orgType === "msme") return "msme";
  if (orgType === "government") return "govt";
  if (orgType === "regulatory") return "regulatory";
  return null;
}

export function iconSvg(name: string): ReactNode {
  const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2 };
  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "portfolio":
      return (
        <svg {...props}>
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case "assess":
      return (
        <svg {...props}>
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
        </svg>
      );
    case "loans":
      return (
        <svg {...props}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      );
    case "report":
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "schemes":
      return (
        <svg {...props}>
          <path d="M3 21h18" />
          <path d="M5 21V7l8-4v18" />
          <path d="M19 21V11l-6-4" />
        </svg>
      );
    case "review":
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      );
    case "api":
      return (
        <svg {...props}>
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    case "logout":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
  }
  return null;
}
