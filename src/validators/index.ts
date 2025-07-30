import Joi from "joi";

export const userSchema = Joi.object({
  id: Joi.string().optional(),
  name: Joi.string().required().min(1).max(255),
  email: Joi.string().email().required(),
  country: Joi.string().required().min(1).max(100),
  status: Joi.string()
    .valid("active", "inactive", "suspended")
    .default("active"),
  verified: Joi.boolean().default(false),
  signupDate: Joi.string().isoDate().optional(),
  lastActive: Joi.string().isoDate().optional(),
  interests: Joi.array().items(Joi.string().min(1)).default([]),
  profilePicture: Joi.string().uri().optional(),
  role: Joi.string().valid("user", "admin").default("user"),
});

export const opportunitySchema = Joi.object({
  id: Joi.string().optional(),
  title: Joi.string().required().min(1).max(500),
  type: Joi.string()
    .valid("scholarship", "internship", "fellowship", "grant")
    .required(),
  description: Joi.string().required().min(1),
  deadline: Joi.string().isoDate().required(),
  location: Joi.string().required().min(1).max(200),
  amount: Joi.string().optional(),
  link: Joi.string().uri().required(),
  category: Joi.string().required().min(1).max(100),
  status: Joi.string().valid("published", "draft", "archived").default("draft"),
  createdAt: Joi.string().isoDate().optional(),
  updatedAt: Joi.string().isoDate().optional(),
});

export const opportunityDetailSchema = Joi.object({
  id: Joi.string().optional(),
  title: Joi.string().required().min(1).max(500),
  type: Joi.string()
    .valid("scholarship", "internship", "fellowship", "grant")
    .required(),
  description: Joi.string().required().min(1),
  deadline: Joi.string().isoDate().required(),
  location: Joi.string().required().min(1).max(200),
  amount: Joi.string().optional(),
  link: Joi.string().uri().required(),
  category: Joi.string().required().min(1).max(100),
  status: Joi.string().valid("published", "draft", "archived").default("draft"),
  createdAt: Joi.string().isoDate().optional(),
  updatedAt: Joi.string().isoDate().optional(),
  fullDescription: Joi.string().required().min(1),
  applicationInstructions: Joi.string().required().min(1),
  eligibility: Joi.array().items(Joi.string().min(1)).required(),
  benefits: Joi.array().items(Joi.string().min(1)).required(),
  views: Joi.number().integer().min(0).default(0),
  applications: Joi.number().integer().min(0).default(0),
  saves: Joi.number().integer().min(0).default(0),
});

export const aiDraftSchema = Joi.object({
  id: Joi.string().optional(),
  title: Joi.string().required().min(1).max(500),
  source: Joi.string().required().min(1),
  status: Joi.string()
    .valid("pending", "approved", "rejected")
    .default("pending"),
  priority: Joi.string().valid("high", "medium", "low").default("medium"),
  extractedData: Joi.object().unknown(true).required(),
  createdAt: Joi.string().isoDate().optional(),
});

export const chatConversationSchema = Joi.object({
  id: Joi.string().optional(),
  userId: Joi.string().required(),
  messages: Joi.array()
    .items(
      Joi.object({
        id: Joi.string().optional(),
        content: Joi.string().required().min(1),
        sender: Joi.string().valid("user", "bot").required(),
        timestamp: Joi.string().isoDate().optional(),
        metadata: Joi.any().optional(),
      })
    )
    .default([]),
  createdAt: Joi.string().isoDate().optional(),
  updatedAt: Joi.string().isoDate().optional(),
});

export const chatMessageSchema = Joi.object({
  id: Joi.string().optional(),
  content: Joi.string().required().min(1),
  sender: Joi.string().valid("user", "bot").required(),
  timestamp: Joi.string().isoDate().optional(),
  metadata: Joi.any().optional(),
});

export const updateUserSchema = userSchema.fork(
  ["name", "email", "country"],
  (schema) => schema.optional()
);
export const updateOpportunitySchema = opportunitySchema.fork(
  ["title", "type", "description", "deadline", "location", "link", "category"],
  (schema) => schema.optional()
);
export const updateAiDraftSchema = aiDraftSchema.fork(
  ["title", "source", "extractedData"],
  (schema) => schema.optional()
);
