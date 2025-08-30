import { GeminiService } from "./gemini.service";
import { AIDraftsRepository } from "../repositories/ai-drafts.repository";
import { CustomError } from "../middleware/errorHandler";
import axios, { AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import { ParsedOpportunity } from "../types";

export interface ScrapingResult {
  title: string;
  source: string;
  extractedData: {
    title: string;
    type: "scholarship" | "internship" | "fellowship" | "grant";
    description: string;
    fullDescription?: string;
    deadline?: string;
    location: string;
    amount?: string;
    link: string;
    eligibility?: string[];
    benefits?: string[];
    applicationInstructions?: string;
    category: string;
  };
  priority: "high" | "medium" | "low";
}

export class ScrapingService {
  private geminiService: GeminiService;
  private draftsRepository: AIDraftsRepository;

  constructor() {
    this.geminiService = new GeminiService();
    this.draftsRepository = new AIDraftsRepository();
  }

  async fetchPageContent(url: string): Promise<string> {
    try {
      // Validate URL
      if (!url || typeof url !== "string") {
        throw new Error("Invalid URL provided");
      }

      // Set up axios configuration with appropriate headers
      const response: AxiosResponse<string> = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          Connection: "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400, // Accept any status code less than 400
      });

      // Check if we received HTML content
      const contentType = response.headers["content-type"] || "";
      if (!contentType.includes("text/html")) {
        throw new Error(
          `URL does not return HTML content. Content-Type: ${contentType}`
        );
      }

      // Load HTML with cheerio for parsing and cleaning
      const $ = cheerio.load(response.data);

      // Remove script and style elements to clean up the HTML
      $("script, style, noscript").remove();

      // Get the cleaned HTML
      const cleanedHtml = $.html();

      if (!cleanedHtml || cleanedHtml.trim().length === 0) {
        throw new Error("No HTML content found after parsing");
      }

      console.log(`Successfully fetched and parsed content from ${url}`);
      return cleanedHtml;
    } catch (error) {
      console.error(`Failed to fetch page content from ${url}:`, error);

      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED") {
          throw new CustomError(`Request timeout while fetching ${url}`);
        } else if (error.response) {
          throw new CustomError(
            `HTTP ${error.response.status}: ${error.response.statusText} for ${url}`
          );
        } else if (error.request) {
          throw new CustomError(`Network error while fetching ${url}`);
        }
      }

      throw new CustomError(
        `Failed to fetch page content: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async parseContentForOpportunities(
    content: string
  ): Promise<ParsedOpportunity[]> {
    try {
      // Use Gemini to parse the HTML content for opportunities
      const opportunities = await this.geminiService.parseBlockToOpportunities(
        content
      );
      return opportunities || [];
    } catch (error) {
      console.error("Error parsing content for opportunities:", error);
      return [];
    }
  }

  async extractOpportunityDetails(htmlContent: string) {
    try {
      const parsedOpportunity =
        await this.geminiService.extractOpportunityDetails(htmlContent);
      return parsedOpportunity;
    } catch (error) {
      console.error("Error extracting opportunity data:", error);
      return null;
    }
  }

  private determinePriority(
    extractedData: ScrapingResult["extractedData"]
  ): "high" | "medium" | "low" {
    // Simple priority logic based on extracted data
    let score = 0;

    // Check for amount/value
    if (extractedData.amount) {
      const amount = extractedData.amount.toLowerCase();
      if (amount.includes("$") || amount.includes("full")) {
        score += 2;
      } else {
        score += 1;
      }
    }

    // Check for deadline urgency
    if (extractedData.deadline) {
      const deadlineDate = new Date(extractedData.deadline);
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
    if (extractedData.type === "fellowship" || extractedData.type === "grant") {
      score += 2;
    } else if (extractedData.type === "scholarship") {
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
}
