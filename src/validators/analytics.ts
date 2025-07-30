import Joi from 'joi';

export const analyticsOverviewQuerySchema = Joi.object({
  period: Joi.string().valid('7d', '30d', '90d').default('30d')
});

export const analyticsExportQuerySchema = Joi.object({
  type: Joi.string().valid('users', 'opportunities', 'analytics').required(),
  format: Joi.string().valid('csv', 'xlsx').required(),
  period: Joi.string().valid('7d', '30d', '90d').optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional()
});

export const dateRangeQuerySchema = Joi.object({
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  period: Joi.string().valid('7d', '30d', '90d').optional()
});

export const performanceQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('views', 'applications', 'ctr').default('views'),
  order: Joi.string().valid('asc', 'desc').default('desc')
});