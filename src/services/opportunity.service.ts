import {
  opportunityRepository,
  OpportunityFilters,
  PaginationOptions,
} from "../repositories/opportunity.repository";
import { Opportunity, OpportunityDetail } from "../types";
import { CustomError } from "../middleware/errorHandler";

export class OpportunityService {
  constructor() {
    // No need to initialize repository - using singleton
  }

  async getOpportunities(
    filters: OpportunityFilters,
    pagination: PaginationOptions
  ): Promise<{
    opportunities: Opportunity[];
    total: number;
    page: number;
    totalPages: number;
    filters: {
      types: string[];
      locations: string[];
      categories: string[];
    };
  }> {
    const result =
      await opportunityRepository.findOpportunitiesWithPagination(
        filters,
        pagination
      );

    return {
      opportunities: result.opportunities.map((opp) =>
        this.formatOpportunity(opp)
      ),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      filters: result.filters,
    };
  }

  async getOpportunityById(id: string): Promise<OpportunityDetail> {
    const opportunity =
      await opportunityRepository.findOpportunityWithDetailById(id);

    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    if (!opportunity.detail) {
      throw new CustomError("Opportunity details not available", 404);
    }

    return this.formatOpportunityDetail(opportunity, opportunity.detail);
  }

  async getFeaturedOpportunities(): Promise<Opportunity[]> {
    const opportunities =
      await opportunityRepository.findFeaturedOpportunities();
    return opportunities.map((opp) => this.formatOpportunity(opp));
  }

  async getTrendingOpportunities(): Promise<Opportunity[]> {
    const opportunities =
      await opportunityRepository.findTrendingOpportunities();
    return opportunities.map((opp) => this.formatOpportunity(opp));
  }

  async getSimilarOpportunities(id: string): Promise<Opportunity[]> {
    const opportunity = await opportunityRepository.findOpportunityById(
      id
    );
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const similarOpportunities =
      await opportunityRepository.findSimilarOpportunities(id);
    return similarOpportunities.map((opp) => this.formatOpportunity(opp));
  }

  async incrementApplicationCount(opportunityId: string): Promise<void> {
    await opportunityRepository.incrementApplicationCount(opportunityId);
  }

  async incrementSaveCount(opportunityId: string): Promise<void> {
    await opportunityRepository.incrementSaveCount(opportunityId);
  }

  // User interaction methods
  async saveOpportunity(
    userId: string,
    opportunityId: string
  ): Promise<{ saved: boolean }> {
    const opportunity = await opportunityRepository.findOpportunityById(
      opportunityId
    );
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const saved = await opportunityRepository.saveOpportunity(
      userId,
      opportunityId
    );
    return { saved };
  }

  async unsaveOpportunity(
    userId: string,
    opportunityId: string
  ): Promise<{ saved: boolean }> {
    const opportunity = await opportunityRepository.findOpportunityById(
      opportunityId
    );
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const unsaved = await opportunityRepository.unsaveOpportunity(
      userId,
      opportunityId
    );
    return { saved: !unsaved };
  }

  async getSavedOpportunities(
    userId: string,
    pagination: { page: number; limit: number }
  ): Promise<{ opportunities: Opportunity[]; total: number }> {
    const result = await opportunityRepository.findSavedOpportunities(
      userId,
      pagination
    );

    return {
      opportunities: result.opportunities.map((opp) =>
        this.formatOpportunity(opp)
      ),
      total: result.total,
    };
  }

  async applyToOpportunity(
    userId: string,
    opportunityId: string,
    applicationData?: any
  ): Promise<{ applied: boolean; applicationId: string }> {
    const opportunity = await opportunityRepository.findOpportunityById(
      opportunityId
    );
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const result = await opportunityRepository.applyToOpportunity(
      userId,
      opportunityId,
      applicationData
    );

    if (!result.applied) {
      throw new CustomError("Already applied to this opportunity", 409);
    }

    return {
      applied: result.applied,
      applicationId: result.applicationId!,
    };
  }

  async getUserApplications(userId: string): Promise<any[]> {
    const applications = await opportunityRepository.findUserApplications(
      userId
    );

    return applications.map((app) => ({
      id: app.id,
      userId: app.userId,
      opportunityId: app.opportunityId,
      status: app.status.toLowerCase(),
      applicationData: app.applicationData,
      submittedAt: app.submittedAt.toISOString(),
      opportunity: this.formatOpportunity(app.opportunity),
    }));
  }

  async shareOpportunity(
    userId: string,
    opportunityId: string,
    platform: "whatsapp" | "twitter" | "email" | "link"
  ): Promise<{ shareUrl: string }> {
    const opportunity = await opportunityRepository.findOpportunityById(
      opportunityId
    );
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const baseUrl = process.env.FRONTEND_URL || "http://localhost:8080";
    const opportunityUrl = `${baseUrl}/opportunities?opportunity=${opportunityId}`;

    let shareUrl: string;

    switch (platform) {
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(
          `Check out this opportunity: ${opportunity.title} - ${opportunityUrl}`
        )}`;
        break;
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          `Check out this opportunity: ${opportunity.title}`
        )}&url=${encodeURIComponent(opportunityUrl)}`;
        break;
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(
          `Opportunity: ${opportunity.title}`
        )}&body=${encodeURIComponent(
          `I found this opportunity that might interest you: ${opportunityUrl}`
        )}`;
        break;
      case "link":
        shareUrl = opportunityUrl;
        break;
      default:
        shareUrl = opportunityUrl;
    }

    return { shareUrl };
  }

  async recordOpportunityView(
    userId: string,
    opportunityId: string
  ): Promise<{ viewed: boolean }> {
    const opportunity = await opportunityRepository.findOpportunityById(
      opportunityId
    );
    if (!opportunity) {
      throw new CustomError("Opportunity not found", 404);
    }

    const viewed = await opportunityRepository.recordOpportunityView(
      userId,
      opportunityId
    );
    return { viewed };
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

  private formatOpportunityDetail(
    opportunity: any,
    detail: any
  ): OpportunityDetail {
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
      fullDescription: detail.fullDescription,
      applicationInstructions: detail.applicationInstructions,
      eligibility: detail.eligibility,
      benefits: detail.benefits,
      views: detail.views,
      applications: detail.applications,
      saves: detail.saves,
    };
  }
}

export const opportunityService = new OpportunityService();
