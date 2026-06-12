"use strict";

const { Router } = require("express");
const conversationController = require("./conversation.controller");
const { authenticate } = require("../../middleware/authentication");
const { validate } = require("../../middleware/validation");
const { createConversationSchema, getConversationsSchema } = require("./conversation.validation");

const router = Router();

router.post("/", authenticate, validate(createConversationSchema), conversationController.create);
router.get("/", authenticate, validate(getConversationsSchema), conversationController.getAll);
router.get("/:conversationId", authenticate, conversationController.getById);

module.exports = router;
