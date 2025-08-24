import {
  PrismaClient,
  CrawlSource,
  CrawlLog,
  CrawlSourceStatus,
  CrawlFrequency,
  CrawlStatus,
} from "@prisma/client";
import { prisma } from "../database/prisma";

export interface CreateCrawlSourceData {
  name: string;
  url: string;
  status?: CrawlSourceStatus;
  frequency?: CrawlFrequency;
  maxResults?: number;
}

export interface UpdateCrawlSourceData {
  name?: string;
  url?: string;
  status?: CrawlSourceStatus;
  frequency?: CrawlFrequency;
  maxResults?: number;
  lastCrawl?: Date;
  lastSuccess?: boolean;
  errorMessage?: string;
}

export interface CreateCrawlLogData {
  sourceId: string;
  status: CrawlStatus;
  itemsFound?: number;
  errorMessage?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface CrawlSourceFilters {
  status?: CrawlSourceStatus;
  frequency?: CrawlFrequency;
  search?: string;
}

export class CrawlerRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  // Crawl Source CRUD operations
  async createCrawlSource(data: CreateCrawlSourceData): Promise<CrawlSource> {
    return this.prisma.crawlSource.create({
      data: {
        name: data.name,
        url: data.url,
        status: data.status || "ACTIVE",
        frequency: data.frequency || "DAILY",
        maxResults: data.maxResults || 50,
      },
    });
  }

  async getCrawlSourceById(id: string): Promise<CrawlSource | null> {
    return this.prisma.crawlSource.findUnique({
      where: { id },
      include: {
        crawlLogs: {
          orderBy: { createdAt: "desc" },
          take: 10, // Get last 10 crawl logs
        },
      },
    });
  }

  async getCrawlSources(filters?: CrawlSourceFilters): Promise<CrawlSource[]> {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.frequency) {
      where.frequency = filters.frequency;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { url: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.crawlSource.findMany({
      where,
      include: {
        crawlLogs: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the latest crawl log
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateCrawlSource(
    id: string,
    data: UpdateCrawlSourceData
  ): Promise<CrawlSource> {
    return this.prisma.crawlSource.update({
      where: { id },
      data,
    });
  }

  async deleteCrawlSource(id: string): Promise<void> {
    await this.prisma.crawlSource.delete({
      where: { id },
    });
  }

  async getActiveCrawlSources(): Promise<CrawlSource[]> {
    return this.prisma.crawlSource.findMany({
      where: { status: "ACTIVE" },
      orderBy: { lastCrawl: "asc" }, // Prioritize sources that haven't been crawled recently
    });
  }

  async getCrawlSourcesDueForCrawl(): Promise<CrawlSource[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.prisma.crawlSource.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          // Never crawled
          { lastCrawl: null },
          // HOURLY: last crawl more than 1 hour ago
          {
            frequency: "HOURLY",
            lastCrawl: { lt: new Date(now.getTime() - 60 * 60 * 1000) },
          },
          // DAILY: last crawl more than 1 day ago
          {
            frequency: "DAILY",
            lastCrawl: { lt: oneDayAgo },
          },
          // WEEKLY: last crawl more than 1 week ago
          {
            frequency: "WEEKLY",
            lastCrawl: { lt: oneWeekAgo },
          },
          // MONTHLY: last crawl more than 1 month ago
          {
            frequency: "MONTHLY",
            lastCrawl: { lt: oneMonthAgo },
          },
        ],
      },
      orderBy: { lastCrawl: "asc" },
    });
  }

  // Crawl Log operations
  async createCrawlLog(data: CreateCrawlLogData): Promise<CrawlLog> {
    return this.prisma.crawlLog.create({
      data: {
        sourceId: data.sourceId,
        status: data.status,
        itemsFound: data.itemsFound || 0,
        errorMessage: data.errorMessage,
        startedAt: data.startedAt || new Date(),
        completedAt: data.completedAt,
      },
    });
  }

  async updateCrawlLog(
    id: string,
    data: Partial<CreateCrawlLogData>
  ): Promise<CrawlLog> {
    return this.prisma.crawlLog.update({
      where: { id },
      data,
    });
  }

  async getCrawlLogsBySourceId(
    sourceId: string,
    limit: number = 50
  ): Promise<CrawlLog[]> {
    return this.prisma.crawlLog.findMany({
      where: { sourceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async getRecentCrawlLogs(limit: number = 100): Promise<CrawlLog[]> {
    return this.prisma.crawlLog.findMany({
      include: {
        source: {
          select: {
            name: true,
            url: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
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
  }> {
    const [
      totalSources,
      activeSources,
      pausedSources,
      disabledSources,
      totalCrawls,
      successfulCrawls,
      failedCrawls,
      runningCrawls,
    ] = await Promise.all([
      this.prisma.crawlSource.count(),
      this.prisma.crawlSource.count({ where: { status: "ACTIVE" } }),
      this.prisma.crawlSource.count({ where: { status: "PAUSED" } }),
      this.prisma.crawlSource.count({ where: { status: "DISABLED" } }),
      this.prisma.crawlLog.count(),
      this.prisma.crawlLog.count({ where: { status: "SUCCESS" } }),
      this.prisma.crawlLog.count({ where: { status: "FAILED" } }),
      this.prisma.crawlLog.count({ where: { status: "RUNNING" } }),
    ]);

    return {
      totalSources,
      activeSources,
      pausedSources,
      disabledSources,
      totalCrawls,
      successfulCrawls,
      failedCrawls,
      runningCrawls,
    };
  }
}

export const crawlerRepository = new CrawlerRepository();
