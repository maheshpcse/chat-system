"use strict";

/**
 * Admin Auth Validation Schemas
 */

const Joi = require("joi");

const adminLoginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const adminRefreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const adminLogoutSchema = {
  body: Joi.object({
    refreshToken: Joi.string().optional().allow("", null),
  }),
};

module.exports = {
  adminLoginSchema,
  adminRefreshTokenSchema,
  adminLogoutSchema,
};
