import Joi from "joi";

export const linkedinCallbackSchema = Joi.object({
  code: Joi.string().required().messages({
    "string.empty": "Authorization code is required",
    "any.required": "Authorization code is required",
  }),
  state: Joi.string().optional().allow(""),
});

export const refreshTokenSchema = Joi.object({
  accessToken: Joi.string().required().messages({
    "string.empty": "Access token is required",
    "any.required": "Access token is required",
  }),
});
