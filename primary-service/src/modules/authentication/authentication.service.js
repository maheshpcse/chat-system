"use strict";

/**
 * Authentication Service
 * Business logic for authentication operations.
 * Handles password hashing, JWT generation, and token lifecycle.
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { config } = require("../../config/environment");
const authRepository = require("./authentication.repository");
const { generateId, generateToken } = require("../../utils/helpers");
const {
  UnauthorizedError,
  ConflictError,
  BadRequestError,
} = require("../../utils/errors");
const logger = require("../../utils/logger");

class AuthenticationService {
  /**
   * Registers a new user.
   * @param {Object} registrationData - User registration data
   * @returns {Promise<Object>} Created user with tokens
   */
  async register(registrationData) {
    const { firstName, lastName, email, username, password, phoneNumber } = registrationData;

    // Check if email already exists
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new ConflictError("An account with this email already exists");
    }

    // Check if username already exists
    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new ConflictError("This username is already taken");
    }

    // Hash password using bcrypt with configured salt rounds
    const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);

    // Generate unique user ID
    const userId = generateId();

    // Create user in database
    const user = await authRepository.createUser({
      userId,
      firstName,
      lastName,
      email,
      username,
      passwordHash,
      phoneNumber,
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(userId, email, "user");

    logger.info(`User registered: ${email}`, { userId });

    return {
      user: {
        userId,
        firstName,
        lastName,
        email,
        username,
      },
      ...tokens,
    };
  }

  /**
   * Authenticates a user with email and password.
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<Object>} User data with tokens
   */
  async login(email, password) {
    // Find user by email
    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    // Check if account is active
    if (user.status !== "active") {
      throw new UnauthorizedError("Your account has been deactivated. Contact support.");
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(user.userId, user.email, user.role);

    // Update last login
    await authRepository.updateLastLogin(user.userId);

    logger.info(`User logged in: ${email}`, { userId: user.userId });

    return {
      user: {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Refreshes an expired access token using a valid refresh token.
   * @param {string} refreshToken - The refresh token
   * @returns {Promise<Object>} New token pair
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token signature
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);

      // Check if refresh token exists in database (not revoked)
      const storedToken = await authRepository.findRefreshToken(
        decoded.userId,
        refreshToken
      );

      if (!storedToken) {
        throw new UnauthorizedError("Refresh token is invalid or has been revoked");
      }

      // Generate new token pair
      const tokens = await this.generateTokenPair(
        decoded.userId,
        decoded.email,
        decoded.role
      );

      // Revoke old refresh token
      await authRepository.revokeRefreshToken(decoded.userId, refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedError) throw error;
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  /**
   * Logs out a user by revoking their refresh token.
   * @param {string} userId - User ID
   * @param {string} refreshToken - Token to revoke
   */
  async logout(userId, refreshToken) {
    await authRepository.revokeRefreshToken(userId, refreshToken);
    logger.info(`User logged out`, { userId });
  }

  /**
   * Changes user password.
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await authRepository.findUserByEmail(userId);
    if (!user) {
      throw new BadRequestError("User not found");
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new UnauthorizedError("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
    await authRepository.updatePassword(userId, newPasswordHash);

    // Revoke all refresh tokens (force re-login on all devices)
    await authRepository.revokeAllRefreshTokens(userId);

    logger.info(`Password changed`, { userId });
  }

  /**
   * Generates an access token and refresh token pair.
   * @param {string} userId - User ID
   * @param {string} email - User email
   * @param {string} role - User role
   * @returns {Promise<Object>} Token pair
   */
  async generateTokenPair(userId, email, role) {
    const accessToken = jwt.sign(
      { userId, email, role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry }
    );

    const refreshToken = jwt.sign(
      { userId, email, role },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiry }
    );

    // Calculate expiry date for storage
    const expiresAt = new Date(
      Date.now() + this.parseExpiry(config.jwt.refreshExpiry)
    ).toISOString();

    // Store refresh token in database
    await authRepository.storeRefreshToken(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  /**
   * Parses JWT expiry string to milliseconds.
   * @param {string} expiry - Expiry string (e.g., "7d", "15m", "1h")
   * @returns {number} Milliseconds
   */
  parseExpiry(expiry) {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 86400000; // Default 1 day
    return parseInt(match[1], 10) * units[match[2]];
  }
}

module.exports = new AuthenticationService();
