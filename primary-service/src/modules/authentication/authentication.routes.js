"use strict";

/**
 * Authentication Routes
 * Defines all authentication-related API endpoints.
 */

const { Router } = require("express");
const authController = require("./authentication.controller");
const { validate } = require("../../middleware/validation");
const { authenticate } = require("../../middleware/authentication");
const { authLimiter } = require("../../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} = require("./authentication.validation");

const router = Router();

// Public routes (rate limited)
router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/refresh-token", validate(refreshTokenSchema), authController.refreshToken);

// Protected routes
router.post("/logout", authenticate, authController.logout);
router.post("/change-password", authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
