import type { Request, Response, NextFunction } from "express";
import { registerSchema } from "../schemas/user.schema.js";
import { registerService } from "../services/register.service.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const parseBody = (body: Record<string, unknown>): unknown =>
  body.data ? JSON.parse(body.data as string) : body;

export const userRegisterHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log("body:", req.body);
  console.log("content-type:", req.headers["content-type"]);
  try {
    let bodyData: unknown;

    try {
      bodyData = parseBody(req.body);
    } catch {
      res
        .status(400)
        .json({ success: false, error: "Invalid JSON in data field" });
      return;
    }

    const parsed = registerSchema.safeParse(bodyData);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    let imageUrl: string | undefined;
    if (req.file?.path) {
      const uploaded = await uploadOnCloudinary(req.file.path);
      if (!uploaded?.url)
        throw new Error("Failed to upload image to Cloudinary");
      imageUrl = uploaded.url;
    }

    const result = await registerService(parsed.data, imageUrl);

    if (result.requiresActivation) {
      res
        .status(201)
        .json({ success: true, message: result.message, user: result.user });
      return;
    }

    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });

    res.status(201).json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
};

export const healthtest = (_req: Request, res: Response) => {
  res.json({ success: true, message: "OK" });
};
