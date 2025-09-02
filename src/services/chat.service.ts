import {
  chatRepository,
  PaginationOptions,
} from "../repositories/chat.repository";
import { GeminiService, ChatContext, AIResponse } from "./gemini.service";
import { ChatConversation, ChatMessage } from "../types";
import { CustomError } from "../middleware/errorHandler";

export class ChatService {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async sendMessage(
    userId: string,
    message: string,
    conversationId?: string,
    context?: "opportunity-search" | "career-advice" | "general"
  ): Promise<{
    response: string;
    conversationId: string;
    suggestions?: string[];
    relatedOpportunities?: any[];
  }> {
    try {
      let currentConversationId = conversationId;
      const title = message.slice(0, 100);
      // Create new conversation if none provided
      if (!currentConversationId) {
        const newConversation = await chatRepository.createConversation(
          userId,
          title
        );
        currentConversationId = newConversation.id;
      }

      // Verify conversation belongs to user
      const conversation = await chatRepository.findConversationById(
        currentConversationId,
        userId
      );
      if (!conversation) {
        throw new CustomError("Conversation not found", 404);
      }

      // Save user message
      await chatRepository.addMessageToConversation(
        currentConversationId,
        message,
        "user"
      );

      // Get conversation context for AI
      const chatContext = await chatRepository.getConversationContext(
        currentConversationId,
        userId
      );

      const aiContext: ChatContext = {
        userProfile: chatContext.userProfile || {
          name: "User",
          email: "",
          country: "",
          interests: [],
        },
        recentMessages: chatContext.recentMessages.map((msg) => ({
          content: msg.content,
          sender: msg.sender as "user" | "bot",
          timestamp: msg.timestamp,
        })),
        contextType: context,
      };

      // Generate AI response
      const aiResponse: AIResponse = await this.geminiService.generateResponse(
        message,
        aiContext
      );

      // Save AI response
      await chatRepository.addMessageToConversation(
        currentConversationId,
        aiResponse.response,
        "bot",
        {
          suggestions: aiResponse.suggestions,
          relatedOpportunities: aiResponse.relatedOpportunities,
          context,
        }
      );

      return {
        response: aiResponse.response,
        conversationId: currentConversationId,
        suggestions: aiResponse.suggestions,
        relatedOpportunities: aiResponse.relatedOpportunities,
      };
    } catch (error) {
      console.error("Chat service error:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to process message", 500);
    }
  }

  async getUserConversations(
    userId: string,
    pagination: PaginationOptions
  ): Promise<{
    conversations: ChatConversation[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const result = await chatRepository.findUserConversations(
        userId,
        pagination
      );

      const formattedConversations: ChatConversation[] =
        result.conversations.map((conv) => ({
          id: conv.id,
          userId: conv.userId,
          title: conv.title,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        }));

      return {
        conversations: formattedConversations,
        total: result.total,
        page: pagination.page,
        totalPages: Math.ceil(result.total / pagination.limit),
      };
    } catch (error) {
      console.error("Error fetching conversations:", error);
      throw new CustomError("Failed to fetch conversations", 500);
    }
  }

  async getConversationById(
    conversationId: string,
    userId: string
  ): Promise<ChatConversation> {
    try {
      const conversation = await chatRepository.findConversationById(
        conversationId,
        userId
      );

      if (!conversation) {
        throw new CustomError("Conversation not found", 404);
      }

      return {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title,
        messages: conversation.messages.map((msg) => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender as "user" | "bot",
          timestamp: msg.timestamp.toISOString(),
          metadata: msg.metadata,
        })),
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error("Error fetching conversation:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to fetch conversation", 500);
    }
  }

  async getMessagesByConversationId(
    conversationId: string,
    userId: string,
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<{
    messages: ChatMessage[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const result = await chatRepository.getChatMessages(
        conversationId,
        userId,
        pagination
      );

      const formattedMessages: ChatMessage[] = result.messages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as "user" | "bot",
        timestamp: msg.timestamp.toISOString(),
        metadata: msg.metadata,
      }));

      return {
        messages: formattedMessages,
        total: result.total,
        page: pagination.page,
        totalPages: Math.ceil(result.total / pagination.limit),
      };
    } catch (error) {
      console.error("Error fetching messages:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to fetch messages", 500);
    }
  }

  async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<{ message: string }> {
    try {
      const deleted = await chatRepository.deleteConversation(
        conversationId,
        userId
      );

      if (!deleted) {
        throw new CustomError("Conversation not found", 404);
      }

      return { message: "Conversation deleted successfully" };
    } catch (error) {
      console.error("Error deleting conversation:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to delete conversation", 500);
    }
  }

  async generateCareerAdvice(userId: string, query?: string): Promise<string> {
    try {
      // Get user profile for personalized advice
      const context = await chatRepository.getConversationContext(
        "temp",
        userId
      );

      if (!context.userProfile) {
        throw new CustomError("User profile not found", 404);
      }

      return await this.geminiService.generateCareerAdvice(
        context.userProfile,
        query
      );
    } catch (error) {
      console.error("Error generating career advice:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to generate career advice", 500);
    }
  }

  async generateOpportunityRecommendations(userId: string): Promise<string> {
    try {
      // Get user profile for personalized recommendations
      const context = await chatRepository.getConversationContext(
        "temp",
        userId
      );

      if (!context.userProfile) {
        throw new CustomError("User profile not found", 404);
      }

      return await this.geminiService.generateOpportunityRecommendations(
        context.userProfile
      );
    } catch (error) {
      console.error("Error generating opportunity recommendations:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "Failed to generate opportunity recommendations",
        500
      );
    }
  }
}

export const chatService = new ChatService();
