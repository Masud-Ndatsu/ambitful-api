import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { SuccessResponse } from '../utils/response';

export class UserController {
  constructor() {
    // No need to initialize service - using singleton
  }

  getProfile = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const user = await userService.getUserProfile(userId);
      SuccessResponse(res, user, 'User profile retrieved successfully');
    }
  );

  updateProfile = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { name, email, country, interests, profilePicture } = req.body;

      const user = await userService.updateUserProfile(userId, {
        name,
        email,
        country,
        interests,
        profilePicture
      });

      SuccessResponse(res, user, 'Profile updated successfully');
    }
  );

  getUserById = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const requesterId = req.user!.userId;
      const targetUserId = req.params.id;

      const user = await userService.getUserById(requesterId, targetUserId);
      SuccessResponse(res, user, 'User retrieved successfully');
    }
  );

  deleteUser = asyncHandler(
    async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.params.id;
      const result = await userService.deleteUser(userId);
      SuccessResponse(res, result, 'User deleted successfully');
    }
  );
}