"use strict";

/**
 * Admin Auth Controller
 */

const adminAuthService = require("./admin-auth.service");
const { sendSuccess } = require("../../utils/response");

class AdminAuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await adminAuthService.login(email, password);
      return sendSuccess(res, 200, "Admin login successful", result);
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await adminAuthService.refreshToken(refreshToken);
      return sendSuccess(res, 200, "Admin token refreshed", result);
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const { refreshToken } = req.body || {};
      await adminAuthService.logout(req.admin.adminId, refreshToken);
      return sendSuccess(res, 200, "Admin logged out successfully");
    } catch (error) {
      next(error);
    }
  }

  async me(req, res, next) {
    try {
      const result = await adminAuthService.me(req.admin.adminId);
      return sendSuccess(res, 200, "Admin profile", result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminAuthController();
