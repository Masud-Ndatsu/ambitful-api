import Joi from "joi";
import { OpportunityStatus, OpportunityType } from "../enums";

export const adminOpportunitiesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid(...Object.values(OpportunityStatus))
    .optional(),
  category: Joi.string().optional(),
  search: Joi.string().optional(),
});

export const createOpportunitySchema = Joi.object({
  title: Joi.string().required().min(1).max(500),
  type: Joi.string()
    .valid(...Object.values(OpportunityType))
    .required(),
  description: Joi.string().required().min(1),
  fullDescription: Joi.string().required().min(1),
  deadline: Joi.string().isoDate().required(),
  location: Joi.string().required().min(1).max(200),
  amount: Joi.string().optional(),
  link: Joi.string().uri().required(),
  eligibility: Joi.array().items(Joi.string().min(1)).optional(),
  benefits: Joi.array().items(Joi.string().min(1)).optional(),
  applicationInstructions: Joi.string().optional().min(1),
  category: Joi.string().required().min(1).max(100),
  status: Joi.string()
    .valid(...Object.values(OpportunityStatus))
    .default("draft"),
});

export const updateOpportunitySchema = Joi.object({
  title: Joi.string().min(1).max(500).optional(),
  type: Joi.string()
    .valid(...Object.values(OpportunityType))
    .optional(),
  description: Joi.string().min(1).optional(),
  fullDescription: Joi.string().min(1).optional(),
  deadline: Joi.string().isoDate().optional(),
  location: Joi.string().min(1).max(200).optional(),
  amount: Joi.string().optional(),
  link: Joi.string().uri().optional(),
  eligibility: Joi.array().items(Joi.string().min(1)).optional(),
  benefits: Joi.array().items(Joi.string().min(1)).optional(),
  applicationInstructions: Joi.string().min(1).optional(),
  category: Joi.string().min(1).max(100).optional(),
  status: Joi.string()
    .valid(...Object.values(OpportunityStatus))
    .optional(),
});

export const bulkActionSchema = Joi.object({
  ids: Joi.array().items(Joi.string()).min(1).required(),
  action: Joi.string()
    .valid(...Object.values(OpportunityStatus))
    .required(),
});

export const opportunityAnalyticsParamsSchema = Joi.object({
  id: Joi.string().required(),
});
