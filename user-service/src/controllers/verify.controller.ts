import type { Request, Response, NextFunction } from "express";
import { verifySchema } from "../schemas/user.schema.js";
import { verifyService } from "../services/verfiy.service.js";

export const verifyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const { role, id } = parsed.data;
    const result = await verifyService(role, id);
    res.status(200).json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
};
