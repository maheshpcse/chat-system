"use strict";

const { Router } = require("express");
const messageController = require("./message.controller");
const { authenticate } = require("../../middleware/authentication");
const { validate } = require("../../middleware/validation");
const { messageLimiter } = require("../../middleware/rateLimiter");
const { sendMessageSchema, getMessagesSchema, deleteMessageSchema } = require("./message.validation");

const router = Router();

router.post("/", authenticate, messageLimiter, validate(sendMessageSchema), messageController.send);
router.get("/unread", authenticate, messageController.getUnreadCount);
router.get("/:conversationId", authenticate, validate(getMessagesSchema), messageController.getMessages);
router.put("/:conversationId/read", authenticate, messageController.markAsRead);
router.delete("/:messageId", authenticate, validate(deleteMessageSchema), messageController.deleteMessage);

module.exports = router;
