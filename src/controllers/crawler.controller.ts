import { Request, Response, NextFunction } from "express";
import { crawlerService } from "../services/crawler.service";
import { asyncHandler } from "../middleware/errorHandler";
import { SuccessResponse } from "../utils/response";

export class CrawlerController {
  constructor() {
    // No initialization needed - using singleton services
  }

  getCrawlSources = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { status, frequency, search } = req.query;

      const filters: any = {};
      if (status) filters.status = status as string;
      if (frequency) filters.frequency = frequency as string;
      if (search) filters.search = search as string;

      const sources = await crawlerService.getCrawlSources(filters);

      SuccessResponse(res, sources, "Crawl sources retrieved successfully");
    }
  );

  getCrawlSourceById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const source = await crawlerService.getCrawlSourceById(id);

      SuccessResponse(res, source, "Crawl source retrieved successfully");
    }
  );

  createCrawlSource = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { name, url, status, frequency, maxResults } = req.body;

      const sourceData = {
        name: name?.trim(),
        url: url?.trim(),
        status: status as string,
        frequency: frequency as string,
        maxResults: maxResults ? parseInt(maxResults) : undefined,
      } as any;

      const source = await crawlerService.createCrawlSource(sourceData);

      SuccessResponse(res, source, "Crawl source created successfully", 201);
    }
  );

  updateCrawlSource = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const { name, url, status, frequency, maxResults } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (url !== undefined) updateData.url = url.trim();
      if (status !== undefined) updateData.status = status as string;
      if (frequency !== undefined) updateData.frequency = frequency as string;
      if (maxResults !== undefined)
        updateData.maxResults = parseInt(maxResults);

      const source = await crawlerService.updateCrawlSource(
        id,
        updateData
      );

      SuccessResponse(res, source, "Crawl source updated successfully");
    }
  );

  deleteCrawlSource = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      await crawlerService.deleteCrawlSource(id);

      SuccessResponse(res, null, "Crawl source deleted successfully");
    }
  );

  pauseCrawlSource = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const source = await crawlerService.pauseCrawlSource(id);

      SuccessResponse(res, source, "Crawl source paused successfully");
    }
  );

  resumeCrawlSource = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const source = await crawlerService.resumeCrawlSource(id);

      SuccessResponse(res, source, "Crawl source resumed successfully");
    }
  );

  disableCrawlSource = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const source = await crawlerService.disableCrawlSource(id);

      SuccessResponse(res, source, "Crawl source disabled successfully");
    }
  );

  startCrawl = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const crawlLog = await crawlerService.startCrawl(id);

      SuccessResponse(res, crawlLog, "Crawl started successfully");
    }
  );

  getCrawlLogs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const { limit } = req.query;

      const logs = await crawlerService.getCrawlLogsBySourceId(
        id,
        limit ? parseInt(limit as string) : undefined
      );

      SuccessResponse(res, logs, "Crawl logs retrieved successfully");
    }
  );

  getRecentCrawlLogs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { limit } = req.query;

      const logs = await crawlerService.getRecentCrawlLogs(
        limit ? parseInt(limit as string) : undefined
      );

      SuccessResponse(res, logs, "Recent crawl logs retrieved successfully");
    }
  );

  getCrawlStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const stats = await crawlerService.getCrawlStats();
      SuccessResponse(res, stats, "Crawler statistics retrieved successfully");
    }
  );

  getSourceHealth = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const { id } = req.params;
      const health = await crawlerService.getSourceHealthStatus(id);

      SuccessResponse(
        res,
        health,
        "Source health status retrieved successfully"
      );
    }
  );

  getActiveCrawlSources = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const sources = await crawlerService.getActiveCrawlSources();
      SuccessResponse(
        res,
        sources,
        "Active crawl sources retrieved successfully"
      );
    }
  );

  getCrawlSourcesDueForCrawl = asyncHandler(
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const sources = await crawlerService.getCrawlSourcesDueForCrawl();
      SuccessResponse(
        res,
        sources,
        "Crawl sources due for crawl retrieved successfully"
      );
    }
  );
}
