import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../../../generated/prisma/client.js";

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const field = (error.meta?.target as string[])?.[0] ?? "field";
      res
        .status(409)
        .json({ success: false, error: `${field} is already in use.` });
      return;
    }
  }

  if (error instanceof Error) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }

  res.status(500).json({ success: false, error: "Internal server error" });
};
