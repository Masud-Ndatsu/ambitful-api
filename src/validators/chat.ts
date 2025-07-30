import Joi from 'joi';

export const sendMessageSchema = Joi.object({
  message: Joi.string().required().min(1).max(2000),
  conversationId: Joi.string().optional(),
  context: Joi.string().valid('opportunity-search', 'career-advice', 'general').optional()
});

export const conversationIdParamsSchema = Joi.object({
  id: Joi.string().required()
});

export const conversationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20)
});