"use strict";

/**
 * Authentication Middleware
 * Validates JWT tokens from request headers.
 * Attaches decoded user data to req.user for downstream handlers.
 */

const jwt = require("jsonwebtoken");
const { config } = require("../config/environment");
const { UnauthorizedError } = require("../utils/errors");
const logger = require("../utils/logger");

/**
 * Verifies the access token from the Authorization header.
 * Token format: "Bearer <token>"
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Access token is required");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw new UnauthorizedError("Invalid token format");
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new UnauthorizedError("Token has expired"));
    }
    if (error.name === "JsonWebTokenError") {
      return next(new UnauthorizedError("Invalid token"));
    }
    next(error);
  }
};

/**
 * Optional authentication - does not fail if token is missing.
 * Useful for routes that work differently for authenticated vs anonymous users.
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = decoded;
    }
    next();
  } catch (error) {
    logger.debug("Optional auth: token invalid, proceeding without user");
    next();
  }
};

module.exports = { authenticate, optionalAuth };
