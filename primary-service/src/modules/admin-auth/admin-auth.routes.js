"use strict";

/**
 * Admin Auth Routes — /api/v1/admin/auth/*
 */

const { Router } = require("express");
const adminAuthController = require("./admin-auth.controller");
const { validate } = require("../../middleware/validation");
const { authenticateAdmin } = require("../../middleware/adminAuthentication");
const { authLimiter } = require("../../middleware/rateLimiter");
const {
  adminLoginSchema,
  adminRefreshTokenSchema,
  adminLogoutSchema,
} = require("./admin-auth.validation");

const router = Router();

router.post("/login", authLimiter, validate(adminLoginSchema), adminAuthController.login);
router.post("/refresh-token", validate(adminRefreshTokenSchema), adminAuthController.refreshToken);
router.post("/logout", authenticateAdmin, validate(adminLogoutSchema), adminAuthController.logout);
router.get("/me", authenticateAdmin, adminAuthController.me);

module.exports = router;
