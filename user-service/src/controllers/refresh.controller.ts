import type { Request, Response, NextFunction } from "express";
import { refreshService } from "../services/refresh.service.js";

export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token: string | undefined =
      req.cookies?.refreshToken ?? req.body?.refreshToken;
      

    if (!token) {
      res.status(401).json({ success: false, error: "Refresh token missing." });
      return;
    }

    const { accessToken, refreshToken } = await refreshService(token);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true, accessToken });
  } catch (err) {
    if (err instanceof Error && err.message === "INVALID_TOKEN") {
      res
        .status(401)
        .json({ success: false, error: "Invalid or expired refresh token." });
      return;
    }
    next(err);
  }
};
