/**
 * Financial Health Score — banking & MSME terminology registry
 * Centralises display labels for credit, risk, and enterprise workflows.
 */
const FHS_TERMS = (() => {
  const LOAN_STATUS = {
    draft: 'Draft Application',
    submitted: 'Application Submitted',
    under_review: 'Under Credit Review',
    approved: 'Sanctioned',
    rejected: 'Declined',
    disbursed: 'Disbursed',
  };

  const RISK_LEVEL = {
    low: 'Low Credit Risk',
    moderate: 'Moderate Credit Risk',
    elevated: 'Elevated Credit Risk',
    high: 'High Credit Risk',
    critical: 'Critical Credit Risk',
  };

  const DATA_FEED_STATUS = {
    received: 'Received',
    processing: 'Processing',
    processed: 'Processed',
    failed: 'Processing Failed',
    pending: 'Pending Validation',
  };

  const DATA_SOURCE = {
    manual: 'Manual Financial Entry',
    tally: 'Tally ERP Integration',
    zoho: 'Zoho Books Integration',
    bank_statement: 'Bank Statement Upload',
    erp_sync: 'ERP Synchronisation',
  };

  const LOAN_TYPE = {
    working_capital: 'Working Capital Facility',
    term_loan: 'Term Loan',
    equipment_finance: 'Equipment Finance',
    green_finance: 'Green / ESG-Linked Finance',
  };

  const ROLE = {
    bank_admin: 'Bank Administrator',
    credit_team: 'Credit Analyst',
    risk_team: 'Risk Officer',
    relationship_manager: 'Relationship Manager',
    msme_owner: 'Enterprise Proprietor',
    msme_viewer: 'Enterprise Viewer (Read-Only)',
    govt_admin: 'Ministry Administrator',
    scheme_officer: 'Scheme Officer',
    sidbi_officer: 'SIDBI Credit Officer',
    rbi_supervisor: 'RBI Supervisory Officer',
    gstn_officer: 'GSTN Compliance Officer',
    mca_officer: 'MCA Filing Officer',
    nbfc_reviewer: 'NBFC Credit Reviewer',
  };

  const DIMENSION = {
    financial_resilience: 'Financial Resilience',
    founder_capability: 'Promoter Capability',
    cash_flow_health: 'Cash Flow Adequacy',
    payment_behaviour: 'Payment Discipline',
    credit_history_debt_servicing: 'Credit History & Debt Servicing',
    operational_stability: 'Operational Stability',
    legal_compliance: 'Legal & Statutory Compliance',
    carbon_transition_risk: 'Carbon Transition Risk',
    alternative_data_signals: 'Alternative Credit Signals',
    market_sentiment: 'Market Sentiment',
    tax_compliance: 'Tax Compliance',
    operational_certifications: 'Operational Certifications',
    government_policy_alignment: 'Government Policy Alignment',
    product_demand_outlook: 'Product Demand Outlook',
    esg_disclosure: 'ESG Disclosure',
    supply_chain_resilience: 'Supply Chain Resilience',
    governance_diversity: 'Corporate Governance',
    insurance_business_continuity: 'Insurance & Business Continuity',
    geographic_risk: 'Geographic Concentration Risk',
    peer_benchmark: 'Peer Benchmarking',
  };

  const PORTALS = {
    bank: {
      portalLabel: 'Lending Institution Portal',
      portalSub: 'MSME Credit & Risk Management',
      eyebrow: 'IDBI Bank · MSME Lending Platform',
    },
    msme: {
      portalLabel: 'Enterprise Portal',
      portalSub: 'Financial Health & Credit Access',
      eyebrow: 'MSME Enterprise Services',
    },
    govt: {
      portalLabel: 'MSME Policy Intelligence',
      portalSub: 'Ministry of MSME · Scheme Analytics',
      eyebrow: 'Government of India · MSME Ministry',
    },
    regulatory: {
      portalLabel: 'Regulatory Supervisory Portal',
      portalSub: 'RBI · GSTN · MCA Oversight',
      eyebrow: 'Regulatory Supervision & Compliance',
    },
  };

  const NAV = {
    bank: {
      dashboard: 'Executive Dashboard',
      portfolio: 'MSME Lending Portfolio',
      loans: 'Credit Applications',
      api: 'Platform Health',
    },
    msme: {
      dashboard: 'Enterprise Dashboard',
      profile: 'Financial Data Submission',
      import: 'ERP Data Integration',
      assess: 'Credit Assessment',
      report: 'Credit Assessment Report',
      loans: 'Credit Applications',
    },
    govt: {
      dashboard: 'National MSME Dashboard',
      schemes: 'Scheme Advisory',
    },
    regulatory: {
      dashboard: 'Supervisory Dashboard',
      review: 'Compliance Review',
    },
  };

  const WELCOME = {
    bank: {
      title: 'Portfolio Credit Intelligence',
      text: 'Monitor MSME creditworthiness, initiate credit assessments, and manage the lending pipeline with AI-assisted risk analytics.',
    },
    msme: {
      title: 'Enterprise Financial Health Overview',
      text: 'Your 20-dimension Financial Health Score (FHS) supports credit underwriting, government scheme eligibility, and working capital access.',
    },
    govt: {
      title: 'National MSME Registry & Analytics',
      text: 'Track registered MSMEs, scheme uptake, sectoral health trends, and AI-powered policy recommendations.',
    },
    regulatory: {
      title: 'Regulatory Supervisory Oversight',
      text: 'Review elevated-risk credit assessments and statutory submissions across RBI, GSTN, and MCA jurisdictions.',
    },
  };

  const LABELS = {
    fhs: 'Financial Health Score (FHS)',
    fhsShort: 'Financial Health Score',
    creditGrade: 'Credit Grade',
    riskRating: 'Credit Risk Rating',
    udyamId: 'Udyam Registration Number',
    gstin: 'GSTIN',
    pan: 'Permanent Account Number (PAN)',
    turnover: 'Annual Turnover',
    revenue: 'Revenue from Operations',
    netProfit: 'Net Profit After Tax',
    currentAssets: 'Current Assets',
    currentLiabilities: 'Current Liabilities',
    totalDebt: 'Total Outstanding Debt',
    creditLimit: 'Sanctioned Credit Limit',
    relationshipManager: 'Relationship Manager (RM)',
    assessmentHistory: 'Credit Assessment History',
    dataFeedHistory: 'Financial Data Submission Log',
    dimensionBreakdown: 'Dimensional Credit Analysis',
    topStrengths: 'Key Credit Strengths',
    areasToImprove: 'Areas Requiring Attention',
    creditDecision: 'Credit Decision Recommendation',
    signOut: 'Sign Out',
    platformName: 'Financial Health Score Platform',
  };

  function formatLoanStatus(status) {
    if (!status) return '—';
    return LOAN_STATUS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatRiskLevel(level) {
    if (!level) return '—';
    return RISK_LEVEL[level] || level.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatDataSource(source) {
    if (!source) return '—';
    return DATA_SOURCE[source] || source.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatLoanType(type) {
    if (!type) return '—';
    return LOAN_TYPE[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatRole(role) {
    if (!role) return '';
    return ROLE[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatDimension(id) {
    if (!id) return '—';
    return DIMENSION[id] || id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatFeedStatus(status) {
    if (!status) return '—';
    return DATA_FEED_STATUS[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function riskBadgeClass(level) {
    return level || 'moderate';
  }

  return {
    LOAN_STATUS,
    RISK_LEVEL,
    DATA_FEED_STATUS,
    DATA_SOURCE,
    LOAN_TYPE,
    ROLE,
    DIMENSION,
    PORTALS,
    NAV,
    WELCOME,
    LABELS,
    formatLoanStatus,
    formatRiskLevel,
    formatDataSource,
    formatLoanType,
    formatRole,
    formatDimension,
    formatFeedStatus,
    riskBadgeClass,
  };
})();
