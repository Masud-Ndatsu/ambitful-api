import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler, CustomError } from "../middleware/errorHandler";
import { SuccessResponse } from "../utils/response";

export class AuthController {
  constructor() {
    // No need to initialize service - using singleton
  }

  register = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { name, email, password, country, interests } = req.body;

      const result = await authService.register({
        name,
        email,
        password,
        country,
        interests,
      });

      SuccessResponse(res, result, 'User registered successfully', 201);
    }
  );

  login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { email, password } = req.body;
      const result = await authService.login(email, password);

      SuccessResponse(res, result, 'Login successful');
    }
  );

  logout = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const result = await authService.logout();
      SuccessResponse(res, result, 'Logout successful');
    }
  );

  forgotPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      SuccessResponse(res, result, 'Password reset email sent');
    }
  );

  resetPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { token, password } = req.body;
      const result = await authService.resetPassword(token, password);
      SuccessResponse(res, result, 'Password reset successful');
    }
  );

  verifyEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { token } = req.params;
      const result = await authService.verifyEmail(token);
      SuccessResponse(res, result, 'Email verified successfully');
    }
  );
}
