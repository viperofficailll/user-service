import { verifyRefreshToken } from "../utils/jwt.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { prisma } from "../utils/prismaClient.js";

export const refreshService = async (incomingToken: string) => {
  let payload: { userId: number; role: string };
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    throw new Error("INVALID_TOKEN");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, refreshToken: true },
  });

  if (!user || user.refreshToken !== incomingToken) {
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
    }
    throw new Error("INVALID_TOKEN");
  }

  const tokenPayload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const newRefreshToken = signRefreshToken(tokenPayload);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: newRefreshToken },
  });

  return { accessToken, refreshToken: newRefreshToken };
};
