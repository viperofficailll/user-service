import { describe, it, expect, vi, beforeEach } from "vitest";
import { loginService } from "../src/services/login.service";
import { prisma } from "../src/utils/prismaClient";
import * as hashUtils from "../src/utils/hash";

vi.mock("../src/utils/prismaClient.js", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../src/utils/hash.js", () => ({
  comparePassword: vi.fn(),
}));

vi.mock("../src/utils/jwt.js", () => ({
  signAccessToken: vi.fn().mockReturnValue("access_token"),
  signRefreshToken: vi.fn().mockReturnValue("refresh_token"),
}));

const baseUser = {
  id: 1,
  role: "USER" as const,
  name: "Test User",
  email: "test@example.com",
  phoneNumber: "+9779800000000",
  imageUrl: null,
  password: "hashed_password",
  restaurant: null,
  deliveryAgent: null,
};

describe("loginService", () => {
  beforeEach(() => vi.clearAllMocks());

  // ── Credentials ────────────────────────────────────────────────────────────
  describe("credential checks", () => {
    it("throws INVALID_CREDENTIALS if user not found", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      await expect(loginService("test@example.com", "pass")).rejects.toThrow(
        "INVALID_CREDENTIALS",
      );
    });

    it("throws INVALID_CREDENTIALS if password does not match", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as any);
      vi.mocked(hashUtils.comparePassword).mockResolvedValue(false);
      await expect(
        loginService("test@example.com", "wrongpass"),
      ).rejects.toThrow("INVALID_CREDENTIALS");
    });
  });

  // ── Role guards ────────────────────────────────────────────────────────────
  describe("role guards", () => {
    beforeEach(() => {
      vi.mocked(hashUtils.comparePassword).mockResolvedValue(true);
    });

    it("throws ACCOUNT_BLOCKED if restaurant is blocklisted", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        role: "RESTAURANT",
        restaurant: { isVerified: true, isBlockListed: true },
      } as any);
      await expect(loginService("test@example.com", "pass")).rejects.toThrow(
        "ACCOUNT_BLOCKED",
      );
    });

    it("throws ACCOUNT_PENDING if restaurant is not verified", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        role: "RESTAURANT",
        restaurant: { isVerified: false, isBlockListed: false },
      } as any);
      await expect(loginService("test@example.com", "pass")).rejects.toThrow(
        "ACCOUNT_PENDING",
      );
    });

    it("throws ACCOUNT_PENDING if delivery agent is not verified", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        role: "DELIVERY_AGENT",
        deliveryAgent: { isVerified: false },
      } as any);
      await expect(loginService("test@example.com", "pass")).rejects.toThrow(
        "ACCOUNT_PENDING",
      );
    });
  });

  // ── Success ────────────────────────────────────────────────────────────────
  describe("success", () => {
    beforeEach(() => {
      vi.mocked(hashUtils.comparePassword).mockResolvedValue(true);
      vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    });

    it("returns tokens and safeUser for USER role", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as any);

      const result = await loginService("test@example.com", "pass");

      expect(result.accessToken).toBe("access_token");
      expect(result.refreshToken).toBe("refresh_token");
      expect(result.user).not.toHaveProperty("password");
      expect(result.user).not.toHaveProperty("restaurant");
      expect(result.user).not.toHaveProperty("deliveryAgent");
    });

    it("persists refresh token in db", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as any);

      await loginService("test@example.com", "pass");

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { refreshToken: "refresh_token" },
      });
    });

    it("allows verified restaurant to login", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        role: "RESTAURANT",
        restaurant: { isVerified: true, isBlockListed: false },
      } as any);

      const result = await loginService("test@example.com", "pass");
      expect(result.accessToken).toBe("access_token");
    });

    it("allows verified delivery agent to login", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        ...baseUser,
        role: "DELIVERY_AGENT",
        deliveryAgent: { isVerified: true },
      } as any);

      const result = await loginService("test@example.com", "pass");
      expect(result.accessToken).toBe("access_token");
    });
  });
});
