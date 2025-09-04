import { prisma } from "../database/prisma";
import { ChatConversation, ChatMessage } from "@prisma/client";

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class ChatRepository {
  async createConversation(
    userId: string,
    title?: string
  ): Promise<ChatConversation> {
    return await prisma.chatConversation.create({
      data: {
        userId,
        title,
      },
    });
  }

  async findConversationById(
    id: string,
    userId: string
  ): Promise<(ChatConversation & { messages: ChatMessage[] }) | null> {
    return await prisma.chatConversation.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    });
  }

  async findUserConversations(
    userId: string,
    pagination: PaginationOptions
  ): Promise<{
    conversations: (ChatConversation & { messages: ChatMessage[] })[];
    total: number;
  }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      prisma.chatConversation.findMany({
        where: {
          userId,
        },
        skip,
        take: limit,
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          messages: {
            orderBy: {
              timestamp: "desc",
            },
            take: 5, // Only get the last message for conversation list
          },
        },
      }),
      prisma.chatConversation.count({
        where: {
          userId,
        },
      }),
    ]);

    return { conversations, total };
  }

  async addMessageToConversation(
    conversationId: string,
    content: string,
    sender: "user" | "bot",
    metadata?: any
  ): Promise<ChatMessage> {
    const message = await prisma.chatMessage.create({
      data: {
        conversationId,
        content,
        sender: sender.toLowerCase(),
        metadata,
        timestamp: new Date(),
      },
    });

    // Update conversation's updatedAt timestamp
    await prisma.chatConversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return message;
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    try {
      const conversation = await prisma.chatConversation.findFirst({
        where: {
          id,
          userId,
        },
      });

      if (!conversation) {
        return false;
      }

      await prisma.chatConversation.delete({
        where: {
          id,
        },
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  async getConversationHistory(
    conversationId: string,
    userId: string,
    limit: number = 20
  ): Promise<ChatMessage[]> {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return [];
    }

    return await prisma.chatMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: "desc",
      },
      take: limit,
    });
  }

  async getChatMessages(
    conversationId: string,
    userId: string,
    pagination: PaginationOptions
  ): Promise<{
    messages: ChatMessage[];
    total: number;
  }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Verify conversation belongs to user
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });

    if (!conversation) {
      return { messages: [], total: 0 };
    }

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: {
          conversationId,
        },
        skip,
        take: limit,
        orderBy: {
          timestamp: "asc",
        },
      }),
      prisma.chatMessage.count({
        where: {
          conversationId,
        },
      }),
    ]);

    return { messages, total };
  }

  async getConversationContext(
    conversationId: string,
    userId: string
  ): Promise<{ userProfile: any; recentMessages: ChatMessage[] }> {
    const [user, recentMessages] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          country: true,
          interests: true,
          bio: true,
          skills: true,

          // Enhanced profile for AI personalization
          academicLevel: true,
          fieldOfStudy: true,
          careerStage: true,
          goals: true,
          personalityTraits: true,
          learningStyle: true,
          timeZone: true,
          languages: true,
          workExperience: true,
          currentFocus: true,

          // AI preferences
          preferences: true,
          aiInteractionPrefs: true,
        },
      }),
      this.getConversationHistory(conversationId, userId, 10),
    ]);

    return {
      userProfile: user,
      recentMessages: recentMessages.reverse(), // Reverse to get chronological order
    };
  }
}

export const chatRepository = new ChatRepository();
