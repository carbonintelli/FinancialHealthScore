import { Router } from "express";
import { getDb, type UserRow, type OrgRow } from "../db/index.js";
import { createToken, verifyPassword } from "../auth/index.js";
import { config } from "../config.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

export const authRouter = Router();

function userProfile(user: UserRow, org: OrgRow) {
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

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = getDb().prepare("SELECT * FROM users WHERE email = ?").get(String(email).toLowerCase()) as UserRow | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ detail: "Invalid email or password" });
  }
  if (!user.is_active) {
    return res.status(403).json({ detail: "Account is inactive" });
  }
  const org = getDb().prepare("SELECT * FROM organizations WHERE id = ?").get(user.organization_id) as OrgRow;
  res.json({
    access_token: createToken(user),
    token_type: "bearer",
    expires_in_minutes: config.jwtExpireMinutes,
    user: userProfile(user, org),
  });
});

authRouter.get("/me", requireAuth, (req: AuthRequest, res) => {
  const org = getDb().prepare("SELECT * FROM organizations WHERE id = ?").get(req.user!.organization_id) as OrgRow;
  res.json(userProfile(req.user!, org));
});

authRouter.get("/demo-credentials", (_req, res) => {
  res.json({
    bank: [
      { email: "admin@idbi.bank.in", password: "IDBI@2026", role: "Bank Admin" },
      { email: "credit@idbi.bank.in", password: "IDBI@2026", role: "Credit Team" },
      { email: "risk@idbi.bank.in", password: "IDBI@2026", role: "Risk Team" },
      { email: "rm@idbi.bank.in", password: "IDBI@2026", role: "Relationship Manager" },
    ],
    msme: [
      { email: "rajesh@shreeganesh.in", password: "MSME@2026", role: "MSME Owner (Auto Components)" },
      { email: "founder@greenfab.in", password: "MSME@2026", role: "MSME Owner (Textiles)" },
    ],
    government: [
      { email: "admin@msme.gov.in", password: "GOVT@2026", role: "MSME Ministry Admin" },
      { email: "schemes@msme.gov.in", password: "GOVT@2026", role: "Scheme Officer" },
      { email: "officer@sidbi.in", password: "GOVT@2026", role: "SIDBI Officer" },
    ],
    regulatory: [
      { email: "supervisor@rbi.org.in", password: "REG@2026", role: "RBI Supervisor" },
      { email: "compliance@gstn.gov.in", password: "REG@2026", role: "GSTN Compliance Officer" },
      { email: "filings@mca.gov.in", password: "REG@2026", role: "MCA Filing Officer" },
      { email: "nbfc@rbi.org.in", password: "REG@2026", role: "NBFC Reviewer" },
    ],
  });
});
