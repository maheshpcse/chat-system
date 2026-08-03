"use strict";

const Joi = require("joi");

const generateUsersSchema = {
  body: Joi.object({
    count: Joi.number().integer().min(1).max(200).default(10),
    defaultPassword: Joi.string().min(6).max(128).optional(),
    role: Joi.string().valid("user", "moderator").optional(),
    status: Joi.string().valid("active", "inactive").optional(),
  }),
};

const generateContactsSchema = {
  body: Joi.object({
    count: Joi.number().integer().min(1).max(200).default(10),
    mode: Joi.string().valid("accepted", "pending").default("accepted"),
  }),
};

const generateGroupsSchema = {
  body: Joi.object({
    count: Joi.number().integer().min(1).max(50).default(5),
    membersPerGroup: Joi.number().integer().min(2).max(20).default(4),
  }),
};

const generateMessagesSchema = {
  body: Joi.object({
    count: Joi.number().integer().min(1).max(500).default(20),
    messageType: Joi.string().valid("text", "image", "file", "system").default("text"),
  }),
};

const previewIdParamSchema = {
  params: Joi.object({
    previewId: Joi.string().uuid().required(),
  }),
};

const previewUserParamSchema = {
  params: Joi.object({
    previewId: Joi.string().uuid().required(),
    tempId: Joi.string().uuid().required(),
  }),
};

const updatePreviewUserSchema = {
  params: Joi.object({
    previewId: Joi.string().uuid().required(),
    tempId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    email: Joi.string().email().max(255).optional(),
    username: Joi.string().alphanum().min(3).max(30).optional(),
    password: Joi.string().min(6).max(128).optional(),
    phoneNumber: Joi.string().max(20).allow("", null).optional(),
    bio: Joi.string().max(500).allow("", null).optional(),
    role: Joi.string().valid("user", "moderator").optional(),
    status: Joi.string().valid("active", "inactive", "banned", "suspended").optional(),
  }).min(1),
};

const updatePreviewGroupSchema = {
  params: Joi.object({
    previewId: Joi.string().uuid().required(),
    tempId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(1).max(100).optional(),
    description: Joi.string().max(500).allow("", null).optional(),
  }).min(1),
};

const savePreviewSchema = {
  body: Joi.object({
    previewId: Joi.string().uuid().required(),
  }),
};

module.exports = {
  generateUsersSchema,
  generateContactsSchema,
  generateGroupsSchema,
  generateMessagesSchema,
  previewIdParamSchema,
  previewUserParamSchema,
  updatePreviewUserSchema,
  updatePreviewGroupSchema,
  saveUsersSchema: savePreviewSchema,
  savePreviewSchema,
};