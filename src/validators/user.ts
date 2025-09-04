import Joi from "joi";
import { UserStatus } from "../enums";

export const updateProfileSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional(),
  country: Joi.string().min(1).max(100).optional(),
  bio: Joi.string().max(1000).optional(),
  interests: Joi.array().items(Joi.string().min(1)).optional(),
  skills: Joi.array().items(Joi.string().min(1)).optional(),
  profilePicture: Joi.string().uri().optional(),

  // Enhanced profile for AI personalization
  academicLevel: Joi.string()
    .valid(
      "high_school",
      "undergraduate",
      "graduate",
      "postgraduate",
      "professional"
    )
    .optional(),
  fieldOfStudy: Joi.string().max(100).optional(),
  careerStage: Joi.string()
    .valid("student", "entry_level", "mid_level", "senior_level", "executive")
    .optional(),
  goals: Joi.array().items(Joi.string().min(1).max(200)).optional(),
  preferences: Joi.object().optional(),
  personalityTraits: Joi.array().items(Joi.string().min(1).max(50)).optional(),
  learningStyle: Joi.string()
    .valid("visual", "auditory", "kinesthetic", "reading_writing")
    .optional(),
  aiInteractionPrefs: Joi.object().optional(),
  timeZone: Joi.string().max(50).optional(),
  languages: Joi.array().items(Joi.string().min(1).max(50)).optional(),
  workExperience: Joi.string()
    .valid("0-1", "2-5", "6-10", "11-15", "16+")
    .optional(),
  currentFocus: Joi.array().items(Joi.string().min(1).max(100)).optional(),
});

export const userIdParamsSchema = Joi.object({
  id: Joi.string().required(),
});

export const adminUsersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional(),
  country: Joi.string().optional(),
  search: Joi.string().optional(),
});

export const updateUserStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .required(),
});
