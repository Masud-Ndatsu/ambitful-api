import TypedEventEmitter from ".";
import { OPPORTUNITY_EVENTS } from "../enums/";
import { GeminiService } from "../services/gemini.service";
import { OpportunityRepository } from "../repositories/opportunity.repository";
import { CustomError } from "../middleware/errorHandler";

type OpportunityEventsTypes = {
  [OPPORTUNITY_EVENTS.IMPROVE_OPPORTUNITY_DATA]: [
    opportunityId: string,
    fullDescription: string
  ];
};

export const OpportunityEvents =
  new TypedEventEmitter<OpportunityEventsTypes>();

const geminiService = new GeminiService();
const opportunityRepository = new OpportunityRepository();

OpportunityEvents.on(
  OPPORTUNITY_EVENTS.IMPROVE_OPPORTUNITY_DATA,
  async (opportunityId: string, fullDescription: string) => {
    try {
      console.log(
        `Processing opportunity improvement for ID: ${opportunityId}`
      );

      if (!fullDescription || fullDescription.trim().length === 0) {
        console.error(
          `Invalid fullDescription provided for opportunity ID: ${opportunityId}`
        );
        throw new CustomError(
          "Full description is required for opportunity improvement",
          400
        );
      }

      // Generate improved opportunity data using Gemini with only fullDescription
      const improvedData = await geminiService.generateImprovedOpportunityData(
        fullDescription
      );

      // Save the improved data to the database
      await opportunityRepository.updateOpportunity(opportunityId, {
        description: improvedData.description.substring(0, 200),
        fullDescription: improvedData.description,
        benefits: improvedData.benefits,
        eligibility: improvedData.eligibility,
        applicationInstructions: improvedData.howToApply,
      });

      console.log(
        `Successfully improved and saved opportunity data for ID: ${opportunityId}`
      );
      console.log("Improved data:", {
        opportunityId,
        description: improvedData.description,
        benefitsCount: improvedData.benefits.length,
        eligibilityCount: improvedData.eligibility.length,
        howToApplySteps: improvedData.howToApply.length,
      });

      return improvedData;
    } catch (error) {
      console.error(
        `Error improving opportunity data for ID ${opportunityId}:`,
        error
      );
      throw error;
    }
  }
);
