"use strict";

const Joi = require("joi");

const listUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    search: Joi.string().allow("").max(255).optional(),
    status: Joi.string().valid("active", "inactive", "banned", "suspended", "").optional(),
    role: Joi.string().valid("admin", "moderator", "user", "").optional(),
  }),
};

const userIdParamSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
};

const updateStatusSchema = {
  params: Joi.object({
    userId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    status: Joi.string().valid("active", "inactive", "banned", "suspended").required(),
  }),
};

module.exports = {
  listUsersSchema,
  userIdParamSchema,
  updateStatusSchema,
};
