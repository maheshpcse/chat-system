"use strict";

/**
 * Admin Auth Repository
 * All DB access via stored procedures.
 */

const { callProcedure } = require("../../config/database");

class AdminAuthRepository {
  async createAdmin(adminData) {
    const { adminId, email, passwordHash, firstName, lastName, role } = adminData;
    const result = await callProcedure("spCreateAdmin", [
      adminId,
      email,
      passwordHash,
      firstName,
      lastName,
      role || "admin",
    ]);
    return result[0] ? result[0][0] : null;
  }

  async findAdminByEmail(email) {
    const result = await callProcedure("spGetAdminByEmail", [email]);
    return result[0] ? result[0][0] : null;
  }

  async findAdminById(adminId) {
    const result = await callProcedure("spGetAdminById", [adminId]);
    return result[0] ? result[0][0] : null;
  }

  async updateLastLogin(adminId) {
    await callProcedure("spUpdateAdminLastLogin", [adminId]);
  }

  async storeRefreshToken(adminId, refreshToken, expiresAt) {
    const result = await callProcedure("spStoreAdminRefreshToken", [
      adminId,
      refreshToken,
      expiresAt,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async findRefreshToken(adminId, refreshToken) {
    const result = await callProcedure("spValidateAdminRefreshToken", [
      adminId,
      refreshToken,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async revokeRefreshToken(adminId, refreshToken) {
    await callProcedure("spRevokeAdminRefreshToken", [adminId, refreshToken]);
  }

  async revokeAllRefreshTokens(adminId) {
    await callProcedure("spRevokeAllAdminRefreshTokens", [adminId]);
  }
}

module.exports = new AdminAuthRepository();
