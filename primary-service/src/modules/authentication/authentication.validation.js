"use strict";

/**
 * Authentication Validation Schemas
 * Joi schemas for validating authentication-related requests.
 */

const Joi = require("joi");

const registerSchema = {
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).required()
      .messages({ "string.min": "First name must be at least 2 characters" }),
    lastName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required()
      .messages({ "string.email": "Please provide a valid email address" }),
    password: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .messages({
        "string.pattern.base": "Password must contain uppercase, lowercase, number, and special character",
        "string.min": "Password must be at least 8 characters",
      }),
    username: Joi.string().alphanum().min(3).max(30).required(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
  }),
};

const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .messages({
        "string.pattern.base": "New password must contain uppercase, lowercase, number, and special character",
      }),
  }),
};

module.exports = {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
};
