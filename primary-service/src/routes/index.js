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
const notificationRoutes = require("../modules/notification/notification.routes");
const settingsRoutes = require("../modules/settings/settings.routes");
const scheduledMessageRoutes = require("../modules/scheduled-message/scheduled-message.routes");

// Admin module routes (isolated auth + JWT secrets)
const adminAuthRoutes = require("../modules/admin-auth/admin-auth.routes");
const adminDashboardRoutes = require("../modules/admin-dashboard/admin-dashboard.routes");
const adminUsersRoutes = require("../modules/admin-users/admin-users.routes");
const adminFakerRoutes = require("../modules/admin-faker/admin-faker.routes");

// Register routes with prefixes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/conversations", conversationRoutes);
router.use("/messages", messageRoutes);
router.use("/groups", groupRoutes);
router.use("/uploads", uploadRoutes);
router.use("/contacts", contactRoutes);
router.use("/presence", presenceRoutes);
router.use("/notifications", notificationRoutes);
router.use("/settings", settingsRoutes);
router.use("/scheduled-messages", scheduledMessageRoutes);

// Admin API — never share user JWT middleware
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/admin/users", adminUsersRoutes);
router.use("/admin/faker", adminFakerRoutes);

// Health checks (liveness + readiness for load balancers / Render / K8s)
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    message: "Chat Primary Service is running",
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
    uptimeSec: Math.floor(process.uptime()),
  });
});

/** Process alive — no dependency checks (use for container liveness) */
router.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

/** Ready to take traffic — MySQL required; Redis optional */
router.get("/health/ready", async (req, res) => {
  const checks = { mysql: "unknown", redis: "unknown" };
  let ready = true;

  try {
    const { getPool } = require("../config/database");
    const connection = await getPool().getConnection();
    await connection.ping();
    connection.release();
    checks.mysql = "up";
  } catch (err) {
    checks.mysql = "down";
    ready = false;
  }

  try {
    const { getRedisClient } = require("../config/redis");
    const redis = getRedisClient();
    if (redis && redis.status === "ready") {
      await redis.ping();
      checks.redis = "up";
    } else {
      checks.redis = "skipped";
    }
  } catch (err) {
    checks.redis = process.env.REDIS_REQUIRED === "true" ? "down" : "degraded";
    if (process.env.REDIS_REQUIRED === "true") {
      ready = false;
    }
  }

  const statusCode = ready ? 200 : 503;
  res.status(statusCode).json({
    success: ready,
    status: ready ? "ready" : "not_ready",
    checks,
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || "1.0.0",
  });
});

module.exports = router;
