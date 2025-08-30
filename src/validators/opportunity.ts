import Joi from 'joi';
import { OpportunityType } from '../enums';

export const opportunitiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
  type: Joi.string().valid(...Object.values(OpportunityType)).optional(),
  location: Joi.string().optional(),
  deadline: Joi.string().isoDate().optional(),
  sortBy: Joi.string().valid('newest', 'deadline', 'relevance').default('newest'),
  category: Joi.string().optional()
});

export const opportunityIdParamsSchema = Joi.object({
  id: Joi.string().required()
});

export const applyOpportunitySchema = Joi.object({
  applicationData: Joi.any().optional()
});

export const shareOpportunitySchema = Joi.object({
  platform: Joi.string().valid('whatsapp', 'twitter', 'email', 'link').required()
});

export const savedOpportunitiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});