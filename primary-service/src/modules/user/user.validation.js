"use strict";

const Joi = require("joi");

const updateProfileSchema = {
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    // Optional: empty string, null, or loose international phone (spaces/dashes OK)
    phoneNumber: Joi.string()
      .allow("", null)
      .optional()
      .custom((value, helpers) => {
        if (value == null || value === "") {
          return value;
        }
        const digits = String(value).replace(/[\s\-().]/g, "");
        if (!/^\+?[0-9]{7,15}$/.test(digits)) {
          return helpers.error("string.pattern.base");
        }
        return value;
      })
      .messages({
        "string.pattern.base": "Enter a valid phone number or leave blank",
      }),
    avatarUrl: Joi.string().uri().optional().allow("", null),
    bio: Joi.string().max(500).optional().allow("", null),
  }),
};

const getUserSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
};

const searchUsersSchema = {
  query: Joi.object({
    search: Joi.string().min(1).max(100).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};

module.exports = { updateProfileSchema, getUserSchema, searchUsersSchema };
