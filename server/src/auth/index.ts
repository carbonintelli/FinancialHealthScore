import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config.js";
import type { UserRow } from "../db/index.js";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(user: UserRow): string {
  return jwt.sign(
    { sub: String(user.id), role: user.role, org_id: user.organization_id },
    config.secretKey,
    { expiresIn: `${config.jwtExpireMinutes}m` }
  );
}

export function decodeToken(token: string): { sub: string; role: string; org_id: number } {
  return jwt.verify(token, config.secretKey) as { sub: string; role: string; org_id: number };
}

export const BANK_ROLES = new Set(["bank_admin", "bank_credit", "bank_risk", "bank_rm"]);
export const MSME_ROLES = new Set(["msme_owner", "msme_viewer"]);
export const GOVT_ROLES = new Set(["govt_admin", "govt_scheme_officer", "govt_sidbi_officer"]);
export const REG_ROLES = new Set(["reg_rbi_supervisor", "reg_gstn_officer", "reg_mca_officer", "reg_nbfc_reviewer"]);
