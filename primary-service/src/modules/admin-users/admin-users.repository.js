"use strict";

/**
 * Admin Users Repository
 */

const { callProcedure } = require("../../config/database");

class AdminUsersRepository {
  async listUsers({ search, status, role, offset, limit }) {
    const result = await callProcedure("spListUsersAdmin", [
      search || null,
      status || null,
      role || null,
      offset,
      limit,
    ]);
    const rows = result[0] || [];
    const totalRow = result[1] && result[1][0] ? result[1][0] : { total: 0 };
    return { rows, total: Number(totalRow.total || 0) };
  }

  async updateStatus(userId, status) {
    const result = await callProcedure("spUpdateUserStatusAdmin", [userId, status]);
    return result[0] ? result[0][0] : null;
  }

  async getUserById(userId) {
    const result = await callProcedure("spGetUserById", [userId]);
    return result[0] ? result[0][0] : null;
  }
}

module.exports = new AdminUsersRepository();
