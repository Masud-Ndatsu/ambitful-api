import { Router } from "express";
import { CrawlerController } from "../controllers/crawler.controller";
import { authenticateToken } from "../middleware/auth";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validation";
import {
  createCrawlSourceSchema,
  updateCrawlSourceSchema,
  idParamSchema,
  getCrawlSourcesQuerySchema,
  getCrawlLogsQuerySchema,
  getRecentCrawlLogsQuerySchema,
} from "../validators/crawler";

const router = Router();
const crawlerController = new CrawlerController();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Crawl Source routes
router.get(
  "/sources",
  validateQuery(getCrawlSourcesQuerySchema),
  crawlerController.getCrawlSources
);
router.get("/sources/active", crawlerController.getActiveCrawlSources);
router.get("/sources/due", crawlerController.getCrawlSourcesDueForCrawl);
router.get(
  "/sources/:id",
  validateParams(idParamSchema),
  crawlerController.getCrawlSourceById
);
router.post(
  "/sources",
  validateBody(createCrawlSourceSchema),
  crawlerController.createCrawlSource
);
router.put(
  "/sources/:id",
  validateParams(idParamSchema),
  validateBody(updateCrawlSourceSchema),
  crawlerController.updateCrawlSource
);
router.delete(
  "/sources/:id",
  validateParams(idParamSchema),
  crawlerController.deleteCrawlSource
);

// Crawl Source actions
router.post(
  "/sources/:id/pause",
  validateParams(idParamSchema),
  crawlerController.pauseCrawlSource
);
router.post(
  "/sources/:id/resume",
  validateParams(idParamSchema),
  crawlerController.resumeCrawlSource
);
router.post(
  "/sources/:id/disable",
  validateParams(idParamSchema),
  crawlerController.disableCrawlSource
);
router.post(
  "/sources/:id/crawl",
  validateParams(idParamSchema),
  crawlerController.startCrawl
);

// Crawl Source health and logs
router.get(
  "/sources/:id/health",
  validateParams(idParamSchema),
  crawlerController.getSourceHealth
);
router.get(
  "/sources/:id/logs",
  validateParams(idParamSchema),
  validateQuery(getCrawlLogsQuerySchema),
  crawlerController.getCrawlLogs
);

// General crawler endpoints
router.get(
  "/logs",
  validateQuery(getRecentCrawlLogsQuerySchema),
  crawlerController.getRecentCrawlLogs
);
router.get("/stats", crawlerController.getCrawlStats);

export default router;
