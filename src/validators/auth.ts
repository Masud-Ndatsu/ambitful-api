import Joi from 'joi';

export const registerSchema = Joi.object({
  name: Joi.string().required().min(1).max(255),
  email: Joi.string().email().required(),
  password: Joi.string().required().min(8).max(128),
  country: Joi.string().required().min(1).max(100),
  interests: Joi.array().items(Joi.string().min(1)).default([])
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required()
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string().required().min(8).max(128)
});

export const verifyEmailParamsSchema = Joi.object({
  token: Joi.string().required()
});