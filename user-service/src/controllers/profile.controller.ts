import type { Request, Response, NextFunction } from "express";
import { profileService } from "../services/profile.service.js";

export const profileHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { userId, role } = req.user!;

    const profile = await profileService(userId, role);

    if (!profile) {
      res.status(404).json({ success: false, error: "User not found." });
      return;
    }

    res.status(200).json({ success: true, profile });
  } catch (error) {
    next(error);
  }
};
