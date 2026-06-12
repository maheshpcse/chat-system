"use strict";

/**
 * User Repository
 * Data access layer for user operations via stored procedures.
 */

const { callProcedure } = require("../../config/database");

class UserRepository {
  async findById(userId) {
    const result = await callProcedure("spGetUserById", [userId]);
    return result[0] ? result[0][0] : null;
  }

  async updateProfile(userId, profileData) {
    const { firstName, lastName, phoneNumber, avatarUrl, bio } = profileData;
    const result = await callProcedure("spUpdateUserProfile", [
      userId,
      firstName || null,
      lastName || null,
      phoneNumber || null,
      avatarUrl || null,
      bio || null,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async searchUsers(searchTerm, page, limit) {
    const offset = (page - 1) * limit;
    const result = await callProcedure("spSearchUsers", [searchTerm, limit, offset]);
    return {
      users: result[0] || [],
      total: result[1] ? result[1][0].total : 0,
    };
  }

  async updateOnlineStatus(userId, isOnline) {
    await callProcedure("spUpdateUserOnlineStatus", [userId, isOnline]);
  }

  async getOnlineContacts(userId) {
    const result = await callProcedure("spGetOnlineContacts", [userId]);
    return result[0] || [];
  }
}

module.exports = new UserRepository();
