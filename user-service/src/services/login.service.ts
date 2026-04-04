import { comparePassword } from "../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { prisma } from "../utils/prismaClient.js";

export const loginService = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      phoneNumber: true,
      imageUrl: true,
      password: true,
      restaurant: { select: { isVerified: true, isBlockListed: true } },
      deliveryAgent: { select: { isVerified: true } },
    },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isMatch = await comparePassword(password, user.password);
  if (!isMatch) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.role === "RESTAURANT") {
    if (user.restaurant?.isBlockListed) throw new Error("ACCOUNT_BLOCKED");
    if (!user.restaurant?.isVerified) throw new Error("ACCOUNT_PENDING");
  }

  if (user.role === "DELIVERY_AGENT") {
    if (!user.deliveryAgent?.isVerified) throw new Error("ACCOUNT_PENDING");
  }

  const tokenPayload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  const { password: _, restaurant: __, deliveryAgent: ___, ...safeUser } = user;

  return { accessToken, refreshToken, user: safeUser };
};
