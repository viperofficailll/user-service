import type { Request, Response, NextFunction } from "express";
import { loginSchema } from "../schemas/user.schema.js";
import { loginService } from "../services/login.service.js";

const ERROR_MAP: Record<string, { status: number; message: string }> = {
  INVALID_CREDENTIALS: { status: 401, message: "Invalid email or password." },
  ACCOUNT_PENDING: {
    status: 403,
    message: "Your account is pending activation.",
  },
  ACCOUNT_BLOCKED: { status: 403, message: "Your account has been blocked." },
};

export const userLoginHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { email, password } = parsed.data;
    const { accessToken, refreshToken, user } = await loginService(
      email,
      password,
    );

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true, accessToken, user });
  } catch (err) {
    if (err instanceof Error && err.message in ERROR_MAP) {
      const mapped = ERROR_MAP[err.message];
      if (!mapped) return next(err); // ← narrows away undefined
      const { status, message } = mapped;
      res.status(status).json({ success: false, error: message });
      return;
    }
    next(err);
  }
};
