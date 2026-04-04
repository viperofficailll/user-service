import { z } from "zod";

const baseSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phoneNumber: z.string().regex(/^\+?[0-9]{7,15}$/, "Invalid phone number"),
  imageUrl: z.string().url().optional(),
  address: z.object({
    city: z.string().min(1),
    address: z.string().min(1),
    streetNumber: z.string().min(1),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }),
});

export const userRegisterSchema = baseSchema.extend({
  role: z.literal("USER"),
});

export const deliveryAgentRegisterSchema = baseSchema.extend({
  role: z.literal("DELIVERY_AGENT"),
  vehicleNumber: z.string().min(2),
  licenseNumber: z.string().min(5),
  licenseImageUrl: z.string().url(),
  paymentGateway: z.enum(["E_SEWA", "KHALTI"]).default("E_SEWA"),
  merchantId: z.string(),
});

export const restaurantRegisterSchema = baseSchema.extend({
  role: z.literal("RESTAURANT"),
  panNumber: z.string().min(5, "Invalid PAN number"),
  paymentGateway: z.enum(["E_SEWA", "KHALTI"]).default("E_SEWA"),
  merchantId: z.string(),
});

export const adminRegisterSchema = baseSchema.extend({
  role: z.literal("ADMIN"),
});

export const registerSchema = z.discriminatedUnion("role", [
  userRegisterSchema,
  restaurantRegisterSchema,
  deliveryAgentRegisterSchema,
  adminRegisterSchema,
]);

export const refreshtokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const verifySchema = z.object({
  role: z.enum(["RESTAURANT", "DELIVERY_AGENT"]),
  id: z.number().int().positive(),
});

export type verifyInput = z.infer<typeof verifySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshtokenSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
