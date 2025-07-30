import Joi from 'joi';

export const createTestimonialSchema = Joi.object({
  name: Joi.string().required().min(1).max(100),
  age: Joi.number().integer().required().min(1).max(120),
  location: Joi.string().required().min(1).max(200),
  opportunity: Joi.string().required().min(1).max(500),
  testimonial: Joi.string().required().min(10).max(2000),
  image: Joi.string().uri().optional()
});

export const updateTestimonialSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  age: Joi.number().integer().min(1).max(120).optional(),
  location: Joi.string().min(1).max(200).optional(),
  opportunity: Joi.string().min(1).max(500).optional(),
  testimonial: Joi.string().min(10).max(2000).optional(),
  image: Joi.string().uri().optional()
});

export const testimonialIdParamsSchema = Joi.object({
  id: Joi.string().required()
});

export const testimonialsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().optional()
});