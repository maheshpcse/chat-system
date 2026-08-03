"use strict";

/**
 * Admin Dashboard Repository
 */

const { callProcedure } = require("../../config/database");

class AdminDashboardRepository {
  async getStats() {
    const result = await callProcedure("spGetDashboardStats", []);
    return result[0] ? result[0][0] : null;
  }

  async getRecentActivity(limit = 10) {
    const result = await callProcedure("spGetRecentActivity", [limit]);
    const recentUsers = result[0] || [];
    const recentMessages = result[1] || [];
    return { recentUsers, recentMessages };
  }
}

module.exports = new AdminDashboardRepository();
