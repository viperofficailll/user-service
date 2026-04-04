import { prisma } from "../utils/prismaClient.js";

export const profileService = async (userId: number, role: string) => {
  const baseSelect = {
    id: true,
    name: true,
    email: true,
    phoneNumber: true,
    imageUrl: true,
    role: true,
    createdAt: true,
    address: {
      select: {
        city: true,
        address: true,
        streetNumber: true,
        latitude: true,
        longitude: true,
      },
    },
  };

  switch (role) {
    case "RESTAURANT":
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          ...baseSelect,
          restaurant: {
            select: {
              id: true,
              panNumber: true,
              paymentGateway: true,
              merchantId: true,
              imageUrl: true,
              isVerified: true,
              isBlockListed: true,
            },
          },
        },
      });

    case "DELIVERY_AGENT":
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          ...baseSelect,
          deliveryAgent: {
            select: {
              id: true,
              vehicleNumber: true,
              licenseNumber: true,
              licenseImageUrl: true,
              paymentGateway: true,
              merchantId: true,
              isVerified: true,
            },
          },
        },
      });

    case "ADMIN":
      return prisma.user.findUnique({
        where: { id: userId },
        select: {
          ...baseSelect,
          adminProfile: {
            select: { id: true },
          },
        },
      });

    default: // USER
      return prisma.user.findUnique({
        where: { id: userId },
        select: baseSelect,
      });
  }
};