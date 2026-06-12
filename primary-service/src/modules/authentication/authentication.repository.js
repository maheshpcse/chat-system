"use strict";

/**
 * Authentication Repository
 * Data access layer for authentication operations.
 * ALL database operations use stored procedures.
 */

const { callProcedure } = require("../../config/database");

class AuthenticationRepository {
  /**
   * Creates a new user account.
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user record
   */
  async createUser(userData) {
    const { userId, firstName, lastName, email, username, passwordHash, phoneNumber } = userData;

    const result = await callProcedure("spCreateUser", [
      userId,
      firstName,
      lastName,
      email,
      username,
      passwordHash,
      phoneNumber || null,
    ]);

    return result[0] ? result[0][0] : null;
  }

  /**
   * Finds a user by email for login purposes.
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User record or null
   */
  async findUserByEmail(email) {
    const result = await callProcedure("spGetUserByEmail", [email]);
    return result[0] ? result[0][0] : null;
  }

  /**
   * Finds a user by username.
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User record or null
   */
  async findUserByUsername(username) {
    const result = await callProcedure("spGetUserByUsername", [username]);
    return result[0] ? result[0][0] : null;
  }

  /**
   * Stores a refresh token for a user session.
   * @param {string} userId - User ID
   * @param {string} refreshToken - Hashed refresh token
   * @param {string} expiresAt - Expiration timestamp
   * @returns {Promise<Object>} Result
   */
  async storeRefreshToken(userId, refreshToken, expiresAt) {
    const result = await callProcedure("spStoreRefreshToken", [
      userId,
      refreshToken,
      expiresAt,
    ]);
    return result[0] ? result[0][0] : null;
  }

  /**
   * Validates a refresh token exists and is not expired.
   * @param {string} userId - User ID
   * @param {string} refreshToken - Hashed refresh token
   * @returns {Promise<Object|null>} Token record or null
   */
  async findRefreshToken(userId, refreshToken) {
    const result = await callProcedure("spValidateRefreshToken", [
      userId,
      refreshToken,
    ]);
    return result[0] ? result[0][0] : null;
  }

  /**
   * Revokes a specific refresh token (logout).
   * @param {string} userId - User ID
   * @param {string} refreshToken - Token to revoke
   */
  async revokeRefreshToken(userId, refreshToken) {
    await callProcedure("spRevokeRefreshToken", [userId, refreshToken]);
  }

  /**
   * Revokes all refresh tokens for a user (logout all sessions).
   * @param {string} userId - User ID
   */
  async revokeAllRefreshTokens(userId) {
    await callProcedure("spRevokeAllRefreshTokens", [userId]);
  }

  /**
   * Updates the user's last login timestamp.
   * @param {string} userId - User ID
   */
  async updateLastLogin(userId) {
    await callProcedure("spUpdateLastLogin", [userId]);
  }

  /**
   * Updates user password hash.
   * @param {string} userId - User ID
   * @param {string} newPasswordHash - New bcrypt hash
   */
  async updatePassword(userId, newPasswordHash) {
    await callProcedure("spUpdateUserPassword", [userId, newPasswordHash]);
  }
}

module.exports = new AuthenticationRepository();
