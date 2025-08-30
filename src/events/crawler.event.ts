import TypedEventEmitter from ".";
import { CRAWLER_EVENTS } from "../enums/";
import { GeminiService } from "../services/gemini.service";
import { crawlerRepository } from "../repositories/crawler.repository";
import { ParsedOpportunity } from "../types";
import { CustomError } from "../middleware/errorHandler";
import { OpportunityRepository } from "../repositories/opportunity.repository";
import { AIDraftsRepository } from "../repositories/ai-drafts.repository";

type CrawlerEventsTypes = {
  [CRAWLER_EVENTS.CONTENT_CRAWLED]: [
    crawlLogId: string,
    sourceId: string,
    content: string
  ];
  [CRAWLER_EVENTS.CONTENT_PARSED]: [
    crawlLogId: string,
    sourceId: string,
    opportunities: ParsedOpportunity[]
  ];
  [CRAWLER_EVENTS.PARSING_FAILED]: [
    crawlLogId: string,
    sourceId: string,
    error: string
  ];
  [CRAWLER_EVENTS.OPPORTUNITIES_EXTRACTED]: [
    crawlLogId: string,
    sourceId: string,
    opportunityCount: number
  ];
};

export const CrawlerEvents = new TypedEventEmitter<CrawlerEventsTypes>();

const geminiService = new GeminiService();
const opportunityRepository = new OpportunityRepository();
const aiDraftsRepository = new AIDraftsRepository();

// Priority determination logic
function determinePriority(
  opportunity: ParsedOpportunity
): "high" | "medium" | "low" {
  let score = 0;

  // Check for amount/value
  if (opportunity.amount) {
    const amount = opportunity.amount.toLowerCase();
    if (amount.includes("$") || amount.includes("full")) {
      score += 2;
    } else {
      score += 1;
    }
  }

  // Check for deadline urgency
  if (opportunity.deadline) {
    const deadlineDate = new Date(opportunity.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil(
      (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilDeadline <= 7) {
      score += 3;
    } else if (daysUntilDeadline <= 30) {
      score += 2;
    } else {
      score += 1;
    }
  }

  // Check opportunity type
  if (opportunity.type === "FELLOWSHIP" || opportunity.type === "GRANT") {
    score += 2;
  } else if (opportunity.type === "SCHOLARSHIP") {
    score += 1;
  }

  // Determine priority based on score
  if (score >= 5) {
    return "high";
  } else if (score >= 3) {
    return "medium";
  } else {
    return "low";
  }
}
// Handle content crawling completion - trigger AI parsing
CrawlerEvents.on(
  CRAWLER_EVENTS.CONTENT_CRAWLED,
  async (crawlLogId: string, sourceId: string, content: string) => {
    try {
      console.log(`Starting AI parsing for crawl log ID: ${crawlLogId}`);

      if (!content || content.trim().length === 0) {
        throw new CustomError("No content provided for AI parsing", 404);
      }

      // Use Gemini to parse the HTML content for opportunities
      const opportunities = await geminiService.parseBlockToOpportunities(
        content
      );

      if (!opportunities || opportunities.length === 0) {
        console.log(
          `No opportunities found in content for crawl log ID: ${crawlLogId}`
        );

        // Complete the crawl log with 0 items found
        await crawlerRepository.updateCrawlLog(crawlLogId, {
          status: "success",
          itemsFound: 0,
          completedAt: new Date(),
        });

        // Update source status
        await crawlerRepository.updateCrawlSource(sourceId, {
          lastSuccess: true,
          errorMessage: null,
        });

        // Emit completion event
        CrawlerEvents.emit(
          CRAWLER_EVENTS.OPPORTUNITIES_EXTRACTED,
          crawlLogId,
          sourceId,
          0
        );
        return;
      }

      console.log(
        `Found ${opportunities.length} opportunities for crawl log ID: ${crawlLogId}`
      );

      // Emit content parsed event
      CrawlerEvents.emit(
        CRAWLER_EVENTS.CONTENT_PARSED,
        crawlLogId,
        sourceId,
        opportunities
      );
    } catch (error) {
      console.error(`AI parsing failed for crawl log ID ${crawlLogId}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown parsing error";

      // Update crawl log with failure
      await crawlerRepository.updateCrawlLog(crawlLogId, {
        status: "failed",
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
);

// Handle successful content parsing - process the opportunities
CrawlerEvents.on(
  CRAWLER_EVENTS.CONTENT_PARSED,
  async (
    crawlLogId: string,
    sourceId: string,
    opportunities: ParsedOpportunity[]
  ) => {
    try {
      console.log(
        `Processing ${opportunities.length} parsed opportunities for crawl log ID: ${crawlLogId}`
      );

      // 1. Check for duplicate opportunities
      const uniqueOpportunities =
        await opportunityRepository.filterDuplicateOpportunities(opportunities);

      console.log(
        `Found ${uniqueOpportunities.length} unique opportunities after deduplication`
      );

      // 2. Save opportunities to database as draft status with AI draft records
      const createdOpportunities: string[] = [];

      for (const opportunity of uniqueOpportunities) {
        try {
          // Parse deadline
          let deadline: Date;
          if (opportunity.deadline) {
            deadline = new Date(opportunity.deadline);
            if (isNaN(deadline.getTime())) {
              // If deadline is invalid, set it to 30 days from now
              deadline = new Date();
              deadline.setDate(deadline.getDate() + 30);
            }
          } else {
            // Default to 30 days from now
            deadline = new Date();
            deadline.setDate(deadline.getDate() + 30);
          }

          // Create opportunity with DRAFT status
          const createdOpportunity =
            await opportunityRepository.createOpportunity({
              title: opportunity.title.trim(),
              type: opportunity.type,
              description: opportunity.description.trim(),
              fullDescription: opportunity.description,
              deadline: deadline,
              location: opportunity.location || "Remote",
              amount: opportunity.amount || null,
              link: opportunity.link || "",
              category: opportunity.category || "General",
              status: "DRAFT",
              eligibility: [],
              benefits: [],
              applicationInstructions: [],
            });

          // Create corresponding AI draft record
          const crawlSource = await crawlerRepository.getCrawlSourceById(
            sourceId
          );
          const sourceUrl = crawlSource?.url || "Unknown";

          await aiDraftsRepository.createDraft({
            title: opportunity.title,
            source: sourceUrl,
            priority: determinePriority(opportunity),
            rawContent: JSON.stringify(opportunity, null, 2),
            opportunityId: createdOpportunity.id,
            extractedData: {
              title: opportunity.title,
              type: opportunity.type,
              description: opportunity.description,
              fullDescription: opportunity.description,
              deadline: opportunity.deadline,
              location: opportunity.location,
              amount: opportunity.amount,
              link: opportunity.link,
              eligibility: [],
              benefits: [],
              applicationInstructions: [],
              category: opportunity.category,
            },
          });

          createdOpportunities.push(createdOpportunity.id);
          console.log(
            `Created opportunity: ${opportunity.title} (ID: ${createdOpportunity.id})`
          );
        } catch (error) {
          console.error(
            `Failed to create opportunity: ${opportunity.title}`,
            error
          );
        }
      }

      console.log(
        `Successfully created ${createdOpportunities.length} opportunities from crawl`
      );

      // 3. Trigger additional processing (notifications, etc.)

      // For now, we'll just complete the crawl log successfully
      await crawlerRepository.updateCrawlLog(crawlLogId, {
        status: "success",
        itemsFound: uniqueOpportunities.length,
        completedAt: new Date(),
      });

      // Update source status
      await crawlerRepository.updateCrawlSource(sourceId, {
        lastSuccess: true,
        errorMessage: null,
      });

      console.log(
        `Successfully processed ${opportunities.length} opportunities for crawl log ID: ${crawlLogId}`
      );

      // Emit final completion event
      CrawlerEvents.emit(
        CRAWLER_EVENTS.OPPORTUNITIES_EXTRACTED,
        crawlLogId,
        sourceId,
        opportunities.length
      );
    } catch (error) {
      console.error(
        `Error processing opportunities for crawl log ID ${crawlLogId}:`,
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : "Unknown processing error";

      // Update crawl log with failure
      await crawlerRepository.updateCrawlLog(crawlLogId, {
        status: "failed",
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
);

// Handle parsing failures - log and cleanup
CrawlerEvents.on(
  CRAWLER_EVENTS.PARSING_FAILED,
  async (crawlLogId: string, sourceId: string, error: string) => {
    console.error(
      `Parsing failed for crawl log ID ${crawlLogId}, source ID ${sourceId}: ${error}`
    );

    // Here you can add additional failure handling:
    // 1. Send notifications to admins
    // 2. Log to external monitoring systems
    // 3. Implement retry logic for certain types of failures

    // For now, we'll just log the failure
    console.log(`Crawl log ${crawlLogId} marked as failed due to: ${error}`);
  }
);

// Handle final completion - log success
CrawlerEvents.on(
  CRAWLER_EVENTS.OPPORTUNITIES_EXTRACTED,
  async (crawlLogId: string, sourceId: string, opportunityCount: number) => {
    console.log(
      `Crawl completed successfully for source ${sourceId}. ` +
        `Crawl log ${crawlLogId} extracted ${opportunityCount} opportunities.`
    );

    // Here you can add completion logic:
    // 1. Send success notifications
    // 2. Update metrics/analytics
    // 3. Trigger follow-up processes
  }
);
