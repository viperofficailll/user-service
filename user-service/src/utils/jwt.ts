import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export interface JWTPayload {
  userId: number;
  role: string;
}

export const signAccessToken = (payload: JWTPayload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (payload: JWTPayload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, ACCESS_SECRET) as JWTPayload;

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, REFRESH_SECRET) as JWTPayload;
