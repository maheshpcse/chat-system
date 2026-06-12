"use strict";

const Joi = require("joi");

const sendMessageSchema = {
  body: Joi.object({
    conversationId: Joi.string().uuid().required(),
    content: Joi.string().min(1).max(5000).required(),
    messageType: Joi.string().valid("text", "image", "file", "audio", "video").default("text"),
    attachmentUrl: Joi.string().uri().optional().allow(null),
  }),
};

const getMessagesSchema = {
  params: Joi.object({
    conversationId: Joi.string().uuid().required(),
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    before: Joi.string().isoDate().optional(),
  }),
};

const deleteMessageSchema = {
  params: Joi.object({
    messageId: Joi.string().uuid().required(),
  }),
};

module.exports = { sendMessageSchema, getMessagesSchema, deleteMessageSchema };
