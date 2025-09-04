import Joi from "joi";
import { DraftStatus, DraftPriority, OpportunityType } from "../enums";

export const aiDraftsQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(DraftStatus))
    .optional(),
  priority: Joi.string()
    .valid(...Object.values(DraftPriority))
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

export const reviewDraftSchema = Joi.object({
  action: Joi.string().valid("approve", "reject", "edit").required(),
  feedback: Joi.string().optional().empty(""),
  edits: Joi.object({
    title: Joi.string().min(1).max(500).optional(),
    type: Joi.string()
      .valid(...Object.values(OpportunityType))
      .optional(),
    description: Joi.string().min(1).optional(),
    fullDescription: Joi.string().min(1).optional(),
    deadline: Joi.string().isoDate().optional(),
    location: Joi.string().min(1).max(200).optional(),
    amount: Joi.string().optional().empty(null),
    link: Joi.string().uri().optional(),
    eligibility: Joi.array().items(Joi.string().min(1)).optional(),
    benefits: Joi.array().items(Joi.string().min(1)).optional(),
    applicationInstructions: Joi.string().min(1).optional(),
    category: Joi.string().min(1).max(100).optional(),
  }).optional(),
});

export const scanOpportunitiesSchema = Joi.object({
  urls: Joi.array().items(Joi.string().uri()).optional(),
  keywords: Joi.array().items(Joi.string().min(1)).optional(),
});

export const draftIdParamsSchema = Joi.object({
  id: Joi.string().required(),
});
