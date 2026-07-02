"use strict";

/**
 * Central Route Registry
 * Aggregates all module routes under their respective prefixes.
 */

const { Router } = require("express");

const router = Router();

// Import module routes
const authRoutes = require("../modules/authentication/authentication.routes");
const userRoutes = require("../modules/user/user.routes");
const conversationRoutes = require("../modules/conversation/conversation.routes");
const messageRoutes = require("../modules/message/message.routes");
const groupRoutes = require("../modules/group/group.routes");
const uploadRoutes = require("../modules/upload/upload.routes");
const contactRoutes = require("../modules/contact/contact.routes");
const presenceRoutes = require("../modules/presence/presence.routes");

// Register routes with prefixes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/conversations", conversationRoutes);
router.use("/messages", messageRoutes);
router.use("/groups", groupRoutes);
router.use("/uploads", uploadRoutes);
router.use("/contacts", contactRoutes);
router.use("/presence", presenceRoutes);

// Health check
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Chat Primary Service is running",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
  });
});

module.exports = router;
