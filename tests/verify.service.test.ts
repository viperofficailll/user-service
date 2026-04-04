import { describe, it, expect, vi, beforeEach } from "vitest";
import { verifyService } from "../user-service/src/services/verfiy.service.js";
import { prisma } from "../user-service/src/utils/prismaClient.js";

vi.mock("../user-service/src/utils/prismaClient.js", () => ({
  prisma: {
    restaurant: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deliveryAgent: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe("verifyService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("role: RESTAURANT", () => {
    it("throws if restaurant not found", async () => {
      vi.mocked(prisma.restaurant.findUnique).mockResolvedValue(null);
      await expect(verifyService("RESTAURANT", 1)).rejects.toThrow("Restaurant not found.");
    });

    it("throws if restaurant already verified", async () => {
      vi.mocked(prisma.restaurant.findUnique).mockResolvedValue({ id: 1, isVerified: true } as any);
      await expect(verifyService("RESTAURANT", 1)).rejects.toThrow("Restaurant is already verified.");
    });

    it("updates isVerified and returns success message", async () => {
      vi.mocked(prisma.restaurant.findUnique).mockResolvedValue({ id: 1, isVerified: false } as any);
      vi.mocked(prisma.restaurant.update).mockResolvedValue({} as any);

      const result = await verifyService("RESTAURANT", 1);

      expect(prisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isVerified: true },
      });
      expect(result).toEqual({ message: "Restaurant verified successfully." });
    });
  });

  describe("role: DELIVERY_AGENT", () => {
    it("throws if delivery agent not found", async () => {
      vi.mocked(prisma.deliveryAgent.findUnique).mockResolvedValue(null);
      await expect(verifyService("DELIVERY_AGENT", 2)).rejects.toThrow("Delivery agent not found.");
    });

    it("throws if delivery agent already verified", async () => {
      vi.mocked(prisma.deliveryAgent.findUnique).mockResolvedValue({ id: 2, isVerified: true } as any);
      await expect(verifyService("DELIVERY_AGENT", 2)).rejects.toThrow("Delivery agent is already verified.");
    });

    it("updates isVerified and returns success message", async () => {
      vi.mocked(prisma.deliveryAgent.findUnique).mockResolvedValue({ id: 2, isVerified: false } as any);
      vi.mocked(prisma.deliveryAgent.update).mockResolvedValue({} as any);

      const result = await verifyService("DELIVERY_AGENT", 2);

      expect(prisma.deliveryAgent.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isVerified: true },
      });
      expect(result).toEqual({ message: "Delivery agent verified successfully." });
    });
  });
});