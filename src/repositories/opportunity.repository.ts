import { prisma } from "../database/prisma";
import { Opportunity, OpportunityDetail } from "@prisma/client";
import { OpportunityStatus } from "../enums";
import { ParsedOpportunity } from "../types";

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
  async filterDuplicateOpportunities(
    opportunities: ParsedOpportunity[]
  ): Promise<ParsedOpportunity[]> {
    try {
      if (!opportunities || opportunities.length === 0) {
        return [];
      }

      const uniqueOpportunities: ParsedOpportunity[] = [];

      for (const opportunity of opportunities) {
        // Check if opportunity with similar title and description already exists in database
        const existingOpportunity = await prisma.opportunity.findFirst({
          where: {
            OR: [
              {
                AND: [
                  {
                    title: {
                      contains: opportunity.title,
                      mode: "insensitive",
                    },
                  },
                  {
                    description: {
                      contains: opportunity.description.substring(0, 100),
                      mode: "insensitive",
                    },
                  },
                ],
              },
              {
                AND: [
                  {
                    title: {
                      mode: "insensitive",
                      equals: opportunity.title,
                    },
                  },
                ],
              },
            ],
          },
        });

        // Also check against other opportunities in the current batch
        const duplicateInBatch = uniqueOpportunities.find(
          (existing) =>
            existing.title.toLowerCase() === opportunity.title.toLowerCase() ||
            (existing.title
              .toLowerCase()
              .includes(opportunity.title.toLowerCase()) &&
              existing.description
                .toLowerCase()
                .includes(
                  opportunity.description.substring(0, 100).toLowerCase()
                ))
        );

        // Only add if no duplicate found in database or current batch
        if (!existingOpportunity && !duplicateInBatch) {
          uniqueOpportunities.push(opportunity);
        }
      }

      console.log(
        `Filtered ${
          opportunities.length - uniqueOpportunities.length
        } duplicate opportunities`
      );
      return uniqueOpportunities;
    } catch (error) {
      console.error("Error filtering duplicate opportunities:", error);
      // Return original opportunities if filtering fails
      return opportunities;
    }
  }
  async findOpportunitiesWithPagination(
    filters: OpportunityFilters,
    pagination: PaginationOptions
  ): Promise<PaginatedOpportunities> {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {
        status: OpportunityStatus.PUBLISHED,
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
        where.type = filters.type.toLowerCase();
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

      console.log({ opportunities });

      return {
        opportunities,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        filters: filterData,
      };
    } catch (error) {
      console.error("Error in findOpportunitiesWithPagination:", error);
      throw error;
    }
  }

  async findOpportunityById(
    id: string
  ): Promise<(Opportunity & { detail?: OpportunityDetail | null }) | null> {
    try {
      return await prisma.opportunity.findUnique({
        where: {
          id,
          status: OpportunityStatus.PUBLISHED,
        },
        include: {
          detail: true,
        },
      });
    } catch (error) {
      console.error("Error in findOpportunityById:", error);
      throw error;
    }
  }

  async findOpportunityWithDetailById(
    id: string
  ): Promise<(Opportunity & { detail: OpportunityDetail | null }) | null> {
    try {
      const opportunity = await prisma.opportunity.findUnique({
        where: {
          id,
          status: OpportunityStatus.PUBLISHED,
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
    } catch (error) {
      console.error("Error in findOpportunityWithDetailById:", error);
      throw error;
    }
  }

  async findFeaturedOpportunities(limit: number = 6): Promise<Opportunity[]> {
    try {
      return await prisma.opportunity.findMany({
        where: {
          status: OpportunityStatus.PUBLISHED,
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
    } catch (error) {
      console.error("Error in findFeaturedOpportunities:", error);
      throw error;
    }
  }

  async findTrendingOpportunities(limit: number = 6): Promise<Opportunity[]> {
    try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      return await prisma.opportunity.findMany({
        where: {
          status: OpportunityStatus.PUBLISHED,
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
    } catch (error) {
      console.error("Error in findTrendingOpportunities:", error);
      throw error;
    }
  }

  async findSimilarOpportunities(
    opportunityId: string,
    limit: number = 5
  ): Promise<Opportunity[]> {
    try {
      const baseOpportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
      });

      if (!baseOpportunity) {
        return [];
      }

      return await prisma.opportunity.findMany({
        where: {
          id: { not: opportunityId },
          status: OpportunityStatus.PUBLISHED,
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
    } catch (error) {
      console.error("Error in findSimilarOpportunities:", error);
      throw error;
    }
  }

  async getFilterOptions(): Promise<{
    types: string[];
    locations: string[];
    categories: string[];
  }> {
    try {
      const [types, locations, categories] = await Promise.all([
        prisma.opportunity.findMany({
          where: { status: OpportunityStatus.PUBLISHED },
          select: { type: true },
          distinct: ["type"],
        }),
        prisma.opportunity.findMany({
          where: { status: OpportunityStatus.PUBLISHED },
          select: { location: true },
          distinct: ["location"],
        }),
        prisma.opportunity.findMany({
          where: { status: OpportunityStatus.PUBLISHED },
          select: { category: true },
          distinct: ["category"],
        }),
      ]);

      return {
        types: types.map((t) => t.type.toLowerCase()),
        locations: locations.map((l) => l.location),
        categories: categories.map((c) => c.category),
      };
    } catch (error) {
      console.error("Error in getFilterOptions:", error);
      throw error;
    }
  }

  async incrementApplicationCount(opportunityId: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error("Error in incrementApplicationCount:", error);
      throw error;
    }
  }

  async incrementSaveCount(opportunityId: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error("Error in incrementSaveCount:", error);
      throw error;
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
      console.error("Error in unsaveOpportunity:", error);
      return false;
    }
  }

  async isOpportunitySaved(
    userId: string,
    opportunityId: string
  ): Promise<boolean> {
    try {
      const saved = await prisma.savedOpportunity.findUnique({
        where: {
          userId_opportunityId: {
            userId,
            opportunityId,
          },
        },
      });
      return saved !== null;
    } catch (error) {
      console.error("Error in isOpportunitySaved:", error);
      throw error;
    }
  }

  async findSavedOpportunities(
    userId: string,
    pagination: { page: number; limit: number }
  ): Promise<{ opportunities: Opportunity[]; total: number }> {
    try {
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
    } catch (error) {
      console.error("Error in findSavedOpportunities:", error);
      throw error;
    }
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
          status: "pending",
        },
      });

      // Increment application count
      await this.incrementApplicationCount(opportunityId);

      return {
        applied: true,
        applicationId: application.id,
      };
    } catch (error) {
      console.error("Error in applyToOpportunity:", error);
      return {
        applied: false,
        applicationId: null,
      };
    }
  }

  async findUserApplications(userId: string): Promise<any[]> {
    try {
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
    } catch (error) {
      console.error("Error in findUserApplications:", error);
      throw error;
    }
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
      console.error("Error in recordOpportunityView:", error);
      return false;
    }
  }

  // Admin methods
  async findAdminOpportunitiesWithPagination(
    filters: OpportunityFilters & { status?: string },
    pagination: PaginationOptions
  ): Promise<PaginatedOpportunities> {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (filters.status) {
        where.status = filters.status.toLowerCase();
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
    } catch (error) {
      console.error("Error in findAdminOpportunitiesWithPagination:", error);
      throw error;
    }
  }

  async getOpportunityStats(): Promise<{
    published: number;
    draft: number;
    reviewed: number;
    archived: number;
  }> {
    try {
      const [published, draft, reviewed, archived] = await Promise.all([
        prisma.opportunity.count({
          where: { status: OpportunityStatus.PUBLISHED },
        }),
        prisma.opportunity.count({
          where: { status: OpportunityStatus.DRAFT },
        }),
        prisma.opportunity.count({
          where: { status: OpportunityStatus.REVIEWED },
        }),
        prisma.opportunity.count({
          where: { status: OpportunityStatus.ARCHIVED },
        }),
      ]);

      return { published, draft, reviewed, archived };
    } catch (error) {
      console.error("Error in getOpportunityStats:", error);
      throw error;
    }
  }

  async createOpportunity(opportunityData: {
    title: string;
    type: string;
    description: string;
    fullDescription?: string;
    deadline: Date;
    location: string;
    amount?: string;
    link: string;
    eligibility?: string[];
    benefits?: string[];
    applicationInstructions?: string[];
    category: string;
    status: string;
  }): Promise<any> {
    try {
      return await prisma.opportunity.create({
        data: {
          title: opportunityData.title,
          type: opportunityData.type.toLowerCase(),
          description: opportunityData.description,
          deadline: opportunityData.deadline,
          location: opportunityData.location,
          amount: opportunityData.amount,
          link: opportunityData.link,
          category: opportunityData.category,
          status: opportunityData.status.toLowerCase(),
          detail: {
            create: {
              fullDescription: opportunityData.fullDescription || "",
              applicationInstructions:
                opportunityData.applicationInstructions || [],
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
    } catch (error) {
      console.error("Error in createOpportunity:", error);
      throw error;
    }
  }

  async bulkCreateOpportunities(
    opportunitiesData: ParsedOpportunity[]
  ): Promise<{
    created: number;
    failed: number;
    errors: string[];
  }> {
    try {
      if (!opportunitiesData || opportunitiesData.length === 0) {
        return { created: 0, failed: 0, errors: [] };
      }

      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process opportunities in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < opportunitiesData.length; i += batchSize) {
        const batch = opportunitiesData.slice(i, i + batchSize);

        const createPromises = batch.map(async (opportunity) => {
          try {
            // Validate required fields
            if (
              !opportunity.title ||
              !opportunity.description ||
              !opportunity.type
            ) {
              throw new Error(
                `Missing required fields for opportunity: ${
                  opportunity.title || "Unknown"
                }`
              );
            }

            // Parse deadline if it's a string
            let deadline: Date;
            if (typeof opportunity.deadline === "string") {
              deadline = new Date(opportunity.deadline);
              if (isNaN(deadline.getTime())) {
                // If deadline is invalid, set it to 30 days from now
                deadline = new Date();
                deadline.setDate(deadline.getDate() + 30);
              }
            } else {
              deadline = new Date();
              deadline.setDate(deadline.getDate() + 30);
            }

            const createdOpportunity = await prisma.opportunity.create({
              data: {
                title: opportunity.title.trim(),
                type: opportunity.type.toLowerCase(),
                description: opportunity.description.trim(),
                deadline: deadline,
                location: opportunity.location || "Remote",
                amount: opportunity.amount || null,
                link: opportunity.link || "",
                category: opportunity.category || "General",
                status: OpportunityStatus.DRAFT,
                detail: {
                  create: {
                    fullDescription: opportunity.description,
                    applicationInstructions: [],
                    eligibility: [],
                    benefits: [],
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

            created++;
            return createdOpportunity;
          } catch (error) {
            failed++;
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            errors.push(
              `Failed to create opportunity "${opportunity.title}": ${errorMessage}`
            );
            console.error(
              `Error creating opportunity ${opportunity.title}:`,
              error
            );
            return null;
          }
        });

        // Wait for batch to complete
        await Promise.all(createPromises);
      }

      console.log(
        `Bulk create completed: ${created} created, ${failed} failed`
      );

      return {
        created,
        failed,
        errors,
      };
    } catch (error) {
      console.error("Error in bulkCreateOpportunities:", error);
      throw error;
    }
  }

  async updateOpportunity(id: string, updateData: any): Promise<any> {
    try {
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
          processedData.type = processedData.type.toLowerCase();
        }
        if (processedData.status) {
          processedData.status = processedData.status.toLowerCase();
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
      if (
        fullDescription ||
        applicationInstructions ||
        eligibility ||
        benefits
      ) {
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

      const result = await Promise.all(updatePromises);

      console.log({ result });

      return await prisma.opportunity.findUnique({
        where: { id },
        include: { detail: true },
      });
    } catch (error) {
      console.error("Error in updateOpportunity:", error);
      throw error;
    }
  }

  async deleteOpportunity(id: string): Promise<void> {
    try {
      await prisma.opportunity.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Error in deleteOpportunity:", error);
      throw error;
    }
  }

  async bulkUpdateOpportunities(
    ids: string[],
    action: "publish" | "archive" | "delete"
  ): Promise<number> {
    try {
      if (action === "delete") {
        const result = await prisma.opportunity.deleteMany({
          where: { id: { in: ids } },
        });
        return result.count;
      }

      // If action is publish and is aisGenerated is true, check reviewed status
      if (action === "publish") {
        const opportunities = await prisma.opportunity.findMany({
          where: { id: { in: ids } },
        });
        const notReviewed = opportunities.filter(
          (op) => op.isGenerated && op.status !== OpportunityStatus.REVIEWED
        );
        if (notReviewed.length > 0) {
          throw new Error(
            `Cannot publish opportunities that are not reviewed: ${notReviewed
              .map((op) => op.title)
              .join(", ")}`
          );
        }
      }

      const status =
        action === "publish"
          ? OpportunityStatus.PUBLISHED
          : OpportunityStatus.ARCHIVED;
      const result = await prisma.opportunity.updateMany({
        where: { id: { in: ids } },
        data: { status: status as any },
      });

      return result.count;
    } catch (error) {
      console.error("Error in bulkUpdateOpportunities:", error);
      throw error;
    }
  }

  async getOpportunityAnalytics(id: string): Promise<any> {
    try {
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
    } catch (error) {
      console.error("Error in getOpportunityAnalytics:", error);
      throw error;
    }
  }
}
