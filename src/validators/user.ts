import Joi from 'joi';
import { UserStatus } from '../enums';

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional(),
  country: Joi.string().min(1).max(100).optional(),
  interests: Joi.array().items(Joi.string().min(1)).optional(),
  profilePicture: Joi.string().uri().optional()
});

export const userIdParamsSchema = Joi.object({
  id: Joi.string().required()
});

export const adminUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(UserStatus)).optional(),
  country: Joi.string().optional(),
  search: Joi.string().optional()
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string().valid(...Object.values(UserStatus)).required()
});