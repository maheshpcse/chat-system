"use strict";

/**
 * Global Error Handler Middleware
 * Catches all errors and formats consistent error responses.
 * Distinguishes between operational and programming errors.
 */

const logger = require("../utils/logger");
const { AppError } = require("../utils/errors");
const { sendError } = require("../utils/response");

/**
 * Central error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errors = err.errors || null;

  // Log error details
  if (statusCode >= 500) {
    logger.error("Server Error:", {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  } else {
    logger.warn("Client Error:", {
      message: err.message,
      statusCode,
      path: req.path,
      method: req.method,
    });
  }

  // In production, hide internal error details
  if (process.env.APP_ENV === "production" && !(err instanceof AppError)) {
    statusCode = 500;
    message = "An unexpected error occurred";
    errors = null;
  }

  // Handle specific database errors
  if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "A record with this information already exists";
  }

  if (err.code === "ER_NO_REFERENCED_ROW_2") {
    statusCode = 400;
    message = "Referenced resource does not exist";
  }

  return sendError(res, statusCode, message, errors);
};

/**
 * Handles 404 Not Found for unmatched routes.
 * Should be registered after all routes.
 */
const notFoundHandler = (req, res) => {
  return sendError(res, 404, `Route ${req.method} ${req.path} not found`);
};

module.exports = { errorHandler, notFoundHandler };
