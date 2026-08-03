"use strict";

/**
 * Admin Auth Service
 * Login / refresh / logout for dedicated admin identity.
 * Tokens use admin secrets + claim type: 'admin'.
 */

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { config } = require("../../config/environment");
const adminAuthRepository = require("./admin-auth.repository");
const { UnauthorizedError } = require("../../utils/errors");
const logger = require("../../utils/logger");

class AdminAuthService {
  async login(email, password) {
    const admin = await adminAuthRepository.findAdminByEmail(email);
    if (!admin) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (admin.status !== "active") {
      throw new UnauthorizedError("Admin account is not active");
    }

    const tokens = await this.generateTokenPair(admin.adminId, admin.email, admin.role);
    await adminAuthRepository.updateLastLogin(admin.adminId);

    logger.info("Admin logged in", { adminId: admin.adminId, email: admin.email });

    return {
      admin: {
        adminId: admin.adminId,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new UnauthorizedError("Refresh token is required");
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, config.jwt.adminRefreshSecret);
    } catch (err) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    if (payload.type !== "admin" || !payload.adminId) {
      throw new UnauthorizedError("Invalid admin refresh token");
    }

    const stored = await adminAuthRepository.findRefreshToken(payload.adminId, refreshToken);
    if (!stored) {
      throw new UnauthorizedError("Refresh token revoked or not found");
    }

    const admin = await adminAuthRepository.findAdminById(payload.adminId);
    if (!admin || admin.status !== "active") {
      throw new UnauthorizedError("Admin account is not active");
    }

    // Rotate: revoke old refresh token
    await adminAuthRepository.revokeRefreshToken(payload.adminId, refreshToken);

    const tokens = await this.generateTokenPair(admin.adminId, admin.email, admin.role);

    return {
      admin: {
        adminId: admin.adminId,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
      ...tokens,
    };
  }

  async logout(adminId, refreshToken) {
    if (refreshToken) {
      await adminAuthRepository.revokeRefreshToken(adminId, refreshToken);
    } else {
      await adminAuthRepository.revokeAllRefreshTokens(adminId);
    }
    logger.info("Admin logged out", { adminId });
  }

  async me(adminId) {
    const admin = await adminAuthRepository.findAdminById(adminId);
    if (!admin) {
      throw new UnauthorizedError("Admin not found");
    }
    return {
      adminId: admin.adminId,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: admin.role,
      status: admin.status,
      lastLoginAt: admin.lastLoginAt,
    };
  }

  async generateTokenPair(adminId, email, role) {
    const accessToken = jwt.sign(
      { adminId, email, role, type: "admin" },
      config.jwt.adminSecret,
      { expiresIn: config.jwt.adminExpiry }
    );

    const refreshToken = jwt.sign(
      { adminId, email, role, type: "admin" },
      config.jwt.adminRefreshSecret,
      { expiresIn: config.jwt.adminRefreshExpiry }
    );

    const expiryDate = new Date(Date.now() + this.parseExpiry(config.jwt.adminRefreshExpiry));
    const expiresAt = expiryDate.toISOString().slice(0, 19).replace("T", " ");

    await adminAuthRepository.storeRefreshToken(adminId, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  parseExpiry(expiry) {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = String(expiry).match(/^(\d+)([smhd])$/);
    if (!match) return 86400000;
    return parseInt(match[1], 10) * units[match[2]];
  }
}

module.exports = new AdminAuthService();
