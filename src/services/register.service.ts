import type { RegisterInput } from "../schemas/user.schema.js";
import { hashPassword } from "../utils/hash.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { prisma } from "../utils/prismaClient.js";

export const registerService = async (
  body: RegisterInput,
  imageUrl?: string,
) => {
  const { name, email, password, phoneNumber, address, role } = body;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phoneNumber }] },
  });
  if (existing) {
    const field = existing.email === email ? "email" : "phone number";
    throw new Error(`A user with this ${field} already exists.`);
  }

  const hashedPassword = await hashPassword(password);

  const addressPayload = address
    ? {
        address: {
          create: {
            city: address.city,
            address: address.address,
            streetNumber: address.streetNumber,
            latitude: address.latitude ?? null,
            longitude: address.longitude ?? null,
          },
        },
      }
    : {};

  let rolePayload: object = {};
  let requiresActivation = false;

  if (role === "RESTAURANT") {
    const { panNumber, paymentGateway, merchantId } = body;
    rolePayload = {
      restaurant: {
        create: {
          panNumber,
          paymentGateway,
          merchantId: merchantId ?? null,
          imageUrl: imageUrl ?? null,
        },
      },
    };
    requiresActivation = true;
  } else if (role === "DELIVERY_AGENT") {
    const { vehicleNumber, licenseNumber, paymentGateway, merchantId } = body;
    rolePayload = {
      deliveryAgent: {
        create: {
          vehicleNumber,
          licenseNumber,
          licenseImageUrl: imageUrl ?? null,
          paymentGateway,
          merchantId: merchantId ?? null,
        },
      },
    };
    requiresActivation = true;
  } else if (role === "ADMIN") {
    rolePayload = {
      adminProfile: {
        create: {},
      },
    };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      imageUrl: role === "USER" ? (imageUrl ?? null) : null,
      role,
      ...addressPayload,
      ...rolePayload,
    },
    select: {
      id: true,
      role: true,
      name: true,
      email: true,
      phoneNumber: true,
      imageUrl: true,
    },
  });

  if (requiresActivation) {
    // TODO: sendActivationEmail(email)
    return {
      requiresActivation: true,
      message:
        "Your information has been gathered. You will receive an email once your account is activated.",
      user,
    };
  }

  // ── 3. Sign tokens ─────────────────────────────────────────────────────────
  const tokenPayload = { userId: user.id, role: user.role };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  // ── 4. Persist refresh token ───────────────────────────────────────────────
  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return { requiresActivation: false, accessToken, refreshToken, user };
};
