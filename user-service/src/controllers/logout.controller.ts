import type { Request, Response, NextFunction } from "express";
import { logoutService } from "../services/logout.service.js";

export const handleUserLogout = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token: string | undefined =
      req.cookies?.refreshToken ||
      req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      res.status(401).json({ success: false, error: "Already logged out." });
      return;
    }

    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized." });
      return;
    }

    await logoutService(userId);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res
      .status(200)
      .json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
};
