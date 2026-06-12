"use strict";

/**
 * Authentication Controller
 * Handles HTTP request/response for authentication operations.
 * Thin layer - delegates business logic to service.
 */

const authService = require("./authentication.service");
const { sendSuccess } = require("../../utils/response");

class AuthenticationController {
  /**
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const result = await authService.register(req.body);
      return sendSuccess(res, 201, "Registration successful", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      return sendSuccess(res, 200, "Login successful", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh-token
   */
  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await authService.refreshToken(refreshToken);
      return sendSuccess(res, 200, "Token refreshed successfully", result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await authService.logout(req.user.userId, refreshToken);
      return sendSuccess(res, 200, "Logged out successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/change-password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.changePassword(req.user.userId, currentPassword, newPassword);
      return sendSuccess(res, 200, "Password changed successfully");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthenticationController();
