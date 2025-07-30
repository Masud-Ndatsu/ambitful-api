import { GeminiService } from "./gemini.service";
import { AIDraftsRepository } from "../repositories/ai-drafts.repository";
import { CustomError } from "../middleware/errorHandler";

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

  async scanOpportunities(
    urls?: string[],
    keywords?: string[]
  ): Promise<{ message: string; draftsFound: number }> {
    try {
      let results: ScrapingResult[] = [];

      if (urls && urls.length > 0) {
        // Scan provided URLs
        for (const url of urls) {
          const urlResults = await this.scrapeUrl(url);
          results.push(...urlResults);
        }
      }

      if (keywords && keywords.length > 0) {
        // Search for opportunities based on keywords
        const keywordResults = await this.searchByKeywords(keywords);
        results.push(...keywordResults);
      }

      // If no URLs or keywords provided, use default sources
      if (
        (!urls || urls.length === 0) &&
        (!keywords || keywords.length === 0)
      ) {
        results = await this.scanDefaultSources();
      }

      // Save results as drafts
      let draftsCreated = 0;
      for (const result of results) {
        try {
          await this.draftsRepository.createDraft({
            title: result.title,
            source: result.source,
            priority: result.priority,
            extractedData: result.extractedData,
          });
          draftsCreated++;
        } catch (error) {
          // Skip duplicates or errors
          console.error(`Failed to create draft for ${result.title}:`, error);
        }
      }

      return {
        message: `Successfully scanned and found ${draftsCreated} new opportunity drafts`,
        draftsFound: draftsCreated,
      };
    } catch (error) {
      console.error("Scraping service error:", error);
      throw new CustomError("Failed to scan opportunities", 500);
    }
  }

  private async scrapeUrl(url: string): Promise<ScrapingResult[]> {
    try {
      // In a real implementation, you would use a web scraping library like Puppeteer
      // For now, we'll simulate the process with mock data
      const mockHtmlContent = await this.fetchUrlContent(url);

      // Use Gemini to extract opportunity data from HTML content
      const extractedData = await this.extractOpportunityData(
        mockHtmlContent,
        url
      );

      if (extractedData) {
        return [
          {
            title: extractedData.title,
            source: url,
            extractedData,
            priority: this.determinePriority(extractedData),
          },
        ];
      }

      return [];
    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error);
      return [];
    }
  }

  private async fetchUrlContent(url: string): Promise<string> {
    // Mock implementation - in real app, use fetch or similar
    // This would typically use libraries like puppeteer, cheerio, or axios
    return `
      <html>
        <head><title>Sample Scholarship Opportunity</title></head>
        <body>
          <h1>Global Excellence Scholarship 2024</h1>
          <p>Description: A prestigious international scholarship for outstanding students...</p>
          <p>Deadline: 2024-12-15</p>
          <p>Amount: $25,000</p>
          <p>Location: Worldwide</p>
          <p>Eligibility: Undergraduate and graduate students with GPA 3.5+</p>
        </body>
      </html>
    `;
  }

  private async extractOpportunityData(
    htmlContent: string,
    sourceUrl: string
  ): Promise<ScrapingResult["extractedData"] | null> {
    try {
      const extractionPrompt = `
        Extract opportunity information from the following HTML content and return it in JSON format:

        HTML Content:
        ${htmlContent.substring(0, 2000)} // Limit content length

        Please extract and return ONLY a JSON object with these fields (no additional text):
        {
          "title": "string",
          "type": "scholarship|internship|fellowship|grant",
          "description": "string",
          "fullDescription": "string (optional)",
          "deadline": "YYYY-MM-DD format (optional)",
          "location": "string",
          "amount": "string (optional)",
          "link": "${sourceUrl}",
          "eligibility": ["string array (optional)"],
          "benefits": ["string array (optional)"],
          "applicationInstructions": "string (optional)",
          "category": "string"
        }

        If you cannot extract valid opportunity information, return null.
      `;

      const result = await this.geminiService.generateResponse(
        extractionPrompt,
        {
          userProfile: {
            name: "System",
            email: "",
            country: "",
            interests: [],
          },
          recentMessages: [],
          contextType: "general",
        }
      );

      // Parse the response as JSON
      const cleanedResponse = result.response
        .replace(/```json|```/g, "")
        .trim();
      const extractedData = JSON.parse(cleanedResponse);

      // Validate required fields
      if (
        extractedData &&
        extractedData.title &&
        extractedData.type &&
        extractedData.description
      ) {
        return extractedData;
      }

      return null;
    } catch (error) {
      console.error("Error extracting opportunity data:", error);
      return null;
    }
  }

  private async searchByKeywords(
    keywords: string[]
  ): Promise<ScrapingResult[]> {
    // Mock implementation for keyword-based search
    // In real app, this would search through various scholarship/opportunity websites
    const mockResults: ScrapingResult[] = [];

    for (const keyword of keywords) {
      // Simulate finding opportunities based on keywords
      const mockOpportunity: ScrapingResult = {
        title: `${keyword} Research Fellowship 2024`,
        source: `https://example.com/opportunities/${keyword.toLowerCase()}`,
        extractedData: {
          title: `${keyword} Research Fellowship 2024`,
          type: "fellowship",
          description: `Exciting ${keyword} fellowship opportunity for researchers`,
          location: "Various locations",
          link: `https://example.com/opportunities/${keyword.toLowerCase()}`,
          category: keyword,
          deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 90 days from now
          amount: "$15,000",
          eligibility: ["Graduate students", "Recent PhD graduates"],
          benefits: [
            "Research funding",
            "Mentorship",
            "Networking opportunities",
          ],
        },
        priority: "medium",
      };

      mockResults.push(mockOpportunity);
    }

    return mockResults;
  }

  private async scanDefaultSources(): Promise<ScrapingResult[]> {
    // Mock default sources scanning
    // In real implementation, these would be popular scholarship/opportunity websites
    const defaultSources = [
      "https://example.com/scholarships",
      "https://example.com/internships",
      "https://example.com/fellowships",
    ];

    const results: ScrapingResult[] = [];

    for (const source of defaultSources) {
      const sourceResults = await this.scrapeUrl(source);
      results.push(...sourceResults);
    }

    return results;
  }

  private determinePriority(
    extractedData: ScrapingResult["extractedData"]
  ): "high" | "medium" | "low" {
    // Priority logic based on opportunity characteristics
    let score = 0;

    // Amount-based scoring
    if (extractedData.amount) {
      const amountMatch = extractedData.amount.match(/\$?(\d+(?:,\d+)*)/);
      if (amountMatch) {
        const amount = parseInt(amountMatch[1].replace(/,/g, ""));
        if (amount >= 20000) score += 3;
        else if (amount >= 10000) score += 2;
        else if (amount >= 5000) score += 1;
      }
    }

    // Deadline urgency
    if (extractedData.deadline) {
      const deadlineDate = new Date(extractedData.deadline);
      const now = new Date();
      const daysUntilDeadline = Math.ceil(
        (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilDeadline <= 30) score += 2;
      else if (daysUntilDeadline <= 60) score += 1;
    }

    // Type-based scoring
    if (
      extractedData.type === "fellowship" ||
      extractedData.type === "scholarship"
    ) {
      score += 1;
    }

    // Determine final priority
    if (score >= 4) return "high";
    if (score >= 2) return "medium";
    return "low";
  }

  async testConnection(): Promise<boolean> {
    try {
      // Test if the scraping service is working
      await this.fetchUrlContent("https://example.com");
      return true;
    } catch (error) {
      return false;
    }
  }

  async getScrapingStats(): Promise<{
    totalScanned: number;
    successRate: number;
    lastScanDate: Date;
  }> {
    // Mock implementation - in real app, track these metrics
    return {
      totalScanned: 0,
      successRate: 0.85,
      lastScanDate: new Date(),
    };
  }
}
