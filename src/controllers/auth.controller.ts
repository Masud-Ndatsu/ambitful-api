import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";
import { asyncHandler, CustomError } from "../middleware/errorHandler";
import { SuccessResponse } from "../utils/response";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  register = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { name, email, password, country, interests } = req.body;

      const result = await this.authService.register({
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
      const result = await this.authService.login(email, password);

      SuccessResponse(res, result, 'Login successful');
    }
  );

  logout = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const result = await this.authService.logout();
      SuccessResponse(res, result, 'Logout successful');
    }
  );

  forgotPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { email } = req.body;
      const result = await this.authService.forgotPassword(email);
      SuccessResponse(res, result, 'Password reset email sent');
    }
  );

  resetPassword = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { token, password } = req.body;
      const result = await this.authService.resetPassword(token, password);
      SuccessResponse(res, result, 'Password reset successful');
    }
  );

  verifyEmail = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { token } = req.params;
      const result = await this.authService.verifyEmail(token);
      SuccessResponse(res, result, 'Email verified successfully');
    }
  );
}
