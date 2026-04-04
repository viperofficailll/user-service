import { prisma } from "../utils/prismaClient.js";

export const logoutService = async (userId: number) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};
