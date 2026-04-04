import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import {
  userRegisterHandler,
  healthtest,
} from "../src/controllers/register.controller.js";
import * as registerServiceModule from "../src/services/register.service.js";
import * as cloudinaryModule from "../src/utils/cloudinary.js";
import { Role } from "../generated/prisma/enums.js";

vi.mock("../user-service/src/services/register.service.js");
vi.mock("../user-service/src/utils/cloudinary.js");

const mockRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = vi.fn();

const validUserBody = {
  role: "USER" as Role,
  name: "Test User",
  email: "test@example.com",
  password: "securepass123",
  phoneNumber: "+9779800000000",
  address: {
    city: "Kathmandu",
    address: "Durbar Marg",
    streetNumber: "1",
  },
};

const mockUser = {
  id: 1,
  role: "USER" as Role,
  name: "Test User",
  email: "test@example.com",
  phoneNumber: "+9779800000000",
  imageUrl: null,
};

const mockReq = (body: unknown, file?: Express.Multer.File) =>
  ({ body, file, headers: {} }) as unknown as Request;

describe("userRegisterHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Body parsing ───────────────────────────────────────────────────────────
  describe("body parsing", () => {
    it("returns 400 if data field contains invalid JSON", async () => {
      const res = mockRes();
      const req = mockReq({ data: "not-valid-json" });
      await userRegisterHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid JSON in data field",
      });
    });

    it("parses body.data as JSON if present", async () => {
      vi.spyOn(registerServiceModule, "registerService").mockResolvedValue({
        requiresActivation: false,
        accessToken: "access_token",
        refreshToken: "refresh_token",
        user: mockUser,
      });

      const res = mockRes();
      const req = mockReq({ data: JSON.stringify(validUserBody) });
      await userRegisterHandler(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────────
  describe("validation", () => {
    it("returns 400 if role is missing", async () => {
      const res = mockRes();
      const { role, ...noRole } = validUserBody;
      await userRegisterHandler(mockReq(noRole), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("returns 400 if email is invalid", async () => {
      const res = mockRes();
      await userRegisterHandler(
        mockReq({ ...validUserBody, email: "not-an-email" }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if password is too short", async () => {
      const res = mockRes();
      await userRegisterHandler(
        mockReq({ ...validUserBody, password: "short" }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ── Cloudinary ─────────────────────────────────────────────────────────────
  describe("cloudinary upload", () => {
    it("throws if cloudinary upload fails", async () => {
      vi.spyOn(cloudinaryModule, "uploadOnCloudinary").mockResolvedValue(null);

      const res = mockRes();
      const req = mockReq(validUserBody, {
        path: "/tmp/image.jpg",
      } as Express.Multer.File);
      await userRegisterHandler(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Failed to upload image to Cloudinary",
        }),
      );
    });

    it("passes imageUrl to registerService if upload succeeds", async () => {
      vi.spyOn(cloudinaryModule, "uploadOnCloudinary").mockResolvedValue({
        url: "https://cloudinary.com/image.jpg",
      } as any);
      const serviceSpy = vi
        .spyOn(registerServiceModule, "registerService")
        .mockResolvedValue({
          requiresActivation: false,
          accessToken: "access_token",
          refreshToken: "refresh_token",
          user: mockUser,
        });

      const res = mockRes();
      const req = mockReq(validUserBody, {
        path: "/tmp/image.jpg",
      } as Express.Multer.File);
      await userRegisterHandler(req, res, mockNext);
      expect(serviceSpy).toHaveBeenCalledWith(
        expect.anything(),
        "https://cloudinary.com/image.jpg",
      );
    });
  });

  // ── requiresActivation ─────────────────────────────────────────────────────
  describe("requiresActivation", () => {
    it("returns 201 with message and no cookie if activation required", async () => {
      vi.spyOn(registerServiceModule, "registerService").mockResolvedValue({
        requiresActivation: true,
        message:
          "Your information has been gathered. You will receive an email once your account is activated.",
        user: mockUser,
      });

      const res = mockRes();
      await userRegisterHandler(mockReq(validUserBody), res, mockNext);

      expect(res.cookie).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message:
          "Your information has been gathered. You will receive an email once your account is activated.",
        user: mockUser,
      });
    });
  });

  // ── Success ────────────────────────────────────────────────────────────────
  describe("success", () => {
    it("sets refreshToken cookie and returns 201 with accessToken", async () => {
      vi.spyOn(registerServiceModule, "registerService").mockResolvedValue({
        requiresActivation: false,
        accessToken: "access_token",
        refreshToken: "refresh_token",
        user: mockUser,
      });

      const res = mockRes();
      await userRegisterHandler(mockReq(validUserBody), res, mockNext);

      expect(res.cookie).toHaveBeenCalledWith(
        "refreshToken",
        "refresh_token",
        expect.objectContaining({ httpOnly: true, sameSite: "strict" }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        accessToken: "access_token",
        user: mockUser,
      });
    });

    it("calls next if registerService throws", async () => {
      const error = new Error("Something went wrong");
      vi.spyOn(registerServiceModule, "registerService").mockRejectedValue(
        error,
      );

      const res = mockRes();
      await userRegisterHandler(mockReq(validUserBody), res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  // ── healthtest ─────────────────────────────────────────────────────────────
  describe("healthtest", () => {
    it("returns OK", () => {
      const res = mockRes();
      healthtest({} as Request, res);
      expect(res.json).toHaveBeenCalledWith({ success: true, message: "OK" });
    });
  });
});
