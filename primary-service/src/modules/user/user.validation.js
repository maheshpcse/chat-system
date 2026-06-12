"use strict";

const Joi = require("joi");

const updateProfileSchema = {
  body: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().allow(null),
    avatarUrl: Joi.string().uri().optional().allow(null),
    bio: Joi.string().max(500).optional().allow(""),
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
