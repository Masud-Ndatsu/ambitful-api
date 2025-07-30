import { prisma } from "../database/prisma";
import { AIDraft } from "@prisma/client";
import { Opportunity } from "../types";

export interface AIDraftFilters {
  status?: "pending" | "approved" | "rejected";
  priority?: "high" | "medium" | "low";
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export class AIDraftsRepository {
  async findDraftsWithPagination(
    filters: AIDraftFilters,
    pagination: PaginationOptions
  ): Promise<{
    drafts: AIDraft[];
    total: number;
    pending: number;
  }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters.priority) {
      where.priority = filters.priority.toUpperCase();
    }

    const [drafts, total, pending] = await Promise.all([
      prisma.aIDraft.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: "desc" }, // High priority first
          { createdAt: "desc" },
        ],
      }),
      prisma.aIDraft.count({ where }),
      prisma.aIDraft.count({ where: { status: "PENDING" } }),
    ]);

    return { drafts, total, pending };
  }

  async findDraftById(id: string): Promise<AIDraft | null> {
    return await prisma.aIDraft.findUnique({
      where: { id },
    });
  }

  async createDraft(draftData: {
    title: string;
    source: string;
    priority: "high" | "medium" | "low";
    extractedData: any;
  }): Promise<AIDraft> {
    return await prisma.aIDraft.create({
      data: {
        title: draftData.title,
        source: draftData.source,
        status: "PENDING",
        priority: draftData.priority.toUpperCase() as any,
        extractedData: draftData.extractedData,
      },
    });
  }

  async updateDraftStatus(
    id: string,
    status: "approved" | "rejected",
    feedback?: string
  ): Promise<AIDraft> {
    return await prisma.aIDraft.update({
      where: { id },
      data: {
        status: status.toUpperCase() as any,
        feedback: feedback as string,
        reviewedAt: new Date(),
      },
    });
  }

  async deleteDraft(id: string): Promise<void> {
    await prisma.aIDraft.delete({
      where: { id },
    });
  }

  async createOpportunityFromDraft(
    draftId: string,
    opportunityData: any
  ): Promise<{ draft: AIDraft; opportunity: any }> {
    const result = await prisma.$transaction(async (prisma) => {
      // Create the opportunity
      const opportunity = await prisma.opportunity.create({
        data: {
          title: opportunityData.title,
          type: opportunityData.type.toUpperCase() as any,
          description: opportunityData.description,
          deadline: new Date(opportunityData.deadline),
          location: opportunityData.location,
          amount: opportunityData.amount,
          link: opportunityData.link,
          category: opportunityData.category,
          status: "DRAFT", // Start as draft for admin review
          detail: {
            create: {
              fullDescription:
                opportunityData.fullDescription || opportunityData.description,
              applicationInstructions:
                opportunityData.applicationInstructions ||
                "Apply through the provided link",
              eligibility: opportunityData.eligibility || [],
              benefits: opportunityData.benefits || [],
              views: 0,
              applications: 0,
              saves: 0,
            },
          },
        },
        include: {
          detail: true,
        },
      });

      // Update the draft status
      const draft = await prisma.aIDraft.update({
        where: { id: draftId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      });

      return { draft, opportunity };
    });

    return result;
  }

  async getDraftStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byPriority: { high: number; medium: number; low: number };
  }> {
    const [total, pending, approved, rejected, high, medium, low] =
      await Promise.all([
        prisma.aIDraft.count(),
        prisma.aIDraft.count({ where: { status: "PENDING" } }),
        prisma.aIDraft.count({ where: { status: "APPROVED" } }),
        prisma.aIDraft.count({ where: { status: "REJECTED" } }),
        prisma.aIDraft.count({ where: { priority: "HIGH" } }),
        prisma.aIDraft.count({ where: { priority: "MEDIUM" } }),
        prisma.aIDraft.count({ where: { priority: "LOW" } }),
      ]);

    return {
      total,
      pending,
      approved,
      rejected,
      byPriority: { high, medium, low },
    };
  }

  async bulkUpdateDrafts(
    ids: string[],
    status: "approved" | "rejected"
  ): Promise<number> {
    const result = await prisma.aIDraft.updateMany({
      where: { id: { in: ids } },
      data: {
        status: status.toUpperCase() as any,
        reviewedAt: new Date(),
      },
    });

    return result.count;
  }

  async findRecentDrafts(limit: number = 10): Promise<AIDraft[]> {
    return await prisma.aIDraft.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async findDraftsBySource(source: string): Promise<AIDraft[]> {
    return await prisma.aIDraft.findMany({
      where: {
        source: {
          contains: source,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateDraftData(id: string, extractedData: any): Promise<AIDraft> {
    return await prisma.aIDraft.update({
      where: { id },
      data: {
        extractedData,
        updatedAt: new Date(),
      },
    });
  }
}
