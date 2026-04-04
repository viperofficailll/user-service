import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: number; role: string };
    }
  }
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Access token missing." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token!);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch {
    res
      .status(401)
      .json({ success: false, error: "Invalid or expired access token." });
  }
};
