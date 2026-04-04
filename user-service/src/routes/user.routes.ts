import express from "express";
import { upload } from "../utils/multer.js";

import { authenticate } from "../middlewares/authenticate.js";
import {
  healthtest,
  userRegisterHandler,
} from "../controllers/register.controller.js";
import { userLoginHandler } from "../controllers/login.controller.js";
import { handleUserLogout } from "../controllers/logout.controller.js";
import { refreshTokenHandler } from "../controllers/refresh.controller.js";
import { requireAdmin } from "../middlewares/adminCheck.js";
import { verifyHandler } from "../controllers/verify.controller.js";
import { profileHandler } from "../controllers/profile.controller.js";
export const userRouter = express.Router();
userRouter.post(
  "/register",
  upload.single("image") as any,
  userRegisterHandler,
);
userRouter.post("/login", userLoginHandler);
userRouter.post("/logout", authenticate, handleUserLogout);
userRouter.post("/refresh", refreshTokenHandler);
userRouter.get("/health", healthtest);
userRouter.post("/verify", authenticate, requireAdmin, verifyHandler);
userRouter.post("/profile", authenticate, profileHandler);
