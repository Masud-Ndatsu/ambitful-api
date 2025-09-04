import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { linkedinController } from "../controllers/linkedin.controller";
import { validateBody } from "../middleware/validation";
import {
  linkedinCallbackSchema,
  refreshTokenSchema,
} from "../validators/linkedin";

const router = Router();

// Get LinkedIn auth URL
router.get("/auth-url", authenticateToken, linkedinController.getAuthUrl);

// Get LinkedIn profile data using stored access token
router.get("/profile", authenticateToken, linkedinController.getProfile);

// Handle LinkedIn OAuth redirect from LinkedIn (GET route)
router.get("/callback", linkedinController.handleOAuthRedirect);

// Handle LinkedIn OAuth callback (POST route for frontend)
router.post(
  "/callback",
  authenticateToken,
  validateBody(linkedinCallbackSchema),
  linkedinController.handleCallback
);

// Disconnect LinkedIn profile
router.delete("/disconnect", authenticateToken, linkedinController.disconnect);

// Refresh LinkedIn data
router.post(
  "/refresh",
  authenticateToken,
  validateBody(refreshTokenSchema),
  linkedinController.refreshData
);

export default router;
