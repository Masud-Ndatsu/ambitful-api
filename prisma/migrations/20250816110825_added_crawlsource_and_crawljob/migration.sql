-- CreateEnum
CREATE TYPE "CrawlSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CrawlFrequency" AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CrawlStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "crawl_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "CrawlSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "frequency" "CrawlFrequency" NOT NULL DEFAULT 'DAILY',
    "maxResults" INTEGER NOT NULL DEFAULT 50,
    "lastCrawl" TIMESTAMP(3),
    "lastSuccess" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawl_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_logs" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" "CrawlStatus" NOT NULL,
    "itemsFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "crawl_logs" ADD CONSTRAINT "crawl_logs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "crawl_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
