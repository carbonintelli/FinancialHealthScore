import bcrypt from "bcryptjs";
import type Database from "better-sqlite3";

const BANK_PASSWORD = bcrypt.hashSync("IDBI@2026", 10);
const MSME_PASSWORD = bcrypt.hashSync("MSME@2026", 10);
const GOVT_PASSWORD = bcrypt.hashSync("GOVT@2026", 10);
const REG_PASSWORD = bcrypt.hashSync("REG@2026", 10);

export function seedDatabase(db: Database.Database): void {
  const existing = db.prepare("SELECT id FROM organizations LIMIT 1").get();
  if (existing) return;

  const insertOrg = db.prepare(
    "INSERT INTO organizations (name, org_type, registration_id) VALUES (?, ?, ?)"
  );

  const idbi = insertOrg.run("IDBI Bank — MSME Lending", "bank", "BANK-IDBI-001").lastInsertRowid as number;
  const shree = insertOrg.run("Shree Ganesh Auto Components Pvt Ltd", "msme", "UDYAM-MH-12-0012345").lastInsertRowid as number;
  const green = insertOrg.run("GreenFab Textiles LLP", "msme", "UDYAM-GJ-24-0098765").lastInsertRowid as number;
  const msmeMin = insertOrg.run("Ministry of MSME — Scheme Administration", "government", "GOVT-MSME-001").lastInsertRowid as number;
  const sidbi = insertOrg.run("SIDBI — Refinance & Development", "government", "GOVT-SIDBI-001").lastInsertRowid as number;
  const rbi = insertOrg.run("Reserve Bank of India — Supervision", "regulatory", "REG-RBI-001").lastInsertRowid as number;
  const gstn = insertOrg.run("GSTN — Tax Compliance Authority", "regulatory", "REG-GSTN-001").lastInsertRowid as number;

  const insertUser = db.prepare(
    "INSERT INTO users (email, password_hash, full_name, role, organization_id, msme_id) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const bankUsers: [string, string, string, number, string | null][] = [
    ["admin@idbi.bank.in", "Priya Sharma", "bank_admin", idbi, null],
    ["credit@idbi.bank.in", "Amit Verma", "bank_credit", idbi, null],
    ["risk@idbi.bank.in", "Neha Kapoor", "bank_risk", idbi, null],
    ["rm@idbi.bank.in", "Rahul Mehta", "bank_rm", idbi, null],
  ];
  for (const [email, name, role, orgId, msmeId] of bankUsers) {
    insertUser.run(email, BANK_PASSWORD, name, role, orgId, msmeId);
  }

  const msmeUsers: [string, string, string, number, string][] = [
    ["rajesh@shreeganesh.in", "Rajesh Patil", "msme_owner", shree, "msme-demo-001"],
    ["accounts@shreeganesh.in", "Sunita Patil", "msme_viewer", shree, "msme-demo-001"],
    ["founder@greenfab.in", "Anita Desai", "msme_owner", green, "msme-greenfab-002"],
  ];
  for (const [email, name, role, orgId, msmeId] of msmeUsers) {
    insertUser.run(email, MSME_PASSWORD, name, role, orgId, msmeId);
  }

  const govtUsers: [string, string, string, number][] = [
    ["admin@msme.gov.in", "Dr. Kavita Rao", "govt_admin", msmeMin],
    ["schemes@msme.gov.in", "Vikram Singh", "govt_scheme_officer", msmeMin],
    ["officer@sidbi.in", "Meera Joshi", "govt_sidbi_officer", sidbi],
  ];
  for (const [email, name, role, orgId] of govtUsers) {
    insertUser.run(email, GOVT_PASSWORD, name, role, orgId, null);
  }

  const regUsers: [string, string, string, number][] = [
    ["supervisor@rbi.org.in", "Arjun Nair", "reg_rbi_supervisor", rbi],
    ["compliance@gstn.gov.in", "Deepa Krishnan", "reg_gstn_officer", gstn],
    ["filings@mca.gov.in", "Sanjay Reddy", "reg_mca_officer", rbi],
    ["nbfc@rbi.org.in", "Lakshmi Iyer", "reg_nbfc_reviewer", rbi],
  ];
  for (const [email, name, role, orgId] of regUsers) {
    insertUser.run(email, REG_PASSWORD, name, role, orgId, null);
  }

  const insertPortfolio = db.prepare(
    "INSERT INTO portfolio_links (bank_org_id, msme_id, business_name, sector, gstin, relationship_manager, credit_limit_inr) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insertPortfolio.run(idbi, "msme-demo-001", "Shree Ganesh Auto Components Pvt Ltd", "auto_components", "27AABCS1234F1Z5", "Rahul Mehta", 15000000);
  insertPortfolio.run(idbi, "msme-greenfab-002", "GreenFab Textiles LLP", "textiles", "24AABCG5678H1Z2", "Rahul Mehta", 8000000);
  insertPortfolio.run(idbi, "msme-techparts-003", "TechParts Engineering Works", "manufacturing", "29AABCT9012K1Z8", "Amit Verma", 5000000);
}
