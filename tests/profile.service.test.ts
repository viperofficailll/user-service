import { describe, it, expect, vi, beforeEach } from "vitest";
import { profileService } from "../src/services/profile.service.js";
import { prisma } from "../src/utils/prismaClient.js";

vi.mock("../src/utils/prismaClient.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

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

describe("profileService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── USER ───────────────────────────────────────────────────────────────────
  describe("role: USER", () => {
    it("calls findUnique with correct userId", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(baseProfile as any);

      const result = await profileService(1, "USER");

      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 } }),
      );
      expect(result).toEqual(baseProfile);
    });

    it("returns null if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const result = await profileService(99, "USER");
      expect(result).toBeNull();
    });

    it("does not select restaurant or deliveryAgent", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(baseProfile as any);

      await profileService(1, "USER");

      const call = vi.mocked(prisma.user.findUnique).mock.calls[0][0] as any;
      expect(call.select).not.toHaveProperty("restaurant");
      expect(call.select).not.toHaveProperty("deliveryAgent");
    });
  });

  // ── RESTAURANT ─────────────────────────────────────────────────────────────
  describe("role: RESTAURANT", () => {
    const restaurantProfile = {
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

    it("includes restaurant in select", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        restaurantProfile as any,
      );

      await profileService(1, "RESTAURANT");

      const call = vi.mocked(prisma.user.findUnique).mock.calls[0][0] as any;
      expect(call.select).toHaveProperty("restaurant");
      expect(call.select).not.toHaveProperty("deliveryAgent");
    });

    it("returns restaurant profile", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(
        restaurantProfile as any,
      );

      const result = await profileService(1, "RESTAURANT");
      expect(result).toEqual(restaurantProfile);
    });
  });

  // ── DELIVERY_AGENT ─────────────────────────────────────────────────────────
  describe("role: DELIVERY_AGENT", () => {
    const agentProfile = {
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

    it("includes deliveryAgent in select", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(agentProfile as any);

      await profileService(1, "DELIVERY_AGENT");

      const call = vi.mocked(prisma.user.findUnique).mock.calls[0][0] as any;
      expect(call.select).toHaveProperty("deliveryAgent");
      expect(call.select).not.toHaveProperty("restaurant");
    });

    it("returns delivery agent profile", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(agentProfile as any);

      const result = await profileService(1, "DELIVERY_AGENT");
      expect(result).toEqual(agentProfile);
    });
  });

  // ── ADMIN ──────────────────────────────────────────────────────────────────
  describe("role: ADMIN", () => {
    const adminProfile = {
      ...baseProfile,
      role: "ADMIN",
      adminProfile: { id: 1 },
    };

    it("includes adminProfile in select", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(adminProfile as any);

      await profileService(1, "ADMIN");

      const call = vi.mocked(prisma.user.findUnique).mock.calls[0][0] as any;
      expect(call.select).toHaveProperty("adminProfile");
      expect(call.select).not.toHaveProperty("restaurant");
      expect(call.select).not.toHaveProperty("deliveryAgent");
    });

    it("returns admin profile", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(adminProfile as any);

      const result = await profileService(1, "ADMIN");
      expect(result).toEqual(adminProfile);
    });
  });

  // ── Unknown role ───────────────────────────────────────────────────────────
  describe("unknown role", () => {
    it("falls through to USER select for unknown role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(baseProfile as any);

      await profileService(1, "UNKNOWN_ROLE");

      const call = vi.mocked(prisma.user.findUnique).mock.calls[0][0] as any;
      expect(call.select).not.toHaveProperty("restaurant");
      expect(call.select).not.toHaveProperty("deliveryAgent");
      expect(call.select).not.toHaveProperty("adminProfile");
    });
  });
});
