import {
  CrawlSource,
  CrawlLog,
} from "@prisma/client";
import { CrawlSourceStatus, CrawlStatus } from "../enums";
import {
  crawlerRepository,
  CreateCrawlSourceData,
  UpdateCrawlSourceData,
  CreateCrawlLogData,
  CrawlSourceFilters,
} from "../repositories/crawler.repository";
import { CustomError } from "../middleware/errorHandler";
import { CrawlerEvents } from "../events/crawler.event";
import { CRAWLER_EVENTS } from "../enums";
import { ScrapingService } from "./scraping.service";

export interface CrawlSourceWithLogs extends CrawlSource {
  crawlLogs: CrawlLog[];
}

export interface CrawlLogWithSource extends CrawlLog {
  source: {
    name: string;
    url: string;
  };
}

export class CrawlerService {
  private scrapingService: ScrapingService;

  constructor() {
    this.scrapingService = new ScrapingService();
  }

  async createCrawlSource(data: CreateCrawlSourceData): Promise<CrawlSource> {
    // Check if URL already exists
    const existingSources = await crawlerRepository.getCrawlSources({
      search: data.url,
    });
    const urlExists = existingSources.some((source) => source.url === data.url);

    if (urlExists) {
      throw new CustomError("A crawl source with this URL already exists", 409);
    }

    // Validate max results
    if (data.maxResults && (data.maxResults < 1 || data.maxResults > 1000)) {
      throw new CustomError("Max results must be between 1 and 1000", 400);
    }

    return crawlerRepository.createCrawlSource(data);
  }

  async getCrawlSourceById(id: string): Promise<CrawlSourceWithLogs | null> {
    if (!id || typeof id !== "string") {
      throw new CustomError("Invalid crawl source ID", 400);
    }

    return crawlerRepository.getCrawlSourceById(
      id
    ) as Promise<CrawlSourceWithLogs | null>;
  }

  async getCrawlSources(
    filters?: CrawlSourceFilters
  ): Promise<CrawlSourceWithLogs[]> {
    return crawlerRepository.getCrawlSources(filters) as Promise<
      CrawlSourceWithLogs[]
    >;
  }

  async updateCrawlSource(
    id: string,
    data: UpdateCrawlSourceData
  ): Promise<CrawlSource> {
    if (!id || typeof id !== "string") {
      throw new CustomError("Invalid crawl source ID");
    }

    // Check if source exists
    const existingSource = await crawlerRepository.getCrawlSourceById(id);
    if (!existingSource) {
      throw new CustomError("Crawl source not found");
    }

    // Validate URL if provided
    if (data.url) {
      // Check if URL already exists (excluding current source)
      const existingSources = await crawlerRepository.getCrawlSources({
        search: data.url,
      });
      const urlExists = existingSources.some(
        (source) => source.url === data.url && source.id !== id
      );

      if (urlExists) {
        throw new CustomError(
          "A crawl source with this URL already exists",
          409
        );
      }
    }

    // Validate max results if provided
    if (data.maxResults && (data.maxResults < 1 || data.maxResults > 1000)) {
      throw new CustomError("Max results must be between 1 and 1000", 400);
    }

    return crawlerRepository.updateCrawlSource(id, data);
  }

  async deleteCrawlSource(id: string): Promise<void> {
    if (!id || typeof id !== "string") {
      throw new CustomError("Invalid crawl source ID", 400);
    }

    // Check if source exists
    const existingSource: any = await crawlerRepository.getCrawlSourceById(id);
    if (!existingSource) {
      throw new CustomError("Crawl source not found", 404);
    }

    // Check if there are running crawls
    const runningCrawls = existingSource!.crawlLogs?.filter(
      (log) => log.status === CrawlStatus.RUNNING
    );
    if (runningCrawls && runningCrawls.length > 0) {
      throw new CustomError(
        "Cannot delete crawl source with running crawls. Please wait for them to complete.",
        400
      );
    }

    await crawlerRepository.deleteCrawlSource(id);
  }

  async pauseCrawlSource(id: string): Promise<CrawlSource> {
    return this.updateCrawlSource(id, { status: CrawlSourceStatus.PAUSED });
  }

  async resumeCrawlSource(id: string): Promise<CrawlSource> {
    return this.updateCrawlSource(id, { status: CrawlSourceStatus.ACTIVE });
  }

  async disableCrawlSource(id: string): Promise<CrawlSource> {
    return this.updateCrawlSource(id, { status: CrawlSourceStatus.DISABLED });
  }

  async getActiveCrawlSources(): Promise<CrawlSource[]> {
    return crawlerRepository.getActiveCrawlSources();
  }

  async getCrawlSourcesDueForCrawl(): Promise<CrawlSource[]> {
    return crawlerRepository.getCrawlSourcesDueForCrawl();
  }

  // Crawl Log operations
  async startCrawl(sourceId: string): Promise<CrawlLog> {
    // Check if source exists and is active
    const source: any = await crawlerRepository.getCrawlSourceById(sourceId);
    if (!source) {
      throw new CustomError("Crawl source not found", 404);
    }

    if (source.status !== CrawlSourceStatus.ACTIVE) {
      throw new CustomError("Cannot start crawl for inactive source", 400);
    }

    // Check if there's already a running crawl for this source
    const runningCrawls = source.crawlLogs?.filter(
      (log) => log.status === CrawlStatus.RUNNING
    );
    if (runningCrawls && runningCrawls.length > 0) {
      throw new CustomError(
        "There is already a running crawl for this source",
        400
      );
    }

    // Create crawl log first
    const crawlLog = await crawlerRepository.createCrawlLog({
      sourceId,
      status: CrawlStatus.RUNNING,
      startedAt: new Date(),
    });

    // Update source last crawl time
    await crawlerRepository.updateCrawlSource(sourceId, {
      lastCrawl: new Date(),
    });

    // Fetch content asynchronously and emit event (don't await to make this non-blocking)
    this.crawlAndProcessContent(crawlLog.id, sourceId, source.url).catch(
      (error) => {
        console.error(`Crawl failed for source ${sourceId}:`, error);
      }
    );

    return crawlLog;
  }

  private async crawlAndProcessContent(
    crawlLogId: string,
    sourceId: string,
    url: string
  ): Promise<void> {
    try {
      console.log(`Starting content crawl for source ${sourceId}, URL: ${url}`);

      // Fetch the page content using scraping service
      const content = await this.scrapingService.fetchPageContent(url);

      console.log(
        `Successfully crawled content for source ${sourceId}, emitting event for AI parsing`
      );

      // Emit event for AI parsing (this will be handled asynchronously by event listeners)
      CrawlerEvents.emit(
        CRAWLER_EVENTS.CONTENT_CRAWLED,
        crawlLogId,
        sourceId,
        content
      );
    } catch (error) {
      console.error(`Content crawling failed for source ${sourceId}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown crawling error";

      // Update crawl log with failure
      await crawlerRepository.updateCrawlLog(crawlLogId, {
        status: CrawlStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      });

      // Update source status
      await crawlerRepository.updateCrawlSource(sourceId, {
        lastSuccess: false,
        errorMessage,
      });

      // Emit parsing failed event
      CrawlerEvents.emit(
        CRAWLER_EVENTS.PARSING_FAILED,
        crawlLogId,
        sourceId,
        errorMessage
      );
    }
  }

  async completeCrawl(
    crawlLogId: string,
    status: typeof CrawlStatus.SUCCESS | typeof CrawlStatus.FAILED,
    itemsFound?: number,
    errorMessage?: string
  ): Promise<CrawlLog> {
    if (!crawlLogId || typeof crawlLogId !== "string") {
      throw new CustomError("Invalid crawl log ID");
    }

    if (![CrawlStatus.SUCCESS, CrawlStatus.FAILED].includes(status)) {
      throw new CustomError("Invalid crawl status. Must be SUCCESS or FAILED");
    }

    const updateData: Partial<CreateCrawlLogData> = {
      status: status as CrawlStatus,
      completedAt: new Date(),
    };

    if (itemsFound !== undefined) {
      updateData.itemsFound = itemsFound;
    }

    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }

    // Update crawl log
    const crawlLog = await crawlerRepository.updateCrawlLog(
      crawlLogId,
      updateData
    );

    // Update source last success status and error message
    await crawlerRepository.updateCrawlSource(crawlLog.sourceId, {
      lastSuccess: status === CrawlStatus.SUCCESS,
      errorMessage: status === CrawlStatus.FAILED ? errorMessage : null,
    });

    return crawlLog;
  }

  async getCrawlLogsBySourceId(
    sourceId: string,
    limit?: number
  ): Promise<CrawlLog[]> {
    if (!sourceId || typeof sourceId !== "string") {
      throw new CustomError("Invalid source ID");
    }

    return crawlerRepository.getCrawlLogsBySourceId(sourceId, limit);
  }

  async getRecentCrawlLogs(limit?: number): Promise<CrawlLogWithSource[]> {
    return crawlerRepository.getRecentCrawlLogs(limit) as Promise<
      CrawlLogWithSource[]
    >;
  }

  async getCrawlStats(): Promise<{
    totalSources: number;
    activeSources: number;
    pausedSources: number;
    disabledSources: number;
    totalCrawls: number;
    successfulCrawls: number;
    failedCrawls: number;
    runningCrawls: number;
    successRate: number;
  }> {
    const stats = await crawlerRepository.getCrawlStats();

    // Calculate success rate
    const successRate =
      stats.totalCrawls > 0
        ? Math.round((stats.successfulCrawls / stats.totalCrawls) * 100)
        : 0;

    return {
      ...stats,
      successRate,
    };
  }

  // Utility methods
  async validateCrawlSourceData(
    data: CreateCrawlSourceData | UpdateCrawlSourceData
  ): Promise<void> {
    if ("url" in data && data.url) {
      try {
        new URL(data.url);
      } catch (error) {
        throw new CustomError("Invalid URL format");
      }
    }

    if ("maxResults" in data && data.maxResults !== undefined) {
      if (data.maxResults < 1 || data.maxResults > 1000) {
        throw new CustomError("Max results must be between 1 and 1000");
      }
    }

    if ("name" in data && data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new CustomError("Name is required");
      }
      if (data.name.trim().length > 255) {
        throw new CustomError("Name must be less than 255 characters");
      }
    }
  }

  async getSourceHealthStatus(sourceId: string): Promise<{
    status: "healthy" | "warning" | "error";
    lastCrawl: Date | null;
    lastSuccess: boolean;
    consecutiveFailures: number;
    averageItemsFound: number;
  }> {
    const source = await crawlerRepository.getCrawlSourceById(sourceId);
    if (!source) {
      throw new CustomError("Crawl source not found", 404);
    }

    const recentLogs = await crawlerRepository.getCrawlLogsBySourceId(
      sourceId,
      10
    );

    // Count consecutive failures from the most recent logs
    let consecutiveFailures = 0;
    for (const log of recentLogs) {
      if (log.status === CrawlStatus.FAILED) {
        consecutiveFailures++;
      } else if (log.status === CrawlStatus.SUCCESS) {
        break;
      }
    }

    // Calculate average items found from successful crawls
    const successfulLogs = recentLogs.filter((log) => log.status === CrawlStatus.SUCCESS);
    const averageItemsFound =
      successfulLogs.length > 0
        ? Math.round(
            successfulLogs.reduce((sum, log) => sum + log.itemsFound, 0) /
              successfulLogs.length
          )
        : 0;

    // Determine health status
    let status: "healthy" | "warning" | "error" = "healthy";
    if (consecutiveFailures >= 3) {
      status = "error";
    } else if (consecutiveFailures >= 1 || !source.lastSuccess) {
      status = "warning";
    }

    return {
      status,
      lastCrawl: source.lastCrawl,
      lastSuccess: source.lastSuccess,
      consecutiveFailures,
      averageItemsFound,
    };
  }
}

export const crawlerService = new CrawlerService();
