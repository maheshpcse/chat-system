"use strict";

const { Router } = require("express");
const notificationController = require("./notification.controller");
const { authenticate } = require("../../middleware/authentication");

const router = Router();

// All notification routes require authentication
router.get("/", authenticate, notificationController.getNotifications);
router.get("/unread-count", authenticate, notificationController.getUnreadCount);
router.put("/:notificationId/read", authenticate, notificationController.markAsRead);
router.put("/read-all", authenticate, notificationController.markAllAsRead);
router.delete("/clear", authenticate, notificationController.clearAll);

module.exports = router;
