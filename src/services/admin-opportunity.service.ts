import {
  opportunityRepository,
  OpportunityFilters,
  PaginationOptions,
} from "../repositories/opportunity.repository";
import {
  AdminOpportunity,
  OpportunityStats,
  OpportunityAnalytics,
  Opportunity,
} from "../types";
import { CustomError } from "../middleware/errorHandler";
import { OpportunityEvents } from "../events/opportunity.event";
import { OPPORTUNITY_EVENTS } from "../enums";

export class AdminOpportunityService {
  constructor() {
    // No need to initialize repository - using singleton
  }

  async getAdminOpportunities(
    filters: OpportunityFilters & { status?: string },
    pagination: PaginationOptions
  ): Promise<{
    opportunities: AdminOpportunity[];
    total: number;
    page: number;
    totalPages: number;
    stats: OpportunityStats;
  }> {
    const [result, stats] = await Promise.all([
      opportunityRepository.findAdminOpportunitiesWithPagination(
        filters,
        pagination
      ),
      opportunityRepository.getOpportunityStats(),
    ]);
    return {
      opportunities: result.opportunities.map((opp) =>
        this.formatAdminOpportunity(opp)
      ),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      stats,
    };
  }

  async createOpportunity(opportunityData: {
    title: string;
    type: string;
    description: string;
    fullDescription?: string;
    deadline: string;
    location: string;
    amount?: string;
    link: string;
    eligibility: string[];
    benefits: string[];
    applicationInstructions: string[];
    category: string;
    status: string;
  }): Promise<Opportunity> {
    const processedData = {
      ...opportunityData,
      deadline: new Date(opportunityData.deadline),
    };

    const existingOpportunity =
      await opportunityRepository.findOpportunityByTitleAndDeadline(
        processedData.title,
        processedData.deadline
      );
    if (existingOpportunity) {
      throw new CustomError(
        "An opportunity with the same title and deadline already exists",
        400
      );
    }

    const opportunity = await opportunityRepository.createOpportunity(
      processedData
    );

    OpportunityEvents.emit(
      OPPORTUNITY_EVENTS.IMPROVE_OPPORTUNITY_DATA,
      opportunity.id,
      processedData.fullDescription
    );
    return this.formatOpportunity(opportunity);
  }

  async updateOpportunity(id: string, updateData: any): Promise<Opportunity> {
    // Check if opportunity exists
    const existingOpportunity = await opportunityRepository.findOpportunityById(
      id
    );
    if (!existingOpportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const updatedOpportunity = await opportunityRepository.updateOpportunity(
      id,
      updateData
    );
    return this.formatOpportunity(updatedOpportunity);
  }

  async deleteOpportunity(id: string): Promise<{ message: string }> {
    const opportunity = await opportunityRepository.findOpportunityById(id);
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    await opportunityRepository.deleteOpportunity(id);
    return { message: "Opportunity deleted successfully" };
  }

  async bulkAction(
    ids: string[],
    action: "publish" | "archive" | "delete"
  ): Promise<{ message: string; affected: number }> {
    // If action is publish, validate that all opportunities are reviewed
    if (action === "publish") {
      const opportunities = await opportunityRepository.findOpportunitiesByIds(
        ids
      );
      const nonReviewedOpportunities = opportunities.filter(
        (opp) => opp.status !== "reviewed"
      );

      if (nonReviewedOpportunities.length > 0) {
        const nonReviewedTitles = nonReviewedOpportunities
          .map((opp) => opp.title)
          .join(", ");
        throw new CustomError(
          `Cannot publish opportunities that haven't been reviewed.`,
          400
        );
      }
    }

    const affected = await opportunityRepository.bulkUpdateOpportunities(
      ids,
      action
    );

    const actionMessages = {
      publish: "published",
      archive: "archived",
      delete: "deleted",
    };

    return {
      message: `Successfully ${actionMessages[action]} ${affected} opportunities`,
      affected,
    };
  }

  async getOpportunityAnalytics(id: string): Promise<OpportunityAnalytics> {
    const analytics = await opportunityRepository.getOpportunityAnalytics(id);

    if (!analytics) {
      throw new CustomError("Opportunity not found", 404);
    }

    return analytics;
  }

  private formatOpportunity(opportunity: any): Opportunity {
    return {
      id: opportunity.id,
      title: opportunity.title,
      type: opportunity.type.toLowerCase() as
        | "scholarship"
        | "internship"
        | "fellowship"
        | "grant",
      description: opportunity.description,
      deadline: opportunity.deadline.toISOString(),
      location: opportunity.location,
      amount: opportunity.amount,
      link: opportunity.link,
      category: opportunity.category,
      status: opportunity.status.toLowerCase() as
        | "published"
        | "draft"
        | "archived",
      createdAt: opportunity.createdAt.toISOString(),
      updatedAt: opportunity.updatedAt.toISOString(),
    };
  }

  private formatAdminOpportunity(opportunity: any): AdminOpportunity {
    const baseOpportunity = this.formatOpportunity(opportunity);

    return {
      ...baseOpportunity,
      fullDescription: opportunity.detail?.fullDescription || "",
      applicationInstructions:
        opportunity.detail?.applicationInstructions || [],
      eligibility: opportunity.detail?.eligibility || [],
      benefits: opportunity.detail?.benefits || [],
      views: opportunity.detail?.views || 0,
      applications: opportunity.detail?.applications || 0,
      saves: opportunity.detail?.saves || 0,
      applicationCount: opportunity._count?.applications || 0,
      viewCount: opportunity.detail?.views || 0,
      saveCount: opportunity._count?.savedOpportunities || 0,
    };
  }
}

export const adminOpportunityService = new AdminOpportunityService();
