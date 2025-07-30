import { Router } from "express";
import { AdminController } from "../controllers/admin.controller";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation";
import { authenticateToken, requireRole } from "../middleware/auth";
import {
  adminUsersQuerySchema,
  updateUserStatusSchema,
  userIdParamsSchema,
} from "../validators/user";
import {
  adminOpportunitiesQuerySchema,
  createOpportunitySchema,
  updateOpportunitySchema,
  bulkActionSchema,
  opportunityAnalyticsParamsSchema,
} from "../validators/admin-opportunity";
import {
  aiDraftsQuerySchema,
  reviewDraftSchema,
  scanOpportunitiesSchema,
  draftIdParamsSchema,
} from "../validators/ai-drafts";
import {
  analyticsOverviewQuerySchema,
  analyticsExportQuerySchema,
  dateRangeQuerySchema,
  performanceQuerySchema,
} from "../validators/analytics";
import {
  createTestimonialSchema,
  updateTestimonialSchema,
  testimonialsQuerySchema,
  testimonialIdParamsSchema,
} from "../validators/testimonials";

const router = Router();
const adminController = new AdminController();

router.get(
  "/users",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(adminUsersQuerySchema),
  adminController.getUsers
);

router.put(
  "/users/:id/status",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(userIdParamsSchema),
  validateBody(updateUserStatusSchema),
  adminController.updateUserStatus
);

router.get(
  "/users/:id/activity",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(userIdParamsSchema),
  adminController.getUserActivity
);

// Admin opportunity management routes
router.get(
  "/opportunities",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(adminOpportunitiesQuerySchema),
  adminController.getOpportunities
);

router.post(
  "/opportunities",
  authenticateToken,
  requireRole(["admin"]),
  validateBody(createOpportunitySchema),
  adminController.createOpportunity
);

router.put(
  "/opportunities/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(opportunityAnalyticsParamsSchema),
  validateBody(updateOpportunitySchema),
  adminController.updateOpportunity
);

router.delete(
  "/opportunities/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(opportunityAnalyticsParamsSchema),
  adminController.deleteOpportunity
);

router.post(
  "/opportunities/bulk-action",
  authenticateToken,
  requireRole(["admin"]),
  validateBody(bulkActionSchema),
  adminController.bulkActionOpportunities
);

router.get(
  "/opportunities/:id/analytics",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(opportunityAnalyticsParamsSchema),
  adminController.getOpportunityAnalytics
);

// AI Drafts management routes
router.get(
  "/ai-drafts",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(aiDraftsQuerySchema),
  adminController.getAIDrafts
);

router.get(
  "/ai-drafts/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(draftIdParamsSchema),
  adminController.getAIDraftById
);

router.post(
  "/ai-drafts/:id/review",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(draftIdParamsSchema),
  validateBody(reviewDraftSchema),
  adminController.reviewAIDraft
);

router.post(
  "/ai-drafts/scan",
  authenticateToken,
  requireRole(["admin"]),
  validateBody(scanOpportunitiesSchema),
  adminController.scanOpportunities
);

router.delete(
  "/ai-drafts/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(draftIdParamsSchema),
  adminController.deleteAIDraft
);

router.get(
  "/ai-drafts-stats",
  authenticateToken,
  requireRole(["admin"]),
  adminController.getAIDraftStats
);

router.post(
  "/ai-drafts/bulk-review",
  authenticateToken,
  requireRole(["admin"]),
  adminController.bulkReviewAIDrafts
);

// Analytics routes
router.get(
  "/analytics/overview",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(analyticsOverviewQuerySchema),
  adminController.getAnalyticsOverview
);

router.get(
  "/analytics/opportunities",
  authenticateToken,
  requireRole(["admin"]),
  adminController.getAnalyticsOpportunities
);

router.get(
  "/analytics/users",
  authenticateToken,
  requireRole(["admin"]),
  adminController.getAnalyticsUsers
);

router.get(
  "/analytics/export",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(analyticsExportQuerySchema),
  adminController.exportAnalyticsData
);

router.get(
  "/analytics/dashboard",
  authenticateToken,
  requireRole(["admin"]),
  adminController.getDashboardSummary
);

router.get(
  "/analytics/detailed",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(dateRangeQuerySchema),
  adminController.getDetailedMetrics
);

router.get(
  "/analytics/realtime",
  authenticateToken,
  requireRole(["admin"]),
  adminController.getRealtimeMetrics
);

router.get(
  "/analytics/report",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(dateRangeQuerySchema),
  adminController.generateAnalyticsReport
);

// Testimonials management routes
router.get(
  "/testimonials",
  authenticateToken,
  requireRole(["admin"]),
  validateQuery(testimonialsQuerySchema),
  adminController.getTestimonials
);

router.post(
  "/testimonials",
  authenticateToken,
  requireRole(["admin"]),
  validateBody(createTestimonialSchema),
  adminController.createTestimonial
);

router.put(
  "/testimonials/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(testimonialIdParamsSchema),
  validateBody(updateTestimonialSchema),
  adminController.updateTestimonial
);

router.delete(
  "/testimonials/:id",
  authenticateToken,
  requireRole(["admin"]),
  validateParams(testimonialIdParamsSchema),
  adminController.deleteTestimonial
);

router.post(
  "/testimonials/bulk-delete",
  authenticateToken,
  requireRole(["admin"]),
  adminController.bulkDeleteTestimonials
);

router.get(
  "/testimonials/stats",
  authenticateToken,
  requireRole(["admin"]),
  adminController.getTestimonialStats
);

export default router;
