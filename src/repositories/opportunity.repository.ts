import { prisma } from "../database/prisma";
import {
  Opportunity,
  OpportunityDetail,
  OpportunityType,
  OpportunityStatus,
} from "@prisma/client";

export interface OpportunityFilters {
  search?: string;
  type?: string;
  location?: string;
  deadline?: string;
  category?: string;
  sortBy?: "newest" | "deadline" | "relevance";
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface PaginatedOpportunities {
  opportunities: (Opportunity & { detail?: OpportunityDetail | null })[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    types: string[];
    locations: string[];
    categories: string[];
  };
}

export class OpportunityRepository {
  async findOpportunitiesWithPagination(
    filters: OpportunityFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedOpportunities> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {
      status: "PUBLISHED",
    };

    if (filters.search) {
      where.OR = [
        {
          title: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (filters.type) {
      where.type = filters.type.toUpperCase();
    }

    if (filters.location) {
      where.location = {
        contains: filters.location,
        mode: "insensitive",
      };
    }

    if (filters.deadline) {
      where.deadline = {
        gte: new Date(filters.deadline),
      };
    }

    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }

    let orderBy: any = { createdAt: "desc" };

    if (filters.sortBy === "deadline") {
      orderBy = { deadline: "asc" };
    } else if (filters.sortBy === "relevance") {
      orderBy = [{ detail: { views: "desc" } }, { createdAt: "desc" }];
    }

    const [opportunities, total, filterData] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          detail: true,
        },
      }),
      prisma.opportunity.count({ where }),
      this.getFilterOptions(),
    ]);

    return {
      opportunities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: filterData,
    };
  }

  async findOpportunityById(
    id: string
  ): Promise<(Opportunity & { detail?: OpportunityDetail | null }) | null> {
    return await prisma.opportunity.findUnique({
      where: {
        id,
        status: "PUBLISHED",
      },
      include: {
        detail: true,
      },
    });
  }

  async findOpportunityWithDetailById(
    id: string
  ): Promise<(Opportunity & { detail: OpportunityDetail | null }) | null> {
    const opportunity = await prisma.opportunity.findUnique({
      where: {
        id,
        status: "PUBLISHED",
      },
      include: {
        detail: true,
      },
    });

    if (opportunity && opportunity.detail) {
      // Increment view count
      await prisma.opportunityDetail.update({
        where: { id: opportunity.detail.id },
        data: { views: { increment: 1 } },
      });
    }

    return opportunity;
  }

  async findFeaturedOpportunities(limit: number = 6): Promise<Opportunity[]> {
    return await prisma.opportunity.findMany({
      where: {
        status: "PUBLISHED",
        deadline: {
          gt: new Date(),
        },
      },
      include: {
        detail: true,
      },
      orderBy: [{ detail: { views: "desc" } }, { createdAt: "desc" }],
      take: limit,
    });
  }

  async findTrendingOpportunities(limit: number = 6): Promise<Opportunity[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return await prisma.opportunity.findMany({
      where: {
        status: "PUBLISHED",
        createdAt: {
          gte: oneWeekAgo,
        },
        deadline: {
          gt: new Date(),
        },
      },
      include: {
        detail: true,
      },
      orderBy: [
        { detail: { views: "desc" } },
        { detail: { applications: "desc" } },
        { createdAt: "desc" },
      ],
      take: limit,
    });
  }

  async findSimilarOpportunities(
    opportunityId: string,
    limit: number = 5
  ): Promise<Opportunity[]> {
    const baseOpportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
    });

    if (!baseOpportunity) {
      return [];
    }

    return await prisma.opportunity.findMany({
      where: {
        id: { not: opportunityId },
        status: "PUBLISHED",
        OR: [
          { type: baseOpportunity.type },
          { category: baseOpportunity.category },
          { location: baseOpportunity.location },
        ],
        deadline: {
          gt: new Date(),
        },
      },
      include: {
        detail: true,
      },
      orderBy: [{ detail: { views: "desc" } }, { createdAt: "desc" }],
      take: limit,
    });
  }

  private async getFilterOptions(): Promise<{
    types: string[];
    locations: string[];
    categories: string[];
  }> {
    const [types, locations, categories] = await Promise.all([
      prisma.opportunity.findMany({
        where: { status: "PUBLISHED" },
        select: { type: true },
        distinct: ["type"],
      }),
      prisma.opportunity.findMany({
        where: { status: "PUBLISHED" },
        select: { location: true },
        distinct: ["location"],
      }),
      prisma.opportunity.findMany({
        where: { status: "PUBLISHED" },
        select: { category: true },
        distinct: ["category"],
      }),
    ]);

    return {
      types: types.map((t) => t.type.toLowerCase()),
      locations: locations.map((l) => l.location),
      categories: categories.map((c) => c.category),
    };
  }

  async incrementApplicationCount(opportunityId: string): Promise<void> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { detail: true },
    });

    if (opportunity?.detail) {
      await prisma.opportunityDetail.update({
        where: { id: opportunity.detail.id },
        data: { applications: { increment: 1 } },
      });
    }
  }

  async incrementSaveCount(opportunityId: string): Promise<void> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId },
      include: { detail: true },
    });

    if (opportunity?.detail) {
      await prisma.opportunityDetail.update({
        where: { id: opportunity.detail.id },
        data: { saves: { increment: 1 } },
      });
    }
  }

  // User interaction methods
  async saveOpportunity(
    userId: string,
    opportunityId: string
  ): Promise<boolean> {
    try {
      await prisma.savedOpportunity.create({
        data: {
          userId,
          opportunityId,
        },
      });

      // Increment save count
      await this.incrementSaveCount(opportunityId);
      return true;
    } catch (error) {
      // If already saved, return false
      return false;
    }
  }

  async unsaveOpportunity(
    userId: string,
    opportunityId: string
  ): Promise<boolean> {
    try {
      await prisma.savedOpportunity.delete({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId,
          },
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async isOpportunitySaved(
    userId: string,
    opportunityId: string
  ): Promise<boolean> {
    const saved = await prisma.savedOpportunity.findUnique({
      where: {
        userId_opportunityId: {
          userId,
          opportunityId,
        },
      },
    });
    return saved !== null;
  }

  async findSavedOpportunities(
    userId: string,
    pagination: { page: number; limit: number }
  ): Promise<{ opportunities: Opportunity[]; total: number }> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [savedOpportunities, total] = await Promise.all([
      prisma.savedOpportunity.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { savedAt: "desc" },
        include: {
          opportunity: {
            include: {
              detail: true,
            },
          },
        },
      }),
      prisma.savedOpportunity.count({ where: { userId } }),
    ]);

    return {
      opportunities: savedOpportunities.map((saved) => saved.opportunity),
      total,
    };
  }

  async applyToOpportunity(
    userId: string,
    opportunityId: string,
    applicationData?: any
  ): Promise<{ applied: boolean; applicationId: string | null }> {
    try {
      const application = await prisma.application.create({
        data: {
          userId,
          opportunityId,
          applicationData,
          status: "PENDING",
        },
      });

      // Increment application count
      await this.incrementApplicationCount(opportunityId);

      return {
        applied: true,
        applicationId: application.id,
      };
    } catch (error) {
      return {
        applied: false,
        applicationId: null,
      };
    }
  }

  async findUserApplications(userId: string): Promise<any[]> {
    return await prisma.application.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
      include: {
        opportunity: {
          include: {
            detail: true,
          },
        },
      },
    });
  }

  async recordOpportunityView(
    userId: string,
    opportunityId: string
  ): Promise<boolean> {
    try {
      // Check if opportunity exists and increment view count
      const opportunity = await this.findOpportunityById(opportunityId);
      if (opportunity && opportunity.detail) {
        await prisma.opportunityDetail.update({
          where: { id: opportunity.detail.id },
          data: { views: { increment: 1 } },
        });
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  // Admin methods
  async findAdminOpportunitiesWithPagination(
    filters: OpportunityFilters & { status?: string },
    pagination: PaginationOptions
  ): Promise<PaginatedOpportunities> {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    if (filters.search) {
      where.OR = [
        {
          title: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: filters.search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: "insensitive",
      };
    }

    const [opportunities, total, filterData] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          detail: true,
          _count: {
            select: {
              applications: true,
              savedOpportunities: true,
            },
          },
        },
      }),
      prisma.opportunity.count({ where }),
      this.getFilterOptions(),
    ]);

    return {
      opportunities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: filterData,
    };
  }

  async getOpportunityStats(): Promise<{
    published: number;
    draft: number;
    archived: number;
  }> {
    const [published, draft, archived] = await Promise.all([
      prisma.opportunity.count({ where: { status: "PUBLISHED" } }),
      prisma.opportunity.count({ where: { status: "DRAFT" } }),
      prisma.opportunity.count({ where: { status: "ARCHIVED" } }),
    ]);

    return { published, draft, archived };
  }

  async createOpportunity(opportunityData: {
    title: string;
    type: string;
    description: string;
    fullDescription: string;
    deadline: Date;
    location: string;
    amount?: string;
    link: string;
    eligibility: string[];
    benefits: string[];
    applicationInstructions: string;
    category: string;
    status: string;
  }): Promise<any> {
    return await prisma.opportunity.create({
      data: {
        title: opportunityData.title,
        type: opportunityData.type.toUpperCase() as any,
        description: opportunityData.description,
        deadline: opportunityData.deadline,
        location: opportunityData.location,
        amount: opportunityData.amount,
        link: opportunityData.link,
        category: opportunityData.category,
        status: opportunityData.status.toUpperCase() as any,
        ...(opportunityData.eligibility && {
          detail: {
            create: {
              fullDescription: opportunityData.fullDescription,
              applicationInstructions: opportunityData.applicationInstructions,
              eligibility: opportunityData.eligibility,
              benefits: opportunityData.benefits,
              views: 0,
              applications: 0,
              saves: 0,
            },
          },
        }),
      },
      include: {
        detail: true,
      },
    });
  }

  async updateOpportunity(id: string, updateData: any): Promise<any> {
    const {
      fullDescription,
      applicationInstructions,
      eligibility,
      benefits,
      ...opportunityData
    } = updateData;

    const updatePromises: Promise<any>[] = [];

    // Update opportunity
    if (Object.keys(opportunityData).length > 0) {
      const processedData = { ...opportunityData };
      if (processedData.type) {
        processedData.type = processedData.type.toUpperCase();
      }
      if (processedData.status) {
        processedData.status = processedData.status.toUpperCase();
      }
      if (processedData.deadline) {
        processedData.deadline = new Date(processedData.deadline);
      }

      updatePromises.push(
        prisma.opportunity.update({
          where: { id },
          data: processedData,
        })
      );
    }

    // Update opportunity detail if detail fields are provided
    if (fullDescription || applicationInstructions || eligibility || benefits) {
      const detailUpdateData: any = {};
      if (fullDescription) detailUpdateData.fullDescription = fullDescription;
      if (applicationInstructions)
        detailUpdateData.applicationInstructions = applicationInstructions;
      if (eligibility) detailUpdateData.eligibility = eligibility;
      if (benefits) detailUpdateData.benefits = benefits;

      updatePromises.push(
        prisma.opportunityDetail.updateMany({
          where: { opportunityId: id },
          data: detailUpdateData,
        })
      );
    }

    await Promise.all(updatePromises);

    return await prisma.opportunity.findUnique({
      where: { id },
      include: { detail: true },
    });
  }

  async deleteOpportunity(id: string): Promise<void> {
    await prisma.opportunity.delete({
      where: { id },
    });
  }

  async bulkUpdateOpportunities(
    ids: string[],
    action: "publish" | "archive" | "delete"
  ): Promise<number> {
    if (action === "delete") {
      const result = await prisma.opportunity.deleteMany({
        where: { id: { in: ids } },
      });
      return result.count;
    }

    const status = action === "publish" ? "PUBLISHED" : "ARCHIVED";
    const result = await prisma.opportunity.updateMany({
      where: { id: { in: ids } },
      data: { status: status as any },
    });

    return result.count;
  }

  async getOpportunityAnalytics(id: string): Promise<any> {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: {
        detail: true,
        _count: {
          select: {
            applications: true,
            savedOpportunities: true,
          },
        },
      },
    });

    if (!opportunity || !opportunity.detail) {
      return null;
    }

    // Calculate CTR (click-through rate) - applications / views
    const ctr =
      opportunity.detail.views > 0
        ? (opportunity.detail.applications / opportunity.detail.views) * 100
        : 0;

    // Mock data for views history (in real app, you'd store this in a separate table)
    const viewsHistory = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toISOString().split("T")[0],
        views: Math.floor(Math.random() * 50) + 10,
      };
    });

    return {
      views: opportunity.detail.views,
      applications: opportunity.detail.applications,
      saves: opportunity.detail.saves,
      ctr: parseFloat(ctr.toFixed(2)),
      avgTimeOnPage: "2m 34s", // Mock data
      viewsHistory,
    };
  }
}
