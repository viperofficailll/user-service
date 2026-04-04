import express from "express";
import { globalErrorHandler } from "./middlewares/errorHandler.js";
import { userRouter } from "./routes/user.routes.js";

export const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/v1/servio/user", userRouter);
app.use(globalErrorHandler);
