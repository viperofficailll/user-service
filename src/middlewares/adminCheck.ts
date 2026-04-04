import type { Request, Response, NextFunction } from "express";

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({ success: false, error: "Forbidden: Admins only." });
    return;
  }
  next();
};
