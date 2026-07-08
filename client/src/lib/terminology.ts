export const LOAN_STATUS: Record<string, string> = {
  draft: "Draft Application",
  submitted: "Application Submitted",
  under_review: "Under Credit Review",
  approved: "Sanctioned",
  rejected: "Declined",
  disbursed: "Disbursed",
};

export const RISK_LEVEL: Record<string, string> = {
  low: "Low Credit Risk",
  moderate: "Moderate Credit Risk",
  elevated: "Elevated Credit Risk",
  high: "High Credit Risk",
  critical: "Critical Credit Risk",
};

export const DATA_FEED_STATUS: Record<string, string> = {
  received: "Received",
  processing: "Processing",
  processed: "Processed",
  failed: "Processing Failed",
  pending: "Pending Validation",
};

export const DATA_SOURCE: Record<string, string> = {
  manual: "Manual Financial Entry",
  tally: "Tally ERP Integration",
  zoho: "Zoho Books Integration",
  bank_statement: "Bank Statement Upload",
  erp_sync: "ERP Synchronisation",
};

export const LOAN_TYPE: Record<string, string> = {
  working_capital: "Working Capital Facility",
  term_loan: "Term Loan",
  equipment_finance: "Equipment Finance",
  green_finance: "Green / ESG-Linked Finance",
};

export const ROLE: Record<string, string> = {
  bank_admin: "Bank Administrator",
  credit_team: "Credit Analyst",
  risk_team: "Risk Officer",
  relationship_manager: "Relationship Manager",
  msme_owner: "Enterprise Proprietor",
  msme_viewer: "Enterprise Viewer (Read-Only)",
  govt_admin: "Ministry Administrator",
  scheme_officer: "Scheme Officer",
  sidbi_officer: "SIDBI Credit Officer",
  rbi_supervisor: "RBI Supervisory Officer",
  gstn_officer: "GSTN Compliance Officer",
  mca_officer: "MCA Filing Officer",
  nbfc_reviewer: "NBFC Credit Reviewer",
};

export const DIMENSION: Record<string, string> = {
  financial_resilience: "Financial Resilience",
  founder_capability: "Promoter Capability",
  cash_flow_health: "Cash Flow Adequacy",
  payment_behaviour: "Payment Discipline",
  credit_history_debt_servicing: "Credit History & Debt Servicing",
  operational_stability: "Operational Stability",
  legal_compliance: "Legal & Statutory Compliance",
  carbon_transition_risk: "Carbon Transition Risk",
  alternative_data_signals: "Alternative Credit Signals",
  market_sentiment: "Market Sentiment",
  tax_compliance: "Tax Compliance",
  operational_certifications: "Operational Certifications",
  government_policy_alignment: "Government Policy Alignment",
  product_demand_outlook: "Product Demand Outlook",
  esg_disclosure: "ESG Disclosure",
  supply_chain_resilience: "Supply Chain Resilience",
  governance_diversity: "Corporate Governance",
  insurance_business_continuity: "Insurance & Business Continuity",
  geographic_risk: "Geographic Concentration Risk",
  peer_benchmark: "Peer Benchmarking",
};

export const PORTALS = {
  bank: { portalLabel: "Lending Institution Portal", portalSub: "MSME Credit & Risk Management" },
  msme: { portalLabel: "Enterprise Portal", portalSub: "Financial Health & Credit Access" },
  govt: { portalLabel: "MSME Policy Intelligence", portalSub: "Ministry of MSME · Scheme Analytics" },
  regulatory: { portalLabel: "Regulatory Supervisory Portal", portalSub: "RBI · GSTN · MCA Oversight" },
} as const;

export const WELCOME = {
  bank: {
    title: "Portfolio Credit Intelligence",
    text: "Monitor MSME creditworthiness, initiate credit assessments, and manage the lending pipeline with AI-assisted risk analytics.",
  },
  msme: {
    title: "Enterprise Financial Health Overview",
    text: "Your 20-dimension Financial Health Score (FHS) supports credit underwriting, government scheme eligibility, and working capital access.",
  },
  govt: {
    title: "National MSME Registry & Analytics",
    text: "Track registered MSMEs, scheme uptake, sectoral health trends, and AI-powered policy recommendations.",
  },
  regulatory: {
    title: "Regulatory Supervisory Oversight",
    text: "Review elevated-risk credit assessments and statutory submissions across RBI, GSTN, and MCA jurisdictions.",
  },
} as const;

export const LABELS = {
  fhsShort: "Financial Health Score",
  platformName: "Financial Health Score Platform",
  signOut: "Sign Out",
} as const;

function titleCase(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatLoanStatus(status?: string | null) {
  if (!status) return "—";
  return LOAN_STATUS[status] ?? titleCase(status);
}

export function formatRiskLevel(level?: string | null) {
  if (!level) return "—";
  return RISK_LEVEL[level] ?? titleCase(level);
}

export function formatDataSource(source?: string | null) {
  if (!source) return "—";
  return DATA_SOURCE[source] ?? titleCase(source);
}

export function formatLoanType(type?: string | null) {
  if (!type) return "—";
  return LOAN_TYPE[type] ?? titleCase(type);
}

export function formatRole(role?: string | null) {
  if (!role) return "";
  return ROLE[role] ?? titleCase(role);
}

export function formatDimension(id?: string | null) {
  if (!id) return "—";
  return DIMENSION[id] ?? titleCase(id);
}

export function formatFeedStatus(status?: string | null) {
  if (!status) return "—";
  return DATA_FEED_STATUS[status] ?? titleCase(status);
}

export function riskBadgeClass(level?: string | null) {
  return level || "moderate";
}
