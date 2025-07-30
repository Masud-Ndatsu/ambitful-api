import { Request, Response, NextFunction } from "express";
import { OpportunityService } from "../services/opportunity.service";
import { asyncHandler } from "../middleware/errorHandler";
import { SuccessResponse } from "../utils/response";

export class OpportunityController {
  private opportunityService: OpportunityService;

  constructor() {
    this.opportunityService = new OpportunityService();
  }

  getOpportunities = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        page = 1,
        limit = 10,
        search,
        type,
        location,
        deadline,
        sortBy = "newest",
        category,
      } = req.query as any;

      const filters = {
        search: search as string | undefined,
        type: type as string | undefined,
        location: location as string | undefined,
        deadline: deadline as string | undefined,
        sortBy: sortBy as "newest" | "deadline" | "relevance",
        category: category as string | undefined,
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await this.opportunityService.getOpportunities(
        filters,
        pagination
      );
      SuccessResponse(res, result, "Opportunities retrieved successfully");
    }
  );

  getOpportunityById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const opportunity = await this.opportunityService.getOpportunityById(id);
      SuccessResponse(res, opportunity, "Opportunity retrieved successfully");
    }
  );

  getFeaturedOpportunities = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const opportunities =
        await this.opportunityService.getFeaturedOpportunities();
      SuccessResponse(res, opportunities, "Featured opportunities retrieved successfully");
    }
  );

  getTrendingOpportunities = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const opportunities =
        await this.opportunityService.getTrendingOpportunities();
      SuccessResponse(res, opportunities, "Trending opportunities retrieved successfully");
    }
  );

  getSimilarOpportunities = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const opportunities =
        await this.opportunityService.getSimilarOpportunities(id);
      SuccessResponse(res, opportunities, "Similar opportunities retrieved successfully");
    }
  );

  // User interaction methods
  saveOpportunity = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.opportunityService.saveOpportunity(userId, id);
      SuccessResponse(res, result, "Opportunity saved successfully");
    }
  );

  unsaveOpportunity = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.opportunityService.unsaveOpportunity(userId, id);
      SuccessResponse(res, result, "Opportunity unsaved successfully");
    }
  );

  getSavedOpportunities = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { page = 1, limit = 10 } = req.query as any;

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10)
      };

      const result = await this.opportunityService.getSavedOpportunities(userId, pagination);
      SuccessResponse(res, result, "Saved opportunities retrieved successfully");
    }
  );

  applyToOpportunity = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { applicationData } = req.body;

      const result = await this.opportunityService.applyToOpportunity(
        userId,
        id,
        applicationData
      );
      SuccessResponse(res, result, "Application submitted successfully");
    }
  );

  getUserApplications = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const applications = await this.opportunityService.getUserApplications(userId);
      SuccessResponse(res, { applications }, "User applications retrieved successfully");
    }
  );

  shareOpportunity = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { platform } = req.body;

      const result = await this.opportunityService.shareOpportunity(userId, id, platform);
      SuccessResponse(res, result, "Opportunity shared successfully");
    }
  );

  recordOpportunityView = asyncHandler(
    async (req: any, res: Response, next: NextFunction): Promise<void> => {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await this.opportunityService.recordOpportunityView(userId, id);
      SuccessResponse(res, result, "Opportunity view recorded successfully");
    }
  );
}
