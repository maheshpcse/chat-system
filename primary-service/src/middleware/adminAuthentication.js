"use strict";

/**
 * Admin Authentication Middleware
 * Validates admin JWT tokens only (claim type === 'admin').
 * Uses separate secrets from chat-user tokens.
 */

const jwt = require("jsonwebtoken");
const { config } = require("../config/environment");
const { UnauthorizedError, ForbiddenError } = require("../utils/errors");

/**
 * Verifies Bearer token against admin JWT secret and type claim.
 * Attaches decoded payload to req.admin.
 */
const authenticateAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Admin access token is required");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Invalid token format");
    }

    const decoded = jwt.verify(token, config.jwt.adminSecret);

    if (decoded.type !== "admin") {
      throw new ForbiddenError("Admin token required");
    }

    req.admin = {
      adminId: decoded.adminId,
      email: decoded.email,
      role: decoded.role,
      type: decoded.type,
    };
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Admin token has expired"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new UnauthorizedError("Invalid admin token"));
    }
    next(error);
  }
};

/**
 * Restricts route to one or more admin roles (e.g. super_admin).
 */
const authorizeAdmin = (...roles) => (req, res, next) => {
  if (!req.admin) {
    return next(new UnauthorizedError("Admin authentication required"));
  }
  if (roles.length && !roles.includes(req.admin.role)) {
    return next(new ForbiddenError("Insufficient admin privileges"));
  }
  next();
};

module.exports = { authenticateAdmin, authorizeAdmin };
