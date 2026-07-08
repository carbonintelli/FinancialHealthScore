export const SCHEMA = `
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  registration_id TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  msme_id TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS portfolio_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bank_org_id INTEGER NOT NULL,
  msme_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  sector TEXT DEFAULT 'general',
  gstin TEXT,
  relationship_manager TEXT,
  credit_limit_inr REAL,
  onboarded_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bank_org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS assessment_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id TEXT UNIQUE NOT NULL,
  msme_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  requested_by_user_id INTEGER NOT NULL,
  audience TEXT DEFAULT 'credit_team',
  overall_score REAL NOT NULL,
  grade TEXT NOT NULL,
  overall_risk_level TEXT NOT NULL,
  result_json TEXT NOT NULL,
  agent_insights_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (requested_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS loan_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_ref TEXT UNIQUE NOT NULL,
  msme_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  bank_org_id INTEGER NOT NULL,
  submitted_by_user_id INTEGER NOT NULL,
  assessment_id TEXT,
  loan_type TEXT DEFAULT 'working_capital',
  amount_inr REAL NOT NULL,
  tenure_months INTEGER DEFAULT 36,
  purpose TEXT,
  status TEXT DEFAULT 'submitted',
  reviewer_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (bank_org_id) REFERENCES organizations(id),
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'info',
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS regulatory_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_ref TEXT UNIQUE NOT NULL,
  msme_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  submitted_by_user_id INTEGER NOT NULL,
  regulator_type TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  payload_json TEXT NOT NULL,
  agent_review_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS scheme_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_ref TEXT UNIQUE NOT NULL,
  msme_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  scheme_code TEXT NOT NULL,
  submitted_by_user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'submitted',
  agent_recommendation_json TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT UNIQUE NOT NULL,
  agent_type TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  msme_id TEXT,
  assessment_id TEXT,
  input_json TEXT,
  output_json TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
`;
