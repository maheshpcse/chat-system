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

module.exports = { sendRequestSchema, requestIdParamSchema, contactUserIdParamSchema };
