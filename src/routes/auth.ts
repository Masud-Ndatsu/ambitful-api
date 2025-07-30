import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validateBody, validateParams } from "../middleware/validation";
import { authenticateToken } from "../middleware/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailParamsSchema,
} from "../validators/auth";

const router = Router();
const authController = new AuthController();

router.post("/register", validateBody(registerSchema), authController.register);

router.post("/login", validateBody(loginSchema), authController.login);

router.post("/logout", authenticateToken, authController.logout);

router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  authController.forgotPassword
);

router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

router.get(
  "/verify-email/:token",
  validateParams(verifyEmailParamsSchema),
  authController.verifyEmail
);

export default router;
