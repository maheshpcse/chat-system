"use strict";

const adminDashboardService = require("./admin-dashboard.service");
const { sendSuccess } = require("../../utils/response");

class AdminDashboardController {
  async getOverview(req, res, next) {
    try {
      const result = await adminDashboardService.getOverview();
      return sendSuccess(res, 200, "Dashboard overview", result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminDashboardController();
