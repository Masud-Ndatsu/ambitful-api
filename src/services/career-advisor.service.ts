// services/GeminiCareerAdvisorService.ts
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { prisma } from "../database/prisma";
import { createCareerAdvisorAgent } from "../agents/careeer-advisor.agent";

const SYSTEM_PROMPT = `You are an expert career advisor AI assistant helping users with their career development...
[Keep your original system prompt here - too long to repeat, but assign it as a constant]
`;

export class GeminiCareerAdvisorService {
  private conversationHistory: Map<string, BaseMessage[]> = new Map();

  constructor() {}

  public async handleConversation(
    userId: string,
    message: string,
    conversationId?: string
  ): Promise<{
    response: string;
    conversationId: string;
    suggestions?: string[];
  }> {
    const sessionKey = conversationId || `${userId}-${Date.now()}`;
    let history = this.conversationHistory.get(sessionKey) || [];

    // Add user message
    history.push(new HumanMessage(message));

    try {
      // Initialize agent
      const agent = createCareerAdvisorAgent(process.env.GEMINI_API_KEY!);

      // Prepare state for agent (LangGraph-style)
      const initialState = {
        messages: [new SystemMessage(SYSTEM_PROMPT), ...history],
      };

      // Stream is not required, but invoke runs one step
      const result = await agent.invoke(initialState);

      const aiMessage = result.messages[result.messages.length - 1];
      const responseText =
        typeof aiMessage.content === "string"
          ? aiMessage.content
          : (aiMessage.content as any[]).map((c: any) => c.text).join(" ");

      // Update history
      history.push(new AIMessage(responseText));
      this.conversationHistory.set(sessionKey, history);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(userId, responseText);

      return {
        response: responseText,
        conversationId: sessionKey,
        suggestions,
      };
    } catch (error) {
      console.error("Gemini conversation error:", error);
      return {
        response: "Sorry, I encountered an error processing your request.",
        conversationId: sessionKey,
      };
    }
  }

  private async generateSuggestions(
    userId: string,
    lastResponse: string
  ): Promise<string[]> {
    return [
      "Tell me about skill development opportunities",
      "What interview tips do you have for my recent applications?",
      "Find opportunities similar to my saved jobs",
      "Analyze my application success rate",
      "What career paths should I consider?",
    ];
  }
}
