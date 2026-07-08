import { Request, Response, NextFunction } from "express";
import { getDb, type UserRow } from "../db/index.js";
import { decodeToken } from "../auth/index.js";

export interface AuthRequest extends Request {
  user?: UserRow;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ detail: "Authentication required" });
    return;
  }
  try {
    const payload = decodeToken(header.slice(7));
    const user = getDb().prepare("SELECT * FROM users WHERE id = ?").get(Number(payload.sub)) as UserRow | undefined;
    if (!user || !user.is_active) {
      res.status(401).json({ detail: "User not found or inactive" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ detail: "Invalid token" });
  }
}

export function requireRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ detail: "Insufficient permissions" });
      return;
    }
    next();
  };
}
