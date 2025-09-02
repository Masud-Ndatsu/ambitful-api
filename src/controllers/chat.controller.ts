import { Request, Response, NextFunction } from "express";
import { chatService } from "../services/chat.service";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { SuccessResponse } from "../utils/response";

export class ChatController {
  constructor() {
    // No need to initialize service - using singleton
  }

  sendMessage = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { message, conversationId, context } = req.body;

      const result = await chatService.sendMessage(
        userId,
        message,
        conversationId,
        context
      );

      SuccessResponse(res, result, "Message sent successfully");
    }
  );

  getConversations = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { page = 1, limit = 20 } = req.query as any;

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await chatService.getUserConversations(
        userId,
        pagination
      );
      SuccessResponse(res, result, "Conversations retrieved successfully");
    }
  );

  getConversationById = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;

      const conversation = await chatService.getConversationById(
        id,
        userId
      );
      SuccessResponse(res, conversation, "Conversation retrieved successfully");
    }
  );

  getMessagesByConversationId = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query as any;

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await chatService.getMessagesByConversationId(
        id,
        userId,
        pagination
      );
      SuccessResponse(res, result, "Messages retrieved successfully");
    }
  );

  deleteConversation = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await chatService.deleteConversation(id, userId);
      SuccessResponse(res, result, "Conversation deleted successfully");
    }
  );

  getCareerAdvice = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;
      const { query } = req.query;

      const advice = await chatService.generateCareerAdvice(
        userId,
        query as string
      );

      SuccessResponse(res, { advice }, "Career advice generated successfully");
    }
  );

  getOpportunityRecommendations = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userId = req.user!.userId;

      const recommendations =
        await chatService.generateOpportunityRecommendations(userId);

      SuccessResponse(
        res,
        { recommendations },
        "Opportunity recommendations generated successfully"
      );
    }
  );
}
