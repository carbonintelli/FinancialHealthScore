import { randomBytes } from "crypto";
import { getDb } from "../db/index.js";
import { hashPassword, createToken } from "../auth/index.js";
import { config } from "../config.js";
import { saveMsmeProfile, type MsmeFinancialData } from "./msme-profile.js";
import { assessFromProfile } from "./msme-assess.js";

export interface RegisterMsmeInput {
  email: string;
  password: string;
  full_name: string;
  business_name: string;
  sector?: string;
  gstin?: string | null;
  pan?: string | null;
  udyam_number?: string | null;
  state?: string | null;
  pincode?: string | null;
  employee_count?: number | null;
  years_in_operation?: number | null;
  annual_turnover_inr?: number | null;
  financial_data?: MsmeFinancialData | null;
  run_assessment?: boolean;
}

function userProfile(user: {
  id: number;
  email: string;
  full_name: string;
  role: string;
  organization_id: number;
  msme_id: string | null;
}, org: { id: number; name: string; org_type: string }) {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    organization_id: org.id,
    organization_name: org.name,
    organization_type: org.org_type,
    msme_id: user.msme_id,
  };
}

export async function registerMsme(input: RegisterMsmeInput) {
  const email = input.email.toLowerCase().trim();
  if (!email || !input.password || input.password.length < 8) {
    throw new Error("Valid email address and password (minimum 8 characters) are required");
  }
  if (!input.business_name?.trim() || !input.full_name?.trim()) {
    throw new Error("Registered business name and authorised signatory name are required");
  }

  const existing = getDb().prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("This email address is already registered");

  const msmeId = `msme-${randomBytes(4).toString("hex")}`;
  const db = getDb();

  const orgResult = db
    .prepare("INSERT INTO organizations (name, org_type, registration_id) VALUES (?, 'msme', ?)")
    .run(input.business_name.trim(), input.udyam_number?.trim() || null);
  const orgId = Number(orgResult.lastInsertRowid);

  const userResult = db
    .prepare(
      `INSERT INTO users (email, password_hash, full_name, role, organization_id, msme_id)
       VALUES (?, ?, ?, 'msme_owner', ?, ?)`,
    )
    .run(email, hashPassword(input.password), input.full_name.trim(), orgId, msmeId);
  const userId = Number(userResult.lastInsertRowid);

  const idbi = db.prepare("SELECT id FROM organizations WHERE registration_id = 'BANK-IDBI-001'").get() as
    | { id: number }
    | undefined;
  if (idbi) {
    db.prepare(
      `INSERT INTO portfolio_links (bank_org_id, msme_id, business_name, sector, gstin)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(idbi.id, msmeId, input.business_name.trim(), input.sector ?? "general", input.gstin ?? null);
  }

  const financialData: MsmeFinancialData = {
    ...(input.financial_data ?? {}),
    accounting: input.financial_data?.accounting ?? (input.annual_turnover_inr
      ? {
          revenue_inr: input.annual_turnover_inr,
          cost_of_goods_inr: input.annual_turnover_inr * 0.65,
          operating_expenses_inr: input.annual_turnover_inr * 0.2,
          current_assets_inr: input.annual_turnover_inr * 0.3,
          current_liabilities_inr: input.annual_turnover_inr * 0.18,
          total_debt_inr: input.annual_turnover_inr * 0.25,
          equity_inr: input.annual_turnover_inr * 0.35,
        }
      : undefined),
  };

  saveMsmeProfile({
    msme_id: msmeId,
    organization_id: orgId,
    business_name: input.business_name.trim(),
    sector: input.sector ?? "general",
    gstin: input.gstin ?? null,
    pan: input.pan ?? null,
    udyam_number: input.udyam_number ?? null,
    state: input.state ?? null,
    pincode: input.pincode ?? null,
    employee_count: input.employee_count ?? null,
    years_in_operation: input.years_in_operation ?? null,
    annual_turnover_inr: input.annual_turnover_inr ?? null,
    financial_data: financialData,
  });

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as {
    id: number;
    email: string;
    full_name: string;
    role: string;
    organization_id: number;
    msme_id: string;
    password_hash: string;
    is_active: number;
  };
  const org = db.prepare("SELECT * FROM organizations WHERE id = ?").get(orgId) as {
    id: number;
    name: string;
    org_type: string;
  };

  let assessment: Awaited<ReturnType<typeof assessFromProfile>> | null = null;
  if (input.run_assessment !== false && (financialData.accounting || input.annual_turnover_inr)) {
    assessment = await assessFromProfile({
      userId,
      msmeId,
      audience: "credit_team",
      source: "registration",
      includeCarbonIntelligence: true,
    });
  }

  return {
    access_token: createToken(user),
    token_type: "bearer",
    expires_in_minutes: config.jwtExpireMinutes,
    user: userProfile(user, org),
    msme_id: msmeId,
    assessment,
  };
}
