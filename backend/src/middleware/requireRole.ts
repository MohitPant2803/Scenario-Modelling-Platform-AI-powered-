import type { NextFunction, Request, Response } from "express";
import { getCurrentUser, type UserRole } from "../lib/access.js";

export function requireRole(...roles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(currentUser.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
}
