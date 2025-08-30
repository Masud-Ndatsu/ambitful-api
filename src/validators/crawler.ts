import Joi from "joi";
import { CrawlSourceStatus, CrawlFrequency } from "../enums";

// Create Crawl Source
export const createCrawlSourceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be between 1 and 255 characters",
    "string.max": "Name must be between 1 and 255 characters",
  }),
  url: Joi.string()
    .trim()
    .uri({ scheme: ["http", "https"] })
    .required()
    .messages({
      "string.empty": "URL is required",
      "string.uri": "Must be a valid URL with protocol (http/https)",
    }),
  status: Joi.string()
    .valid(...Object.values(CrawlSourceStatus))
    .optional()
    .messages({
      "any.only": "Status must be active, paused, or disabled",
    }),
  frequency: Joi.string()
    .valid(...Object.values(CrawlFrequency))
    .optional()
    .messages({
      "any.only": "Frequency must be hourly, daily, weekly, or monthly",
    }),
  maxResults: Joi.number().integer().min(1).max(1000).optional().messages({
    "number.base": "Max results must be a number",
    "number.min": "Max results must be between 1 and 1000",
    "number.max": "Max results must be between 1 and 1000",
  }),
});

// Update Crawl Source
export const updateCrawlSourceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional().messages({
    "string.min": "Name must be between 1 and 255 characters",
    "string.max": "Name must be between 1 and 255 characters",
  }),
  url: Joi.string()
    .trim()
    .uri({ scheme: ["http", "https"] })
    .optional()
    .messages({
      "string.uri": "Must be a valid URL with protocol (http/https)",
    }),
  status: Joi.string()
    .valid(...Object.values(CrawlSourceStatus))
    .optional()
    .messages({
      "any.only": "Status must be active, paused, or disabled",
    }),
  frequency: Joi.string()
    .valid(...Object.values(CrawlFrequency))
    .optional()
    .messages({
      "any.only": "Frequency must be hourly, daily, weekly, or monthly",
    }),
  maxResults: Joi.number().integer().min(1).max(1000).optional().messages({
    "number.base": "Max results must be a number",
    "number.min": "Max results must be between 1 and 1000",
    "number.max": "Max results must be between 1 and 1000",
  }),
});

// ID param validation
export const idParamSchema = Joi.object({
  id: Joi.string().required().messages({
    "string.empty": "Source ID is required",
    "any.required": "Source ID is required",
  }),
});

// Query for getCrawlSources
export const getCrawlSourcesQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(CrawlSourceStatus))
    .optional()
    .messages({
      "any.only": "Status must be active, paused, or disabled",
    }),
  frequency: Joi.string()
    .valid(...Object.values(CrawlFrequency))
    .optional()
    .messages({
      "any.only": "Frequency must be hourly, daily, weekly, or monthly",
    }),
  search: Joi.string().trim().min(1).max(255).optional().messages({
    "string.min": "Search term must be between 1 and 255 characters",
    "string.max": "Search term must be between 1 and 255 characters",
  }),
  page: Joi.number().integer().min(1).optional().messages({
    "number.base": "Page must be a number",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number().integer().min(1).max(100).optional().messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be between 1 and 100",
    "number.max": "Limit must be between 1 and 100",
  }),
});

// Query for getCrawlLogs
export const getCrawlLogsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).optional().messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be between 1 and 1000",
    "number.max": "Limit must be between 1 and 1000",
  }),
});

// Query for getRecentCrawlLogs
export const getRecentCrawlLogsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(1000).optional().messages({
    "number.base": "Limit must be a number",
    "number.min": "Limit must be between 1 and 1000",
    "number.max": "Limit must be between 1 and 1000",
  }),
});
