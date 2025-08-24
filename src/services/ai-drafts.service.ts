import {
  AIDraftsRepository,
  AIDraftFilters,
  PaginationOptions,
} from "../repositories/ai-drafts.repository";
import { OpportunityRepository } from "../repositories/opportunity.repository";
import { ScrapingService } from "./scraping.service";
import { AIDraft, Opportunity } from "../types";
import { CustomError } from "../middleware/errorHandler";

export class AIDraftsService {
  private draftsRepository: AIDraftsRepository;
  private opportunityRepository: OpportunityRepository;
  private scrapingService: ScrapingService;

  constructor() {
    this.draftsRepository = new AIDraftsRepository();
    this.opportunityRepository = new OpportunityRepository();
    this.scrapingService = new ScrapingService();
  }

  async getDrafts(
    filters: AIDraftFilters,
    pagination: PaginationOptions
  ): Promise<{
    drafts: AIDraft[];
    total: number;
    pending: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const result = await this.draftsRepository.findDraftsWithPagination(
        filters,
        pagination
      );

      const formattedDrafts: AIDraft[] = result.drafts.map((draft) => {
        return {
          id: draft.id,
          title: draft.title,
          source: draft.source,
          status: draft.status.toLowerCase() as
            | "pending"
            | "approved"
            | "rejected",
          priority: draft.priority.toLowerCase() as "high" | "medium" | "low",
          dateScraped: draft.dateScraped,
          rawContent: draft.rawContent,

          // Extracted opportunity fields (from individual columns)
          extractedTitle: draft.extractedTitle || draft.title,
          extractedType:
            (draft.extractedType?.toLowerCase() as
              | "scholarship"
              | "internship"
              | "fellowship"
              | "grant") || "scholarship",
          extractedDescription: draft.extractedDescription || "",
          extractedDeadline: draft.extractedDeadline || null,
          extractedLocation: draft.extractedLocation || null,
          extractedAmount: draft.extractedAmount || null,
          extractedLink: draft.extractedLink || null,
          extractedCategory: draft.extractedCategory || null,

          // Extracted detail fields (from individual columns)
          extractedFullDescription: draft.extractedFullDescription || null,
          extractedApplicationInstructions:
            draft.extractedApplicationInstructions || [],
          extractedEligibility: draft.extractedEligibility || [],
          extractedBenefits: draft.extractedBenefits || [],

          // Additional extracted data
          extractedData: draft.extractedData,

          // Review fields
          feedback: draft.feedback || null,
          reviewedAt: draft.reviewedAt || null,
          reviewedBy: draft.reviewedBy || null,
          opportunityId: draft.opportunityId || null,

          // Timestamps
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        };
      });

      return {
        drafts: formattedDrafts,
        total: result.total,
        pending: result.pending,
        page: pagination.page,
        totalPages: Math.ceil(result.total / pagination.limit),
      };
    } catch (error) {
      console.error("Error getting drafts:", error);
      throw new CustomError("Failed to retrieve drafts", 500);
    }
  }

  async reviewDraft(
    draftId: string,
    action: "approve" | "reject" | "edit",
    feedback?: string,
    edits?: any
  ): Promise<{ message: string; opportunity?: Opportunity }> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);

      if (!draft) {
        throw new CustomError("Draft not found", 404);
      }

      switch (action) {
        case "approve":
          return await this.approveDraft(draft, feedback);

        case "reject":
          return await this.rejectDraft(draft, feedback);

        case "edit":
          return await this.editAndApproveDraft(draft, edits, feedback);

        default:
          throw new CustomError("Invalid action", 400);
      }
    } catch (error) {
      console.error("Error reviewing draft:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to review draft", 500);
    }
  }

  private async approveDraft(
    draft: any,
    feedback?: string
  ): Promise<{ message: string; opportunity: Opportunity }> {
    // Create opportunity from draft data using individual extracted fields
    const opportunityData = {
      title: draft.extractedTitle || draft.title,
      type: draft.extractedType,
      description: draft.extractedDescription,
      deadline: draft.extractedDeadline,
      location: draft.extractedLocation,
      amount: draft.extractedAmount,
      link: draft.extractedLink,
      category: draft.extractedCategory,
      fullDescription: draft.extractedFullDescription,
      applicationInstructions: draft.extractedApplicationInstructions,
      eligibility: draft.extractedEligibility,
      benefits: draft.extractedBenefits,
    };

    const result = await this.draftsRepository.createOpportunityFromDraft(
      draft.id,
      opportunityData
    );

    // Format the opportunity response
    const opportunity: Opportunity = {
      id: result.opportunity.id,
      title: result.opportunity.title,
      type: result.opportunity.type.toLowerCase() as
        | "scholarship"
        | "internship"
        | "fellowship"
        | "grant",
      description: result.opportunity.description,
      deadline: result.opportunity.deadline.toISOString(),
      location: result.opportunity.location,
      amount: result.opportunity.amount || undefined,
      link: result.opportunity.link,
      category: result.opportunity.category,
      status: result.opportunity.status.toLowerCase() as
        | "published"
        | "draft"
        | "archived",
      createdAt: result.opportunity.createdAt.toISOString(),
      updatedAt: result.opportunity.updatedAt.toISOString(),
    };

    return {
      message: "Draft approved and opportunity created successfully",
      opportunity,
    };
  }

  private async rejectDraft(
    draft: any,
    feedback?: string
  ): Promise<{ message: string }> {
    await this.draftsRepository.updateDraftStatus(
      draft.id,
      "rejected",
      feedback
    );

    return {
      message: "Draft rejected successfully",
    };
  }

  private async editAndApproveDraft(
    draft: any,
    edits: any,
    feedback?: string
  ): Promise<{ message: string; opportunity: Opportunity }> {
    // Merge edits with original extracted data from individual columns
    const updatedData = {
      title: draft.extractedTitle || draft.title,
      type: draft.extractedType,
      description: draft.extractedDescription,
      deadline: draft.extractedDeadline,
      location: draft.extractedLocation,
      amount: draft.extractedAmount,
      link: draft.extractedLink,
      category: draft.extractedCategory,
      fullDescription: draft.extractedFullDescription,
      applicationInstructions: draft.extractedApplicationInstructions,
      eligibility: draft.extractedEligibility,
      benefits: draft.extractedBenefits,
      ...edits,
    };

    // Update the draft with edited data
    await this.draftsRepository.updateDraftData(draft.id, updatedData);

    // Create opportunity with edited data
    const result = await this.draftsRepository.createOpportunityFromDraft(
      draft.id,
      updatedData
    );

    // Format the opportunity response
    const opportunity: Opportunity = {
      id: result.opportunity.id,
      title: result.opportunity.title,
      type: result.opportunity.type.toLowerCase() as
        | "scholarship"
        | "internship"
        | "fellowship"
        | "grant",
      description: result.opportunity.description,
      deadline: result.opportunity.deadline.toISOString(),
      location: result.opportunity.location,
      amount: result.opportunity.amount || undefined,
      link: result.opportunity.link,
      category: result.opportunity.category,
      status: result.opportunity.status.toLowerCase() as
        | "published"
        | "draft"
        | "archived",
      createdAt: result.opportunity.createdAt.toISOString(),
      updatedAt: result.opportunity.updatedAt.toISOString(),
    };

    return {
      message: "Draft edited and approved successfully",
      opportunity,
    };
  }

  async getDraftById(draftId: string): Promise<AIDraft> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);

      if (!draft) {
        throw new CustomError("Draft not found", 404);
      }

      return {
        id: draft.id,
        title: draft.title,
        source: draft.source,
        status: draft.status.toLowerCase() as
          | "pending"
          | "approved"
          | "rejected",
        priority: draft.priority.toLowerCase() as "high" | "medium" | "low",
        dateScraped: draft.dateScraped,
        rawContent: draft.rawContent,

        // Extracted opportunity fields (from individual columns)
        extractedTitle: draft.extractedTitle || draft.title,
        extractedType:
          (draft.extractedType?.toLowerCase() as
            | "scholarship"
            | "internship"
            | "fellowship"
            | "grant") || "scholarship",
        extractedDescription: draft.extractedDescription || "",
        extractedDeadline: draft.extractedDeadline || null,
        extractedLocation: draft.extractedLocation || null,
        extractedAmount: draft.extractedAmount || null,
        extractedLink: draft.extractedLink || null,
        extractedCategory: draft.extractedCategory || null,

        // Extracted detail fields (from individual columns)
        extractedFullDescription: draft.extractedFullDescription || null,
        extractedApplicationInstructions:
          draft.extractedApplicationInstructions || [],
        extractedEligibility: draft.extractedEligibility || [],
        extractedBenefits: draft.extractedBenefits || [],

        // Additional extracted data
        extractedData: draft.extractedData,

        // Review fields
        feedback: draft.feedback || null,
        reviewedAt: draft.reviewedAt || null,
        reviewedBy: draft.reviewedBy || null,
        opportunityId: draft.opportunityId || null,

        // Timestamps
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      };
    } catch (error) {
      console.error("Error getting draft by ID:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to retrieve draft", 500);
    }
  }

  async deleteDraft(draftId: string): Promise<{ message: string }> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);

      if (!draft) {
        throw new CustomError("Draft not found", 404);
      }

      await this.draftsRepository.deleteDraft(draftId);

      return {
        message: "Draft deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting draft:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to delete draft", 500);
    }
  }

  async getDraftStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    byPriority: { high: number; medium: number; low: number };
  }> {
    try {
      return await this.draftsRepository.getDraftStats();
    } catch (error) {
      console.error("Error getting draft stats:", error);
      throw new CustomError("Failed to retrieve draft statistics", 500);
    }
  }

  async bulkReviewDrafts(
    draftIds: string[],
    action: "approve" | "reject"
  ): Promise<{ message: string; processed: number }> {
    try {
      if (action === "approve") {
        // For bulk approval, we need to process each draft individually
        // to create opportunities properly
        let processed = 0;
        for (const draftId of draftIds) {
          try {
            await this.reviewDraft(draftId, "approve");
            processed++;
          } catch (error) {
            console.error(`Failed to approve draft ${draftId}:`, error);
          }
        }

        return {
          message: `Successfully processed ${processed} drafts`,
          processed,
        };
      } else {
        // For bulk rejection, we can use the repository method
        const processed = await this.draftsRepository.bulkUpdateDrafts(
          draftIds,
          "rejected"
        );

        return {
          message: `Successfully rejected ${processed} drafts`,
          processed,
        };
      }
    } catch (error) {
      console.error("Error in bulk review:", error);
      throw new CustomError("Failed to process bulk review", 500);
    }
  }

  async getRecentDrafts(limit: number = 10): Promise<AIDraft[]> {
    try {
      const drafts = await this.draftsRepository.findRecentDrafts(limit);

      return drafts.map((draft) => {
        return {
          id: draft.id,
          title: draft.title,
          source: draft.source,
          status: draft.status.toLowerCase() as
            | "pending"
            | "approved"
            | "rejected",
          priority: draft.priority.toLowerCase() as "high" | "medium" | "low",
          dateScraped: draft.dateScraped,
          rawContent: draft.rawContent,

          // Extracted opportunity fields (from individual columns)
          extractedTitle: draft.extractedTitle || draft.title,
          extractedType:
            (draft.extractedType?.toLowerCase() as
              | "scholarship"
              | "internship"
              | "fellowship"
              | "grant") || "scholarship",
          extractedDescription: draft.extractedDescription || "",
          extractedDeadline: draft.extractedDeadline || null,
          extractedLocation: draft.extractedLocation || null,
          extractedAmount: draft.extractedAmount || null,
          extractedLink: draft.extractedLink || null,
          extractedCategory: draft.extractedCategory || null,

          // Extracted detail fields (from individual columns)
          extractedFullDescription: draft.extractedFullDescription || null,
          extractedApplicationInstructions:
            draft.extractedApplicationInstructions || [],
          extractedEligibility: draft.extractedEligibility || [],
          extractedBenefits: draft.extractedBenefits || [],

          // Additional extracted data
          extractedData: draft.extractedData,

          // Review fields
          feedback: draft.feedback || null,
          reviewedAt: draft.reviewedAt || null,
          reviewedBy: draft.reviewedBy || null,
          opportunityId: draft.opportunityId || null,

          // Timestamps
          createdAt: draft.createdAt,
          updatedAt: draft.updatedAt,
        };
      });
    } catch (error) {
      console.error("Error getting recent drafts:", error);
      throw new CustomError("Failed to retrieve recent drafts", 500);
    }
  }

  async validateDraftData(extractedData: any): Promise<boolean> {
    // Validate that extracted data has required fields
    const requiredFields = [
      "title",
      "type",
      "description",
      "location",
      "link",
      "category",
    ];

    for (const field of requiredFields) {
      if (!extractedData[field]) {
        return false;
      }
    }

    // Validate type is one of allowed values
    const allowedTypes = ["scholarship", "internship", "fellowship", "grant"];
    if (!allowedTypes.includes(extractedData.type?.toLowerCase())) {
      return false;
    }

    // Validate deadline format if provided
    if (extractedData.deadline) {
      const deadlineDate = new Date(extractedData.deadline);
      if (isNaN(deadlineDate.getTime())) {
        return false;
      }
    }

    return true;
  }

  async regenerateDraft(
    draftId: string
  ): Promise<{ message: string; draft: AIDraft }> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);

      if (!draft) {
        throw new CustomError("Draft not found", 404);
      }

      // Re-process the raw content with AI
      const reprocessedData =
        await this.scrapingService.parseContentForOpportunities(
          draft.rawContent
        );

      if (!reprocessedData || reprocessedData.length === 0) {
        throw new CustomError("Failed to re-extract data from content", 400);
      }

      // Use the first extracted opportunity
      const extractedData = reprocessedData[0];

      // Update the draft with new extracted data
      const updatedDraft = await this.draftsRepository.updateDraftData(
        draftId,
        extractedData
      );

      // Format response
      const formattedDraft: AIDraft = {
        id: updatedDraft.id,
        title: updatedDraft.title,
        source: updatedDraft.source,
        status: updatedDraft.status.toLowerCase() as
          | "pending"
          | "approved"
          | "rejected",
        priority: updatedDraft.priority.toLowerCase() as
          | "high"
          | "medium"
          | "low",
        dateScraped: updatedDraft.dateScraped,
        rawContent: updatedDraft.rawContent,
        extractedTitle: updatedDraft.extractedTitle,
        extractedType:
          (updatedDraft.extractedType?.toLowerCase() as
            | "scholarship"
            | "internship"
            | "fellowship"
            | "grant") || null,
        extractedDescription: updatedDraft.extractedDescription,
        extractedDeadline: updatedDraft.extractedDeadline,
        extractedLocation: updatedDraft.extractedLocation,
        extractedAmount: updatedDraft.extractedAmount,
        extractedLink: updatedDraft.extractedLink,
        extractedCategory: updatedDraft.extractedCategory,
        extractedFullDescription: updatedDraft.extractedFullDescription,
        extractedApplicationInstructions:
          updatedDraft.extractedApplicationInstructions || [],
        extractedEligibility: updatedDraft.extractedEligibility || [],
        extractedBenefits: updatedDraft.extractedBenefits || [],
        extractedData: updatedDraft.extractedData as any,
        feedback: updatedDraft.feedback,
        reviewedAt: updatedDraft.reviewedAt,
        reviewedBy: updatedDraft.reviewedBy,
        opportunityId: updatedDraft.opportunityId,
        createdAt: updatedDraft.createdAt,
        updatedAt: updatedDraft.updatedAt,
      };

      return {
        message: "Draft regenerated successfully",
        draft: formattedDraft,
      };
    } catch (error) {
      console.error("Error regenerating draft:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to regenerate draft", 500);
    }
  }

  async updateDraftPriority(
    draftId: string,
    priority: "high" | "medium" | "low"
  ): Promise<{ message: string }> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);

      if (!draft) {
        throw new CustomError("Draft not found", 404);
      }

      await this.draftsRepository.updateDraftPriority(
        draftId,
        priority.toUpperCase()
      );

      return {
        message: "Draft priority updated successfully",
      };
    } catch (error) {
      console.error("Error updating draft priority:", error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError("Failed to update draft priority", 500);
    }
  }

  async bulkDeleteDrafts(
    draftIds: string[]
  ): Promise<{ message: string; deleted: number }> {
    try {
      const deleted = await this.draftsRepository.bulkDeleteDrafts(draftIds);

      return {
        message: `Successfully deleted ${deleted} drafts`,
        deleted,
      };
    } catch (error) {
      console.error("Error in bulk delete:", error);
      throw new CustomError("Failed to delete drafts", 500);
    }
  }
}
