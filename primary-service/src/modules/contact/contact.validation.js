"use strict";

const Joi = require("joi");

const sendRequestSchema = {
  body: Joi.object({
    receiverUserId: Joi.string().uuid().required(),
  }),
};

const requestIdParamSchema = {
  params: Joi.object({
    requestId: Joi.string().uuid().required(),
  }),
};

const contactUserIdParamSchema = {
  params: Joi.object({
    contactUserId: Joi.string().uuid().required(),
  }),
};

const blockContactSchema = {
  params: Joi.object({
    contactUserId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    reason: Joi.string().max(255).allow(null, ""),
  }),
};

const contactSettingsSchema = {
  params: Joi.object({
    contactUserId: Joi.string().uuid().required(),
  }),
  body: Joi.object({
    nickname: Joi.string().max(100).allow(null, ""),
    muted: Joi.boolean(),
    pinned: Joi.boolean(),
  }).min(1),
};

module.exports = { sendRequestSchema, requestIdParamSchema, contactUserIdParamSchema, blockContactSchema, contactSettingsSchema };
