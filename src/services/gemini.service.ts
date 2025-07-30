import { GoogleGenAI } from "@google/genai";
import { Opportunity } from "../types";
import { OpportunityRepository } from "../repositories/opportunity.repository";
import { CustomError } from "../middleware/errorHandler";

export interface ChatContext {
  userProfile: {
    name: string;
    email: string;
    country: string;
    interests: string[];
  };
  recentMessages: Array<{
    content: string;
    sender: "user" | "bot";
    timestamp: Date;
  }>;
  contextType?: "opportunity-search" | "career-advice" | "general";
}

export interface AIResponse {
  response: string;
  suggestions?: string[];
  relatedOpportunities?: Opportunity[];
}

export class GeminiService {
  private genAI: GoogleGenAI;
  private model: any;
  private opportunityRepository: OpportunityRepository;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenAI({ apiKey });
    this.model = this.genAI.models.generateContent;
    this.opportunityRepository = new OpportunityRepository();
  }

  async generateResponse(
    message: string,
    context: ChatContext
  ): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const conversationHistory = this.buildConversationHistory(
        context.recentMessages
      );

      const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nUser: ${message}\n\nAssistant:`;

      const result = await this.model.generateContent(fullPrompt);
      const response = result.response;
      const responseText = response.text();

      // Extract suggestions and related opportunities based on context
      const suggestions = await this.generateSuggestions(message, context);
      const relatedOpportunities = await this.findRelatedOpportunities(
        message,
        context
      );

      return {
        response: responseText,
        suggestions,
        relatedOpportunities,
      };
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new CustomError("Failed to generate AI response", 500);
    }
  }

  private buildSystemPrompt(context: ChatContext): string {
    const { userProfile, contextType } = context;

    let basePrompt = `You are a personalized AI career advisor for ${
      userProfile.name
    }, helping them find opportunities and advance their career. 

User Profile:
- Name: ${userProfile.name}
- Country: ${userProfile.country}
- Interests: ${userProfile.interests.join(", ")}

Your role is to provide helpful, personalized career guidance and opportunity recommendations.`;

    switch (contextType) {
      case "opportunity-search":
        basePrompt += `\n\nFocus on helping the user find relevant opportunities like scholarships, internships, fellowships, and grants that match their profile and interests. Provide specific, actionable advice.`;
        break;
      case "career-advice":
        basePrompt += `\n\nProvide comprehensive career guidance, including skill development, career paths, networking advice, and professional growth strategies tailored to their background.`;
        break;
      default:
        basePrompt += `\n\nBe helpful and supportive in all career-related discussions. Adapt your responses based on the conversation context.`;
    }

    basePrompt += `\n\nKeep responses concise but informative. Always be encouraging and provide actionable advice when possible.`;

    return basePrompt;
  }

  private buildConversationHistory(
    messages: ChatContext["recentMessages"]
  ): string {
    if (messages.length === 0) return "";

    const history = messages
      .slice(-5) // Last 5 messages for context
      .map(
        (msg) =>
          `${msg.sender === "user" ? "User" : "Assistant"}: ${msg.content}`
      )
      .join("\n");

    return `Previous conversation:\n${history}`;
  }

  private async generateSuggestions(
    message: string,
    context: ChatContext
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // Generate context-specific suggestions
    if (
      context.contextType === "opportunity-search" ||
      message.toLowerCase().includes("opportunity") ||
      message.toLowerCase().includes("scholarship")
    ) {
      suggestions.push(
        "Show me scholarships in my field",
        "Find internships in my country",
        "What are the application requirements?",
        "Help me write a personal statement"
      );
    } else if (
      context.contextType === "career-advice" ||
      message.toLowerCase().includes("career")
    ) {
      suggestions.push(
        "How can I improve my skills?",
        "What career paths are available?",
        "Help me build my network",
        "Review my career goals"
      );
    } else {
      suggestions.push(
        "Find opportunities for me",
        "Give me career advice",
        "Help me plan my next steps",
        "What skills should I develop?"
      );
    }

    // Add interest-based suggestions
    context.userProfile.interests.forEach((interest) => {
      suggestions.push(`Find ${interest} opportunities`);
    });

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  private async findRelatedOpportunities(
    message: string,
    context: ChatContext
  ): Promise<Opportunity[]> {
    try {
      // Extract keywords from message and user interests
      const keywords = this.extractKeywords(
        message,
        context.userProfile.interests
      );

      if (keywords.length === 0) return [];

      // Search for opportunities based on keywords
      const searchResults =
        await this.opportunityRepository.findOpportunitiesWithPagination(
          {
            search: keywords[0], // Use the first keyword for search
            sortBy: "relevance",
          },
          { page: 1, limit: 3 }
        );

      return searchResults.opportunities.map((opp) => ({
        id: opp.id,
        title: opp.title,
        type: opp.type.toLowerCase() as
          | "scholarship"
          | "internship"
          | "fellowship"
          | "grant",
        description: opp.description,
        deadline: opp.deadline.toISOString(),
        location: opp.location,
        amount: opp.amount || undefined,
        link: opp.link,
        category: opp.category,
        status: opp.status.toLowerCase() as "published" | "draft" | "archived",
        createdAt: opp.createdAt.toISOString(),
        updatedAt: opp.updatedAt.toISOString(),
      }));
    } catch (error) {
      console.error("Error finding related opportunities:", error);
      return [];
    }
  }

  private extractKeywords(message: string, interests: string[]): string[] {
    const keywords: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Check for opportunity types
    const opportunityTypes = [
      "scholarship",
      "internship",
      "fellowship",
      "grant",
      "job",
    ];
    opportunityTypes.forEach((type) => {
      if (lowerMessage.includes(type)) {
        keywords.push(type);
      }
    });

    // Check for user interests
    interests.forEach((interest) => {
      if (lowerMessage.includes(interest.toLowerCase())) {
        keywords.push(interest);
      }
    });

    // Extract other relevant keywords
    const relevantWords = [
      "technology",
      "engineering",
      "medicine",
      "business",
      "arts",
      "science",
      "research",
    ];
    relevantWords.forEach((word) => {
      if (lowerMessage.includes(word)) {
        keywords.push(word);
      }
    });

    return [...new Set(keywords)]; // Remove duplicates
  }

  async generateCareerAdvice(
    userProfile: any,
    specificQuery?: string
  ): Promise<string> {
    try {
      const prompt = `Provide personalized career advice for ${
        userProfile.name
      } from ${
        userProfile.country
      } with interests in ${userProfile.interests.join(", ")}.${
        specificQuery ? ` Specifically: ${specificQuery}` : ""
      }`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error generating career advice:", error);
      throw new CustomError("Failed to generate career advice", 500);
    }
  }

  async generateOpportunityRecommendations(userProfile: any): Promise<string> {
    try {
      const prompt = `Recommend specific types of opportunities (scholarships, internships, fellowships, grants) that would be most suitable for ${
        userProfile.name
      } from ${
        userProfile.country
      } with interests in ${userProfile.interests.join(
        ", "
      )}. Include specific fields, organizations, or programs to look for.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Error generating opportunity recommendations:", error);
      throw new CustomError(
        "Failed to generate opportunity recommendations",
        500
      );
    }
  }
}
