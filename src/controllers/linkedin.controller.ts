import { Request, Response, NextFunction } from "express";
import { linkedinService } from "../services/linkedin.service";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { SuccessResponse } from "../utils/response";

export class LinkedInController {
  constructor() {
    // No need to initialize service - using singleton
  }

  handleOAuthRedirect = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { code, state, error } = req.query;

      if (error) {
        return res.redirect(
          `http://localhost:8081/profile?linkedin_error=${error}`
        );
      }

      if (!code) {
        return res.redirect(
          `http://localhost:8081/profile?linkedin_error=no_code`
        );
      }

      try {
        // Extract user ID from state parameter (passed during auth URL generation)
        if (!state) {
          return res.redirect(
            `http://localhost:8081/profile?linkedin_error=no_state`
          );
        }

        // Process the LinkedIn OAuth flow
        const linkedinProfile = await linkedinService.connectLinkedInProfile(
          state as string,
          code as string
        );

        // Redirect to profile page with success
        res.redirect(`http://localhost:8081/profile?linkedin_success=true`);
      } catch (error: any) {
        console.error("LinkedIn OAuth processing error:", error);
        res.redirect(
          `http://localhost:8081/profile?linkedin_error=connection_failed`
        );
      }
    }
  );

  getAuthUrl = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const authUrl = linkedinService.generateAuthUrl(userId);

      SuccessResponse(res, { authUrl }, "LinkedIn authorization URL generated");
    }
  );

  handleCallback = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { code } = req.body;

      const linkedinProfile = await linkedinService.connectLinkedInProfile(
        userId,
        code
      );

      SuccessResponse(
        res,
        { profile: linkedinProfile },
        "LinkedIn profile connected successfully"
      );
    }
  );

  disconnect = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;

      await linkedinService.disconnectLinkedInProfile(userId);

      SuccessResponse(
        res,
        { disconnected: true },
        "LinkedIn profile disconnected successfully"
      );
    }
  );

  getProfile = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;

      const linkedinData = await linkedinService.getUserLinkedInData(userId);

      SuccessResponse(
        res,
        { profile: linkedinData },
        "LinkedIn profile data retrieved successfully"
      );
    }
  );

  refreshData = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { accessToken } = req.body;

      const updatedProfile = await linkedinService.refreshLinkedInData(
        userId,
        accessToken
      );

      SuccessResponse(
        res,
        { profile: updatedProfile },
        "LinkedIn data refreshed successfully"
      );
    }
  );
}

export const linkedinController = new LinkedInController();
