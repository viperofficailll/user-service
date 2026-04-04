import { prisma } from "../utils/prismaClient.js";

type VerifiableRole = "RESTAURANT" | "DELIVERY_AGENT";

export const verifyService = async (role: VerifiableRole, id: number) => {
  if (role === "RESTAURANT") {
    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant) throw new Error("Restaurant not found.");
    if (restaurant.isVerified)
      throw new Error("Restaurant is already verified.");

    await prisma.restaurant.update({
      where: { id },
      data: { isVerified: true },
    });
    return { message: "Restaurant verified successfully." };
  }

  const agent = await prisma.deliveryAgent.findUnique({ where: { id } });
  if (!agent) throw new Error("Delivery agent not found.");
  if (agent.isVerified) throw new Error("Delivery agent is already verified.");

  await prisma.deliveryAgent.update({
    where: { id },
    data: { isVerified: true },
  });
  return { message: "Delivery agent verified successfully." };
};
