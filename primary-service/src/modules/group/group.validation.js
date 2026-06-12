"use strict";

const Joi = require("joi");

const createGroupSchema = {
  body: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional().allow(""),
    memberIds: Joi.array().items(Joi.string().uuid()).min(1).max(256).required(),
  }),
};

const updateGroupSchema = {
  params: Joi.object({
    groupId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional().allow(""),
    avatarUrl: Joi.string().uri().optional().allow(null),
  }),
};

const addMemberSchema = {
  params: Joi.object({
    groupId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    userId: Joi.string().uuid().required(),
    role: Joi.string().valid("admin", "member").default("member"),
  }),
};

const removeMemberSchema = {
  params: Joi.object({
    groupId: Joi.string().uuid().required(),
    userId: Joi.string().uuid().required(),
  }),
};

module.exports = { createGroupSchema, updateGroupSchema, addMemberSchema, removeMemberSchema };
