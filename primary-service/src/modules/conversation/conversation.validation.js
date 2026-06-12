"use strict";

const Joi = require("joi");

const createConversationSchema = {
  body: Joi.object({
    participantId: Joi.string().uuid().required(),
  }),
};

const getConversationsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

module.exports = { createConversationSchema, getConversationsSchema };
