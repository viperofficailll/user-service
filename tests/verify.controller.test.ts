import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { verifyHandler } from "../src/controllers/verify.controller.js";
import * as verifyServiceModule from "../src/services/verfiy.service.js";

vi.mock("../user-service/src/services/verfiy.service.js"); // ← matches import path exactly

const mockReq = (body: unknown) => ({ body }) as Request;
const mockRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};
const mockNext: NextFunction = vi.fn();

describe("verifyHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("validation", () => {
    it("returns 400 if role is missing", async () => {
      const res = mockRes();
      await verifyHandler(mockReq({ id: 1 }), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("returns 400 if id is missing", async () => {
      const res = mockRes();
      await verifyHandler(mockReq({ role: "RESTAURANT" }), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false }),
      );
    });

    it("returns 400 if role is invalid", async () => {
      const res = mockRes();
      await verifyHandler(mockReq({ role: "USER", id: 1 }), res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("returns 400 if id is not a number", async () => {
      const res = mockRes();
      await verifyHandler(
        mockReq({ role: "RESTAURANT", id: "abc" }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe("success", () => {
    it("returns 200 for restaurant verification", async () => {
      vi.spyOn(verifyServiceModule, "verifyService").mockResolvedValue({
        message: "Restaurant verified successfully.",
      });

      const res = mockRes();
      await verifyHandler(
        mockReq({ role: "RESTAURANT", id: 1 }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Restaurant verified successfully.",
      });
    });

    it("returns 200 for delivery agent verification", async () => {
      vi.spyOn(verifyServiceModule, "verifyService").mockResolvedValue({
        message: "Delivery agent verified successfully.",
      });

      const res = mockRes();
      await verifyHandler(
        mockReq({ role: "DELIVERY_AGENT", id: 2 }),
        res,
        mockNext,
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Delivery agent verified successfully.",
      });
    });
  });

  describe("error handling", () => {
    it("calls next with error if service throws", async () => {
      const error = new Error("Restaurant not found.");
      vi.spyOn(verifyServiceModule, "verifyService").mockRejectedValue(error);

      const res = mockRes();
      await verifyHandler(
        mockReq({ role: "RESTAURANT", id: 99 }),
        res,
        mockNext,
      );
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
