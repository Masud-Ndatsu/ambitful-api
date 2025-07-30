import { AIDraftsRepository, AIDraftFilters, PaginationOptions } from '../repositories/ai-drafts.repository';
import { OpportunityRepository } from '../repositories/opportunity.repository';
import { ScrapingService } from './scraping.service';
import { AIDraft, Opportunity } from '../types';
import { CustomError } from '../middleware/errorHandler';

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
      const result = await this.draftsRepository.findDraftsWithPagination(filters, pagination);
      
      const formattedDrafts: AIDraft[] = result.drafts.map(draft => ({
        id: draft.id,
        title: draft.title,
        source: draft.source,
        status: draft.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
        priority: draft.priority.toLowerCase() as 'high' | 'medium' | 'low',
        extractedData: draft.extractedData as any,
        createdAt: draft.createdAt.toISOString()
      }));

      return {
        drafts: formattedDrafts,
        total: result.total,
        pending: result.pending,
        page: pagination.page,
        totalPages: Math.ceil(result.total / pagination.limit)
      };
    } catch (error) {
      console.error('Error getting drafts:', error);
      throw new CustomError('Failed to retrieve drafts', 500);
    }
  }

  async reviewDraft(
    draftId: string,
    action: 'approve' | 'reject' | 'edit',
    feedback?: string,
    edits?: any
  ): Promise<{ message: string; opportunity?: Opportunity }> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);
      
      if (!draft) {
        throw new CustomError('Draft not found', 404);
      }

      switch (action) {
        case 'approve':
          return await this.approveDraft(draft, feedback);
        
        case 'reject':
          return await this.rejectDraft(draft, feedback);
        
        case 'edit':
          return await this.editAndApproveDraft(draft, edits, feedback);
        
        default:
          throw new CustomError('Invalid action', 400);
      }
    } catch (error) {
      console.error('Error reviewing draft:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to review draft', 500);
    }
  }

  private async approveDraft(draft: any, feedback?: string): Promise<{ message: string; opportunity: Opportunity }> {
    // Create opportunity from draft data
    const result = await this.draftsRepository.createOpportunityFromDraft(
      draft.id,
      draft.extractedData
    );

    // Format the opportunity response
    const opportunity: Opportunity = {
      id: result.opportunity.id,
      title: result.opportunity.title,
      type: result.opportunity.type.toLowerCase() as 'scholarship' | 'internship' | 'fellowship' | 'grant',
      description: result.opportunity.description,
      deadline: result.opportunity.deadline.toISOString(),
      location: result.opportunity.location,
      amount: result.opportunity.amount || undefined,
      link: result.opportunity.link,
      category: result.opportunity.category,
      status: result.opportunity.status.toLowerCase() as 'published' | 'draft' | 'archived',
      createdAt: result.opportunity.createdAt.toISOString(),
      updatedAt: result.opportunity.updatedAt.toISOString()
    };

    return {
      message: 'Draft approved and opportunity created successfully',
      opportunity
    };
  }

  private async rejectDraft(draft: any, feedback?: string): Promise<{ message: string }> {
    await this.draftsRepository.updateDraftStatus(draft.id, 'rejected', feedback);
    
    return {
      message: 'Draft rejected successfully'
    };
  }

  private async editAndApproveDraft(
    draft: any,
    edits: any,
    feedback?: string
  ): Promise<{ message: string; opportunity: Opportunity }> {
    // Merge edits with original extracted data
    const updatedData = {
      ...draft.extractedData,
      ...edits
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
      type: result.opportunity.type.toLowerCase() as 'scholarship' | 'internship' | 'fellowship' | 'grant',
      description: result.opportunity.description,
      deadline: result.opportunity.deadline.toISOString(),
      location: result.opportunity.location,
      amount: result.opportunity.amount || undefined,
      link: result.opportunity.link,
      category: result.opportunity.category,
      status: result.opportunity.status.toLowerCase() as 'published' | 'draft' | 'archived',
      createdAt: result.opportunity.createdAt.toISOString(),
      updatedAt: result.opportunity.updatedAt.toISOString()
    };

    return {
      message: 'Draft edited and approved successfully',
      opportunity
    };
  }

  async scanOpportunities(
    urls?: string[],
    keywords?: string[]
  ): Promise<{ message: string; draftsFound: number }> {
    try {
      return await this.scrapingService.scanOpportunities(urls, keywords);
    } catch (error) {
      console.error('Error scanning opportunities:', error);
      throw new CustomError('Failed to scan opportunities', 500);
    }
  }

  async getDraftById(draftId: string): Promise<AIDraft> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);
      
      if (!draft) {
        throw new CustomError('Draft not found', 404);
      }

      return {
        id: draft.id,
        title: draft.title,
        source: draft.source,
        status: draft.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
        priority: draft.priority.toLowerCase() as 'high' | 'medium' | 'low',
        extractedData: draft.extractedData as any,
        createdAt: draft.createdAt.toISOString()
      };
    } catch (error) {
      console.error('Error getting draft by ID:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to retrieve draft', 500);
    }
  }

  async deleteDraft(draftId: string): Promise<{ message: string }> {
    try {
      const draft = await this.draftsRepository.findDraftById(draftId);
      
      if (!draft) {
        throw new CustomError('Draft not found', 404);
      }

      await this.draftsRepository.deleteDraft(draftId);
      
      return {
        message: 'Draft deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting draft:', error);
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError('Failed to delete draft', 500);
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
      console.error('Error getting draft stats:', error);
      throw new CustomError('Failed to retrieve draft statistics', 500);
    }
  }

  async bulkReviewDrafts(
    draftIds: string[],
    action: 'approve' | 'reject'
  ): Promise<{ message: string; processed: number }> {
    try {
      if (action === 'approve') {
        // For bulk approval, we need to process each draft individually
        // to create opportunities properly
        let processed = 0;
        for (const draftId of draftIds) {
          try {
            await this.reviewDraft(draftId, 'approve');
            processed++;
          } catch (error) {
            console.error(`Failed to approve draft ${draftId}:`, error);
          }
        }
        
        return {
          message: `Successfully processed ${processed} drafts`,
          processed
        };
      } else {
        // For bulk rejection, we can use the repository method
        const processed = await this.draftsRepository.bulkUpdateDrafts(draftIds, 'rejected');
        
        return {
          message: `Successfully rejected ${processed} drafts`,
          processed
        };
      }
    } catch (error) {
      console.error('Error in bulk review:', error);
      throw new CustomError('Failed to process bulk review', 500);
    }
  }

  async getRecentDrafts(limit: number = 10): Promise<AIDraft[]> {
    try {
      const drafts = await this.draftsRepository.findRecentDrafts(limit);
      
      return drafts.map(draft => ({
        id: draft.id,
        title: draft.title,
        source: draft.source,
        status: draft.status.toLowerCase() as 'pending' | 'approved' | 'rejected',
        priority: draft.priority.toLowerCase() as 'high' | 'medium' | 'low',
        extractedData: draft.extractedData as any,
        createdAt: draft.createdAt.toISOString()
      }));
    } catch (error) {
      console.error('Error getting recent drafts:', error);
      throw new CustomError('Failed to retrieve recent drafts', 500);
    }
  }

  async validateDraftData(extractedData: any): Promise<boolean> {
    // Validate that extracted data has required fields
    const requiredFields = ['title', 'type', 'description', 'location', 'link', 'category'];
    
    for (const field of requiredFields) {
      if (!extractedData[field]) {
        return false;
      }
    }

    // Validate type is one of allowed values
    const allowedTypes = ['scholarship', 'internship', 'fellowship', 'grant'];
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
}