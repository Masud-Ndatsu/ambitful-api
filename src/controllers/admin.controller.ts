import { Request, Response, NextFunction } from "express";
import { userService } from "../services/user.service";
import { adminOpportunityService } from "../services/admin-opportunity.service";
import { aiDraftsService } from "../services/ai-drafts.service";
import { analyticsService } from "../services/analytics.service";
import { testimonialsService } from "../services/testimonials.service";
import { asyncHandler } from "../middleware/errorHandler";
import { AuthRequest } from "../middleware/auth";
import { SuccessResponse } from "../utils/response";

export class AdminController {
  constructor() {
    // No initialization needed - using singleton services
  }

  getUsers = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const {
        page = 1,
        limit = 10,
        status,
        country,
        search,
      } = req.query as any;

      const filters = {
        status: status as string | undefined,
        country: country as string | undefined,
        search: search as string | undefined,
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await userService.getUsersWithPagination(
        filters,
        pagination
      );
      SuccessResponse(res, result, "Users retrieved successfully");
    }
  );

  updateUserStatus = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;
      const { status } = req.body;

      const user = await userService.updateUserStatus(
        adminId,
        targetUserId,
        status
      );
      SuccessResponse(res, user, "User status updated successfully");
    }
  );

  getUserActivity = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const adminId = req.user!.userId;
      const targetUserId = req.params.id;

      const activities = await userService.getUserActivity(
        adminId,
        targetUserId
      );
      SuccessResponse(res, activities, "User activity retrieved successfully");
    }
  );

  // Opportunity management methods
  getOpportunities = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        search,
      } = req.query as any;

      const filters = {
        status: status as string | undefined,
        category: category as string | undefined,
        search: search as string | undefined,
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await adminOpportunityService.getAdminOpportunities(
        filters,
        pagination
      );
      SuccessResponse(res, result, "Opportunities retrieved successfully");
    }
  );

  createOpportunity = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const opportunityData = req.body;
      const opportunity = await adminOpportunityService.createOpportunity(
        opportunityData
      );
      SuccessResponse(
        res,
        opportunity,
        "Opportunity created successfully",
        201
      );
    }
  );

  updateOpportunity = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const updateData = req.body;
      const opportunity = await adminOpportunityService.updateOpportunity(
        id,
        updateData
      );
      SuccessResponse(res, opportunity, "Opportunity updated successfully");
    }
  );

  deleteOpportunity = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const result = await adminOpportunityService.deleteOpportunity(id);
      SuccessResponse(res, result, "Opportunity deleted successfully");
    }
  );

  bulkActionOpportunities = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { ids, action } = req.body;
      const result = await adminOpportunityService.bulkAction(ids, action);
      SuccessResponse(res, result, "Bulk action completed successfully");
    }
  );

  getOpportunityAnalytics = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const analytics =
        await adminOpportunityService.getOpportunityAnalytics(id);
      SuccessResponse(
        res,
        analytics,
        "Opportunity analytics retrieved successfully"
      );
    }
  );

  // AI Drafts management methods
  getAIDrafts = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { page = 1, limit = 10, status, priority } = req.query as any;

      const filters = {
        status: status as string | undefined,
        priority: priority as string | undefined,
      };

      const pagination = {
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      };

      const result = await aiDraftsService.getDrafts(filters, pagination);
      SuccessResponse(res, result, "AI drafts retrieved successfully");
    }
  );

  reviewAIDraft = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const { action, feedback, edits } = req.body;

      const result = await aiDraftsService.reviewDraft(
        id,
        action,
        feedback,
        edits
      );
      SuccessResponse(res, result, "AI draft reviewed successfully");
    }
  );

  getAIDraftStats = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const stats = await aiDraftsService.getDraftStats();
      SuccessResponse(res, stats, "AI draft statistics retrieved successfully");
    }
  );

  getAIDraftById = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const draft = await aiDraftsService.getDraftById(id);
      SuccessResponse(res, draft, "AI draft retrieved successfully");
    }
  );

  deleteAIDraft = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const result = await aiDraftsService.deleteDraft(id);
      SuccessResponse(res, result, "AI draft deleted successfully");
    }
  );

  bulkReviewAIDrafts = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { ids, action } = req.body;
      const result = await aiDraftsService.bulkReviewDrafts(ids, action);
      SuccessResponse(
        res,
        result,
        "AI drafts bulk review completed successfully"
      );
    }
  );

  // Analytics methods
  getAnalyticsOverview = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { period = "30d" } = req.query;
      const analytics = await analyticsService.getOverviewAnalytics(
        period as any
      );
      SuccessResponse(
        res,
        analytics,
        "Analytics overview retrieved successfully"
      );
    }
  );

  getAnalyticsOpportunities = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const performance =
        await analyticsService.getOpportunityPerformance();
      SuccessResponse(
        res,
        performance,
        "Opportunity performance analytics retrieved successfully"
      );
    }
  );

  getAnalyticsUsers = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const userAnalytics = await analyticsService.getUserAnalytics();
      SuccessResponse(
        res,
        userAnalytics,
        "User analytics retrieved successfully"
      );
    }
  );

  exportAnalyticsData = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { type, format, period, startDate, endDate } = req.query;

      const exportOptions = {
        type: type as "users" | "opportunities" | "analytics",
        format: format as "csv" | "xlsx",
        period: period as "7d" | "30d" | "90d" | undefined,
        startDate: startDate as string | undefined,
        endDate: endDate as string | undefined,
      };

      const result = await analyticsService.exportAnalyticsData(
        exportOptions
      );

      res.setHeader("Content-Type", result.contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${result.filename}"`
      );
      res.send(result.data);
    }
  );

  getDashboardSummary = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const summary = await analyticsService.getDashboardSummary();
      SuccessResponse(res, summary, "Dashboard summary retrieved successfully");
    }
  );

  getDetailedMetrics = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { period = "30d" } = req.query;
      const metrics = await analyticsService.getDetailedMetrics(
        period as any
      );
      SuccessResponse(res, metrics, "Detailed metrics retrieved successfully");
    }
  );

  getRealtimeMetrics = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const realtimeData = await analyticsService.getRealtimeMetrics();
      SuccessResponse(
        res,
        realtimeData,
        "Realtime metrics retrieved successfully"
      );
    }
  );

  generateAnalyticsReport = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { period = "30d", includeCharts = false } = req.query;
      const report = await analyticsService.generateAnalyticsReport(
        period as any,
        includeCharts === "true"
      );
      SuccessResponse(res, report, "Analytics report generated successfully");
    }
  );

  // Testimonials Management
  getTestimonials = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { page = 1, limit = 10, search } = req.query as any;
      const result = await testimonialsService.getTestimonials(
        { search },
        { page: parseInt(page), limit: parseInt(limit) }
      );
      SuccessResponse(res, result, "Testimonials retrieved successfully");
    }
  );

  createTestimonial = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const testimonial = await testimonialsService.createTestimonial(
        req.body
      );
      SuccessResponse(
        res,
        testimonial,
        "Testimonial created successfully",
        201
      );
    }
  );

  updateTestimonial = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const testimonial = await testimonialsService.updateTestimonial(
        id,
        req.body
      );
      SuccessResponse(res, testimonial, "Testimonial updated successfully");
    }
  );

  deleteTestimonial = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      await testimonialsService.deleteTestimonial(id);
      res.status(204).send();
    }
  );

  bulkDeleteTestimonials = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { ids } = req.body;
      const result = await testimonialsService.bulkDeleteTestimonials(ids);
      SuccessResponse(res, result, "Testimonials bulk deleted successfully");
    }
  );

  getTestimonialStats = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const stats = await testimonialsService.getTestimonialStats();
      SuccessResponse(
        res,
        stats,
        "Testimonial statistics retrieved successfully"
      );
    }
  );

  // New AI Draft methods
  regenerateAIDraft = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const result = await aiDraftsService.regenerateDraft(id);
      SuccessResponse(res, result, "Draft regenerated successfully");
    }
  );

  updateDraftPriority = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { id } = req.params;
      const { priority } = req.body;
      const result = await aiDraftsService.updateDraftPriority(
        id,
        priority
      );
      SuccessResponse(res, result, "Draft priority updated successfully");
    }
  );

  bulkDeleteAIDrafts = asyncHandler(
    async (
      req: AuthRequest,
      res: Response,
      next: NextFunction
    ): Promise<void> => {
      const { draftIds } = req.body;
      const result = await aiDraftsService.bulkDeleteDrafts(draftIds);
      SuccessResponse(res, result, "Drafts deleted successfully");
    }
  );
}
