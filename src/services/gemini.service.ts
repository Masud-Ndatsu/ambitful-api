import { GoogleGenAI } from "@google/genai";
import { Opportunity, ParsedOpportunity } from "../types";
import { opportunityRepository } from "../repositories/opportunity.repository";
import { profileContextService } from "./profileContext.service";
import { CustomError } from "../middleware/errorHandler";
import { DEFAULT_CATEGORIES, OpportunityType } from "../enums";

export interface ChatContext {
  userProfile: {
    name: string;
    email: string;
    country: string;
    interests: string[];
    bio?: string;
    skills: string[];

    // Enhanced profile for AI personalization
    academicLevel?: string;
    fieldOfStudy?: string;
    careerStage?: string;
    goals?: string[];
    personalityTraits?: string[];
    learningStyle?: string;
    timeZone?: string;
    languages?: string[];
    workExperience?: string;
    currentFocus?: string[];

    // AI preferences
    preferences?: any;
    aiInteractionPrefs?: any;
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
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }

    this.genAI = new GoogleGenAI({ apiKey });
  }

  async parseBlockToOpportunities(
    blockHtml: string
  ): Promise<ParsedOpportunity[]> {
    // Get categories dynamically from existing opportunities
    // const categories =
    const categoriesList =
      DEFAULT_CATEGORIES.length > 0
        ? DEFAULT_CATEGORIES.join(", ")
        : "Technology, Healthcare, Business, Education, Research, Arts, Social, General";
    const opportunityTypes = Object.values(OpportunityType).join(", ");
    const prompt = `
From the following HTML block, extract all distinct opportunities.
For each opportunity, return a JSON object with the following fields:

"title": A concise, descriptive name of the opportunity. (REQUIRED)
"description": A brief summary of the opportunity, typically the first 2-3 sentences. (REQUIRED)
"type": The type of opportunity. Must be one of: ${opportunityTypes}. (REQUIRED)
"deadline": The application deadline in YYYY-MM-DD format. IMPORTANT: Always use a future date. If no deadline is found or deadline has passed, use a date far in the future (e.g., "2099-12-31"). Never use past dates.
"link": The full, absolute URL to apply or learn more about the opportunity. (REQUIRED)
"location": The primary work/study location (e.g., "New York, NY", "Remote", "Multiple Cities"). If not found, use "Not Specified".
"amount": The monetary value, stipend, or scholarship amount (e.g., "$5,000", "Full tuition", "€10,000"). If not found, provide null.
"category": From the categories list below, select the name (not ID) that best matches the opportunity. If no clear match, use "General Opportunities".

Available Categories:
${categoriesList}

Return ONLY an array of these JSON objects. Do NOT include any introductory or concluding text, explanations, or code fences. If no opportunities are found, return an empty array: [].

HTML Block:
${blockHtml}
`;

    try {
      console.log("Sending HTML block to Gemini for parsing...");

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                description: { type: "STRING" },
                type: {
                  type: "STRING",
                  enum: ["SCHOLARSHIP", "INTERNSHIP", "FELLOWSHIP", "GRANT"],
                },
                deadline: { type: "STRING" },
                link: { type: "STRING" },
                location: { type: "STRING" },
                amount: {
                  oneOf: [{ type: "STRING" }, { type: "NULL" }],
                },
                category: { type: "STRING" },
              },
              required: [
                "title",
                "description",
                "type",
                "deadline",
                "link",
                "location",
                "category",
              ],
            },
          },
        },
      });

      const responseText = result.text || "";

      if (!responseText) {
        console.warn("Gemini returned no content for parsing.");
        return [];
      }

      const cleanedAIResponse = this.cleanAIResponse(responseText);
      const parsed = JSON.parse(cleanedAIResponse);

      console.log({ parsed });

      if (!Array.isArray(parsed)) {
        console.warn("Gemini response was not an array.");
        return [];
      }

      console.log(`Gemini successfully parsed ${parsed.length} opportunities.`);
      return parsed;
    } catch (err: any) {
      console.error("Gemini parse error", err.message);
      return [];
    }
  }

  async generateResponse(
    message: string,
    context: ChatContext,
    userId?: string
  ): Promise<AIResponse> {
    try {
      const systemPrompt = await this.buildSystemPrompt(context, userId);
      const conversationHistory = this.buildConversationHistory(
        context.recentMessages
      );

      const fullPrompt = `${systemPrompt}\n\n${conversationHistory}\n\nUser: ${message}\n\nAssistant:`;

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: fullPrompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0, // Disables thinking for faster responses
          },
        },
      });
      const responseText = result.text || "";

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

  private async buildSystemPrompt(
    context: ChatContext,
    userId?: string
  ): Promise<string> {
    const { userProfile, contextType } = context;

    let basePrompt = `You are an expert AI Career Advisor and Educational Consultant with deep expertise across multiple industries and academic disciplines. Your role is to provide comprehensive, personalized career guidance for ${userProfile.name}.

## Your Expertise Includes:
- Academic pathway planning and degree/program selection
- Industry-specific career development strategies  
- Professional skill development and competency mapping
- Opportunity identification (scholarships, internships, fellowships, grants, jobs)
- Personal branding and professional networking
- Interview preparation and application strategies
- Salary negotiation and career transition planning
- Work-life balance and professional growth optimization
- Cross-cultural career guidance for international opportunities

## Core Responsibilities:
1. Analyze the user's complete profile to understand their unique situation
2. Provide strategic, actionable advice tailored to their academic and career stage
3. Recommend specific opportunities, programs, and pathways
4. Suggest concrete next steps with timelines and resource links
5. Address both immediate needs and long-term career aspirations
6. Adapt communication style to match their learning preferences
7. Consider cultural, geographical, and industry-specific factors`;

    // Get enhanced profile context if userId is available
    if (userId) {
      try {
        const userContext = await profileContextService.getUserContext(userId);

        console.log({ userContext });

        basePrompt += `\n\n## User Profile Analysis:`;

        // Personal Background
        basePrompt += `\n**Personal Background:**
- Name: ${userContext.personalInfo.name}
- Location: ${userContext.personalInfo.country}
- Time Zone: ${userContext.personalInfo.timeZone || "Not specified"}
- Languages: ${
          userContext.personalInfo.languages.length > 0
            ? userContext.personalInfo.languages.join(", ")
            : "Not specified"
        }`;

        // Academic Profile
        if (
          userContext.academicProfile.level ||
          userContext.academicProfile.fieldOfStudy ||
          userContext.academicProfile.workExperience
        ) {
          basePrompt += `\n\n**Academic & Professional Standing:**`;
          if (userContext.academicProfile.level) {
            basePrompt += `\n- Academic Level: ${userContext.academicProfile.level.replace(
              "_",
              " "
            )}`;
          }
          if (userContext.academicProfile.fieldOfStudy) {
            basePrompt += `\n- Field of Study: ${userContext.academicProfile.fieldOfStudy}`;
          }
          if (userContext.professionalProfile.careerStage) {
            basePrompt += `\n- Career Stage: ${userContext.professionalProfile.careerStage.replace(
              "_",
              " "
            )}`;
          }
          if (userContext.academicProfile.workExperience) {
            basePrompt += `\n- Work Experience: ${userContext.academicProfile.workExperience} years`;
          }
        }

        // Skills and Competencies
        if (
          userContext.professionalProfile.skills.length > 0 ||
          userContext.personalityProfile.interests.length > 0
        ) {
          basePrompt += `\n\n**Skills & Interests:**`;
          if (userContext.professionalProfile.skills.length > 0) {
            basePrompt += `\n- Technical Skills: ${userContext.professionalProfile.skills.join(
              ", "
            )}`;
          }
          if (userContext.personalityProfile.interests.length > 0) {
            basePrompt += `\n- Areas of Interest: ${userContext.personalityProfile.interests.join(
              ", "
            )}`;
          }
        }

        // Goals and Focus
        if (
          userContext.goals.shortTerm.length > 0 ||
          userContext.goals.longTerm.length > 0 ||
          userContext.goals.currentFocus.length > 0
        ) {
          basePrompt += `\n\n**Goals & Current Focus:**`;
          if (userContext.goals.currentFocus.length > 0) {
            basePrompt += `\n- Current Focus Areas: ${userContext.goals.currentFocus.join(
              ", "
            )}`;
          }
          if (userContext.goals.shortTerm.length > 0) {
            basePrompt += `\n- Short-term Goals: ${userContext.goals.shortTerm.join(
              ", "
            )}`;
          }
          if (userContext.goals.longTerm.length > 0) {
            basePrompt += `\n- Long-term Goals: ${userContext.goals.longTerm.join(
              ", "
            )}`;
          }
        }

        // Learning and Personality
        if (
          userContext.personalityProfile.learningStyle ||
          userContext.personalityProfile.personalityTraits.length > 0
        ) {
          basePrompt += `\n\n**Learning & Communication Preferences:**`;
          if (userContext.personalityProfile.learningStyle) {
            basePrompt += `\n- Preferred Learning Style: ${userContext.personalityProfile.learningStyle.replace(
              "_",
              "/"
            )}`;
          }
          if (userContext.personalityProfile.personalityTraits.length > 0) {
            basePrompt += `\n- Personality Traits: ${userContext.personalityProfile.personalityTraits.join(
              ", "
            )}`;
          }
        }

        // Bio
        if (userContext.personalityProfile.bio) {
          basePrompt += `\n\n**Personal Background:**\n${userContext.personalityProfile.bio}`;
        }
      } catch (error) {
        // Fallback to basic profile if enhanced context fails
        basePrompt += `\n\n## Basic Profile:
- Name: ${userProfile.name}
- Country: ${userProfile.country}
- Interests: ${userProfile.interests.join(", ")}`;
      }
    } else {
      basePrompt += `\n\n## Basic Profile:
- Name: ${userProfile.name}
- Country: ${userProfile.country}
- Interests: ${userProfile.interests.join(", ")}`;
    }

    // Context-specific guidance
    basePrompt += `\n\n## Response Guidelines:`;

    switch (contextType) {
      case "opportunity-search":
        basePrompt += `
**OPPORTUNITY SEARCH MODE:**
- Analyze their academic level and career stage to recommend appropriate opportunities
- Consider their field of study and interests for relevant matches
- Provide specific application strategies based on their experience level
- Include timeline considerations and deadline management advice
- Suggest both immediate and future opportunities based on their goals
- Recommend specific platforms, organizations, and databases to search
- Provide application tips tailored to their academic/professional background`;
        break;

      case "career-advice":
        basePrompt += `
**CAREER GUIDANCE MODE:**
- Provide strategic career planning based on their current academic/professional stage
- Analyze skill gaps and recommend specific development areas
- Suggest career pathways that align with their field of study and interests
- Include industry trends and market insights relevant to their field
- Recommend networking strategies appropriate for their career stage
- Provide guidance on professional development and certification opportunities
- Address both immediate career moves and long-term career evolution`;
        break;

      default:
        basePrompt += `
**COMPREHENSIVE ADVISORY MODE:**
- Adapt your expertise to the specific question or need presented
- Draw connections between their academic background and career opportunities
- Provide holistic advice that considers their entire profile
- Be proactive in identifying opportunities they might not have considered
- Offer strategic insights based on industry knowledge and trends`;
    }

    basePrompt += `

## Communication Standards:
- **Personalization**: Always reference their specific background and goals
- **Actionability**: Provide concrete steps and specific recommendations
- **Relevance**: Ensure all advice aligns with their academic level and career stage
- **Encouragement**: Be supportive while being realistic about challenges
- **Comprehensiveness**: Address both immediate needs and strategic planning
- **Cultural Sensitivity**: Consider their geographical and cultural context
- **Learning Adaptation**: Adjust explanation style to match their learning preferences

Provide detailed, professional advice that demonstrates deep understanding of their unique situation and career landscape.`;

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
    const { userProfile } = context;

    // Generate context-specific suggestions based on enhanced profile
    if (
      context.contextType === "opportunity-search" ||
      message.toLowerCase().includes("opportunity") ||
      message.toLowerCase().includes("scholarship")
    ) {
      // Academic level-specific suggestions
      if (userProfile.academicLevel === "undergraduate") {
        suggestions.push(
          "Find undergraduate scholarships",
          "Summer internship programs"
        );
      } else if (userProfile.academicLevel === "graduate") {
        suggestions.push("Graduate fellowships", "Research assistantships");
      } else if (userProfile.academicLevel === "postgraduate") {
        suggestions.push("Postdoc opportunities", "Research grants");
      }

      // Field-specific suggestions
      if (userProfile.fieldOfStudy) {
        suggestions.push(`${userProfile.fieldOfStudy} specific opportunities`);
      }

      suggestions.push(
        "Application deadline calendar",
        "Personal statement guidance"
      );
    } else if (
      context.contextType === "career-advice" ||
      message.toLowerCase().includes("career")
    ) {
      // Career stage-specific suggestions
      if (userProfile.careerStage === "student") {
        suggestions.push(
          "Career exploration strategies",
          "Skill building roadmap"
        );
      } else if (userProfile.careerStage === "entry_level") {
        suggestions.push(
          "First job search strategy",
          "Professional networking tips"
        );
      } else if (userProfile.careerStage === "mid_level") {
        suggestions.push(
          "Career advancement strategies",
          "Leadership development"
        );
      }

      // Goal-oriented suggestions
      if (userProfile.currentFocus && userProfile.currentFocus.length > 0) {
        suggestions.push(`Develop ${userProfile.currentFocus[0]} expertise`);
      }

      suggestions.push("Industry transition guidance", "Skill gap analysis");
    } else {
      // General suggestions based on profile
      if (userProfile.goals && userProfile.goals.length > 0) {
        suggestions.push("Help achieve my goals");
      }
      if (userProfile.careerStage) {
        suggestions.push(
          `${userProfile.careerStage.replace("_", " ")} career advice`
        );
      }
      suggestions.push(
        "Personalized opportunity search",
        "Career development planning"
      );
    }

    // Add interest-based suggestions
    userProfile.interests.forEach((interest) => {
      suggestions.push(`${interest} career paths`);
    });

    return [...new Set(suggestions)].slice(0, 6); // Remove duplicates, limit to 6 suggestions
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
        await opportunityRepository.findOpportunitiesWithPagination(
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
    userId: string,
    specificQuery?: string
  ): Promise<string> {
    try {
      const userContext = await profileContextService.getUserContext(userId);
      const enhancedContext =
        await profileContextService.generatePersonalizedContext(userId);

      const prompt = `You are an expert career strategist and educational consultant. Analyze this comprehensive user profile and provide detailed, personalized career advice:

## USER PROFILE ANALYSIS:
${enhancedContext}

## REQUEST:
${
  specificQuery
    ? `Specific Query: ${specificQuery}`
    : "Provide comprehensive career guidance and strategic next steps."
}

## REQUIRED ANALYSIS AREAS:
1. **Academic Pathway Assessment**: Evaluate their current academic standing and recommend next steps
2. **Career Progression Strategy**: Map out career advancement opportunities based on their stage and goals
3. **Skill Development Plan**: Identify critical skills needed for their field and career aspirations
4. **Opportunity Identification**: Suggest specific programs, certifications, or positions they should pursue
5. **Timeline & Milestones**: Provide a realistic timeline with measurable milestones
6. **Industry Context**: Include relevant market trends and demands in their field
7. **Personal Growth**: Consider their personality traits and learning style in recommendations

## RESPONSE REQUIREMENTS:
- **Specificity**: Name actual programs, organizations, certifications, or resources
- **Actionability**: Provide clear next steps they can take immediately
- **Personalization**: Reference their specific background, goals, and constraints
- **Strategic Depth**: Address both tactical moves and long-term strategy
- **Cultural Awareness**: Consider their geographic location and cultural context

Provide a comprehensive response that demonstrates expert-level career counseling tailored to their unique profile.`;

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      return result.text || "";
    } catch (error) {
      console.error("Error generating career advice:", error);
      throw new CustomError("Failed to generate career advice", 500);
    }
  }

  async generateOpportunityRecommendations(userId: string): Promise<string> {
    try {
      const enhancedContext =
        await profileContextService.generatePersonalizedContext(userId);

      const prompt = `You are an AI opportunity advisor. Based on this comprehensive user profile, recommend specific types of opportunities (scholarships, internships, fellowships, grants) that would be most suitable:

${enhancedContext}

Provide specific recommendations including:
- Types of opportunities that match their profile
- Specific fields, organizations, or programs to look for
- Application strategies based on their career stage and goals
- Timeline recommendations based on their current focus

Be specific and actionable in your recommendations.`;

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
        },
      });
      return result.text || "";
    } catch (error) {
      console.error("Error generating opportunity recommendations:", error);
      throw new CustomError(
        "Failed to generate opportunity recommendations",
        500
      );
    }
  }

  async generateImprovedOpportunityData(rawOpportunityText: string): Promise<{
    description: string;
    benefits: string[];
    eligibility: string[];
    howToApply: string[];
  }> {
    try {
      const prompt = `Extract and improve the following opportunity information into a structured format. Make the content concise, clear, and actionable:

Raw opportunity text:
${rawOpportunityText}

Please structure the response as follows:
1. Description: A concise 3-5 sentence summary of what this opportunity is about
2. Benefits: List specific benefits/rewards (be concrete, include monetary amounts if mentioned)
3. Eligibility: List clear eligibility requirements 
4. How to Apply: Step-by-step application process

Format your response exactly like this JSON structure:
{
  "description": "Clear, concise description here",
  "benefits": ["Benefit 1", "Benefit 2", "Benefit 3"],
  "eligibility": ["Requirement 1", "Requirement 2", "Requirement 3"],
  "howToApply": ["Step 1", "Step 2", "Step 3"]
}

Make sure each array item is specific and actionable. For benefits, include monetary amounts when available. For eligibility, be specific about age, education, experience requirements. For application steps, provide clear actionable instructions.`;

      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        // config: {
        //   thinkingConfig: {
        //     thinkingBudget: 0,
        //   },
        // },
      });
      const responseText = result.text || "";

      // Parse the JSON response
      try {
        const cleanedResponse = this.cleanAIResponse(responseText);
        const parsedResponse = JSON.parse(cleanedResponse);
        console.log({ parsedResponse });
        // Validate the structure
        if (
          !parsedResponse.description ||
          !Array.isArray(parsedResponse.benefits) ||
          !Array.isArray(parsedResponse.eligibility) ||
          !Array.isArray(parsedResponse.howToApply)
        ) {
          throw new CustomError("Invalid response structure", 400);
        }

        return {
          description: parsedResponse.description,
          benefits: parsedResponse.benefits,
          eligibility: parsedResponse.eligibility,
          howToApply: parsedResponse.howToApply,
        };
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        return null;
      }
    } catch (error) {
      console.error("Error generating improved opportunity data:", error);
      throw new CustomError(
        "Failed to generate improved opportunity data",
        500
      );
    }
  }

  // private extractOpportunityDataManually(
  //   _aiResponse: string,
  //   originalText: string
  // ): {
  //   description: string;
  //   benefits: string[];
  //   eligibility: string[];
  //   howToApply: string[];
  // } {
  //   // Fallback manual extraction logic

  //   return {
  //     description:
  //       originalText.split("\n")[0] || "Opportunity details available",
  //     benefits: ["Benefits information available in full description"],
  //     eligibility: ["Please refer to the full opportunity details"],
  //     howToApply: ["Visit the opportunity link for application instructions"],
  //   };
  // }

  async extractOpportunityDetails(htmlContent: string): Promise<{
    fullDescription: string;
    applicationInstructions: string[];
    eligibility: string[];
    benefits: string[];
    applicationLink?: string;
  } | null> {
    const prompt = `Extract and improve the following opportunity information from HTML content into a structured format. Make the content concise, clear, and actionable:

HTML Content:
${htmlContent}

Please structure the response as follows:
1. Full Description: A comprehensive but concise description of what this opportunity is about, combining all relevant details
2. Application Instructions: Step-by-step application process (be specific and actionable)
3. Eligibility: Clear eligibility requirements (be specific about age, education, experience, nationality, etc.)
4. Benefits: List specific benefits/rewards (be concrete, include monetary amounts if mentioned)
5. Application Link: Direct URL to application page if found in the content

Format your response exactly like this JSON structure:
{
  "fullDescription": "Clear, comprehensive description combining all relevant opportunity details",
  "applicationInstructions": ["Step 1: Specific action", "Step 2: Specific action", "Step 3: Specific action"],
  "eligibility": ["Specific requirement 1", "Specific requirement 2", "Specific requirement 3"],
  "benefits": ["Specific benefit 1 with amounts", "Specific benefit 2", "Specific benefit 3"],
  "applicationLink": "Direct application URL if found"
}

Make sure each array item is specific and actionable. For benefits, include monetary amounts when available. For eligibility, be specific about requirements. For application instructions, provide clear actionable steps. For the full description, combine all relevant information into a coherent, comprehensive overview.

If you cannot extract valid opportunity information, return null.`;

    try {
      const result = await this.genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              fullDescription: { type: "STRING" },
              applicationInstructions: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              eligibility: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              benefits: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              applicationLink: { type: "STRING" },
            },
            required: [
              "fullDescription",
              "applicationInstructions",
              "eligibility",
              "benefits",
            ],
          },
        },
      });

      const responseText = result.text || "";

      if (!responseText) {
        console.warn(
          "Gemini returned no content for opportunity detail parsing."
        );
        return null;
      }

      const cleanedAIResponse = this.cleanAIResponse(responseText);
      const parsed = JSON.parse(cleanedAIResponse);

      console.log("Successfully parsed opportunity details:", parsed);

      return {
        fullDescription:
          parsed.fullDescription || "No detailed description available",
        applicationInstructions: parsed.applicationInstructions || [],
        eligibility: parsed.eligibility || [],
        benefits: parsed.benefits || [],
        applicationLink: parsed.applicationLink || undefined,
      };
    } catch (error) {
      console.error("Error parsing opportunity details:", error);
      return null;
    }
  }

  cleanAIResponse(raw: string): string {
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    return match ? match[1].trim() : raw.trim();
  }
}

export const geminiService = new GeminiService();
