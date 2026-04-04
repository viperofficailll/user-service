import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { profileHandler } from "../user-service/src/controllers/profile.controller.js";
import * as profileServiceModule from "../user-service/src/services/profile.service.js";

vi.mock("../user-service/src/services/profile.service.js");

const mockRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = vi.fn();

const mockReq = (user: { userId: number; role: string }) =>
  ({ user }) as unknown as Request;

const baseProfile = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  phoneNumber: "+9779800000000",
  imageUrl: null,
  role: "USER",
  createdAt: new Date(),
  address: null,
};

describe("profileHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Not found ──────────────────────────────────────────────────────────────
  it("returns 404 if profile not found", async () => {
    vi.spyOn(profileServiceModule, "profileService").mockResolvedValue(null);

    const res = mockRes();
    await profileHandler(mockReq({ userId: 99, role: "USER" }), res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "User not found.",
    });
  });

  // ── Success per role ───────────────────────────────────────────────────────
  it("returns 200 with profile for USER", async () => {
    vi.spyOn(profileServiceModule, "profileService").mockResolvedValue(
      baseProfile as any,
    );

    const res = mockRes();
    await profileHandler(mockReq({ userId: 1, role: "USER" }), res, mockNext);

    expect(profileServiceModule.profileService).toHaveBeenCalledWith(1, "USER");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      profile: baseProfile,
    });
  });

  it("returns 200 with profile for RESTAURANT", async () => {
    const profile = {
      ...baseProfile,
      role: "RESTAURANT",
      restaurant: {
        id: 1,
        panNumber: "PAN123",
        paymentGateway: "E_SEWA",
        merchantId: "MID001",
        imageUrl: null,
        isVerified: true,
        isBlockListed: false,
      },
    };
    vi.spyOn(profileServiceModule, "profileService").mockResolvedValue(
      profile as any,
    );

    const res = mockRes();
    await profileHandler(
      mockReq({ userId: 1, role: "RESTAURANT" }),
      res,
      mockNext,
    );

    expect(profileServiceModule.profileService).toHaveBeenCalledWith(
      1,
      "RESTAURANT",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, profile });
  });

  it("returns 200 with profile for DELIVERY_AGENT", async () => {
    const profile = {
      ...baseProfile,
      role: "DELIVERY_AGENT",
      deliveryAgent: {
        id: 1,
        vehicleNumber: "BA 1 CHA 1234",
        licenseNumber: "LIC-12345",
        licenseImageUrl: null,
        paymentGateway: "E_SEWA",
        merchantId: null,
        isVerified: false,
      },
    };
    vi.spyOn(profileServiceModule, "profileService").mockResolvedValue(
      profile as any,
    );

    const res = mockRes();
    await profileHandler(
      mockReq({ userId: 1, role: "DELIVERY_AGENT" }),
      res,
      mockNext,
    );

    expect(profileServiceModule.profileService).toHaveBeenCalledWith(
      1,
      "DELIVERY_AGENT",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, profile });
  });

  it("returns 200 with profile for ADMIN", async () => {
    const profile = {
      ...baseProfile,
      role: "ADMIN",
      adminProfile: { id: 1 },
    };
    vi.spyOn(profileServiceModule, "profileService").mockResolvedValue(
      profile as any,
    );

    const res = mockRes();
    await profileHandler(mockReq({ userId: 1, role: "ADMIN" }), res, mockNext);

    expect(profileServiceModule.profileService).toHaveBeenCalledWith(
      1,
      "ADMIN",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, profile });
  });

  // ── Error ──────────────────────────────────────────────────────────────────
  it("calls next if service throws", async () => {
    const error = new Error("DB error");
    vi.spyOn(profileServiceModule, "profileService").mockRejectedValue(error);

    const res = mockRes();
    await profileHandler(mockReq({ userId: 1, role: "USER" }), res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(error);
  });
});
