import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { userLoginHandler } from "../src/controllers/login.controller.js";
import * as loginServiceModule from "../src/services/login.service.js";
import { Role } from "../generated/prisma/enums.js";

vi.mock("../user-service/src/services/login.service.js");

const mockReq = (body: unknown) => ({ body }) as Request;
const mockRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};
const mockNext: NextFunction = vi.fn();

const mockUser = {
  id: 1,
  role: "USER" as Role,
  name: "Test User",
  email: "test@example.com",
  phoneNumber: "+9779800000000",
  imageUrl: null,
};

describe("userLoginHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Validation ─────────────────────────────────────────────────────────────
  describe("validation", () => {
    it("returns 400 if email is missing", async () => {
      const res = mockRes();
      await userLoginHandler(mockReq({ password: "pass1234" }), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("returns 400 if password is missing", async () => {
      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "test@example.com" }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("returns 400 if email is invalid", async () => {
      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "not-an-email", password: "pass1234" }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── Success ────────────────────────────────────────────────────────────────
  describe("success", () => {
    it("returns 200 with accessToken and sets refreshToken cookie", async () => {
      vi.spyOn(loginServiceModule, "loginService").mockResolvedValue({
        accessToken: "access_token",
        refreshToken: "refresh_token",
        user: mockUser,
      });

      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "test@example.com", password: "pass1234" }),
        res,
        mockNext,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh_token",
        expect.objectContaining({ httpOnly: true }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accessToken: "access_token",
        user: mockUser,
      });
    });
  });

  // ── Mapped errors ──────────────────────────────────────────────────────────
  describe("error mapping", () => {
    it("returns 401 for INVALID_CREDENTIALS", async () => {
      vi.spyOn(loginServiceModule, "loginService").mockRejectedValue(
        new Error("INVALID_CREDENTIALS"),
      );

      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "test@example.com", password: "wrongpass" }),
        res,
        mockNext,
      );

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid email or password.",
      });
    });

    it("returns 403 for ACCOUNT_PENDING", async () => {
      vi.spyOn(loginServiceModule, "loginService").mockRejectedValue(
        new Error("ACCOUNT_PENDING"),
      );

      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "test@example.com", password: "pass1234" }),
        res,
        mockNext,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Your account is pending activation.",
      });
    });

    it("returns 403 for ACCOUNT_BLOCKED", async () => {
      vi.spyOn(loginServiceModule, "loginService").mockRejectedValue(
        new Error("ACCOUNT_BLOCKED"),
      );

      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "test@example.com", password: "pass1234" }),
        res,
        mockNext,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Your account has been blocked.",
      });
    });

    it("calls next for unmapped errors", async () => {
      const error = new Error("DATABASE_DOWN");
      vi.spyOn(loginServiceModule, "loginService").mockRejectedValue(error);

      const res = mockRes();
      await userLoginHandler(
        mockReq({ email: "test@example.com", password: "pass1234" }),
        res,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
