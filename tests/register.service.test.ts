import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerService } from "../user-service/src/services/register.service.js";
import { prisma } from "../user-service/src/utils/prismaClient.js";
import * as hashUtils from "../user-service/src/utils/hash.js";
import * as jwtUtils from "../user-service/src/utils/jwt.js";
import { Role } from "../generated/prisma/enums.js";

vi.mock("../user-service/src/utils/prismaClient.js", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../user-service/src/utils/hash.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
}));

vi.mock("../user-service/src/utils/jwt.js", () => ({
  signAccessToken: vi.fn().mockReturnValue("access_token"),
  signRefreshToken: vi.fn().mockReturnValue("refresh_token"),
}));

const mockCreatedUser = {
  id: 1,
  role: "USER" as Role,
  name: "Test User",
  email: "test@example.com",
  phoneNumber: "+9779800000000",
  imageUrl: null,
};

const baseUserInput = {
  role: "USER" as const,
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

describe("registerService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Duplicate check ────────────────────────────────────────────────────────
  describe("duplicate check", () => {
    it("throws if email already exists", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...mockCreatedUser,
        email: "test@example.com",
      } as any);

      await expect(registerService(baseUserInput)).rejects.toThrow(
        "A user with this email already exists.",
      );
    });

    it("throws if phone number already exists", async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...mockCreatedUser,
        email: "other@example.com",
      } as any);

      await expect(registerService(baseUserInput)).rejects.toThrow(
        "A user with this phone number already exists.",
      );
    });
  });

  // ── USER role ──────────────────────────────────────────────────────────────
  describe("role: USER", () => {
    beforeEach(() => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue(mockCreatedUser as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    });

    it("creates user and returns tokens", async () => {
      const result = await registerService(baseUserInput);

      expect(result.requiresActivation).toBe(false);
      expect(result.accessToken).toBe("access_token");
      expect(result.refreshToken).toBe("refresh_token");
      expect(result.user).toEqual(mockCreatedUser);
    });

    it("saves imageUrl on user for USER role", async () => {
      await registerService(baseUserInput, "https://cloudinary.com/img.jpg");

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageUrl: "https://cloudinary.com/img.jpg",
          }),
        }),
      );
    });

    it("persists refresh token after creation", async () => {
      await registerService(baseUserInput);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { refreshToken: "refresh_token" },
      });
    });
  });

  // ── RESTAURANT role ────────────────────────────────────────────────────────
  describe("role: RESTAURANT", () => {
    const restaurantInput = {
      role: "RESTAURANT" as const,
      name: "Bistro",
      email: "bistro@example.com",
      password: "securepass123",
      phoneNumber: "+9779811111111",
      panNumber: "PAN12345",
      paymentGateway: "E_SEWA" as const,
      merchantId: "MID001",
      address: { city: "Kathmandu", address: "Thamel", streetNumber: "2" },
    };

    beforeEach(() => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockCreatedUser,
        role: "RESTAURANT" as Role,
      } as any);
    });

    it("sets requiresActivation to true", async () => {
      const result = await registerService(restaurantInput);
      expect(result.requiresActivation).toBe(true);
    });

    it("does not return tokens", async () => {
      const result = await registerService(restaurantInput);
      expect(result).not.toHaveProperty("accessToken");
      expect(result).not.toHaveProperty("refreshToken");
    });

    it("saves imageUrl in restaurant payload not on user", async () => {
      await registerService(
        restaurantInput,
        "https://cloudinary.com/restaurant.jpg",
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageUrl: null,
            restaurant: expect.objectContaining({
              create: expect.objectContaining({
                imageUrl: "https://cloudinary.com/restaurant.jpg",
              }),
            }),
          }),
        }),
      );
    });
  });

  // ── DELIVERY_AGENT role ────────────────────────────────────────────────────
  describe("role: DELIVERY_AGENT", () => {
    const agentInput = {
      role: "DELIVERY_AGENT" as const,
      name: "Ram Kumar",
      email: "ram@example.com",
      password: "securepass123",
      phoneNumber: "+9779822222222",
      vehicleNumber: "BA 1 CHA 1234",
      licenseNumber: "LIC-12345",
      licenseImageUrl: "https://example.com/license.jpg",
      paymentGateway: "E_SEWA" as const,
      merchantId: "MID002",
      address: { city: "Lalitpur", address: "Pulchowk", streetNumber: "5" },
    };

    beforeEach(() => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockCreatedUser,
        role: "DELIVERY_AGENT" as Role,
      } as any);
    });

    it("sets requiresActivation to true", async () => {
      const result = await registerService(agentInput);
      expect(result.requiresActivation).toBe(true);
    });

    it("saves imageUrl as licenseImageUrl in deliveryAgent payload", async () => {
      await registerService(agentInput, "https://cloudinary.com/license.jpg");

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageUrl: null,
            deliveryAgent: expect.objectContaining({
              create: expect.objectContaining({
                licenseImageUrl: "https://cloudinary.com/license.jpg",
              }),
            }),
          }),
        }),
      );
    });
  });

  // ── ADMIN role ─────────────────────────────────────────────────────────────
  describe("role: ADMIN", () => {
    const adminInput = {
      role: "ADMIN" as const,
      name: "Admin User",
      email: "admin@example.com",
      password: "securepass123",
      phoneNumber: "+9779833333333",
      address: { city: "Kathmandu", address: "Bagmati", streetNumber: "9" },
    };

    beforeEach(() => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        ...mockCreatedUser,
        role: "ADMIN" as Role,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    });

    it("does not set requiresActivation", async () => {
      const result = await registerService(adminInput);
      expect(result.requiresActivation).toBe(false);
    });

    it("returns tokens", async () => {
      const result = await registerService(adminInput);
      expect(result.accessToken).toBe("access_token");
      expect(result.refreshToken).toBe("refresh_token");
    });
  });
});
