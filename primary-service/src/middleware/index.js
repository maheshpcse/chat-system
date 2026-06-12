"use strict";

/**
 * Middleware Index
 * Central export for all middleware modules.
 */

const { authenticate, optionalAuth } = require("./authentication");
const { authorize, authorizeOwnerOrAdmin } = require("./authorization");
const { validate } = require("./validation");
const { errorHandler, notFoundHandler } = require("./errorHandler");
const { requestTracker, auditEmitter } = require("./requestTracker");
const { generalLimiter, authLimiter, messageLimiter, uploadLimiter } = require("./rateLimiter");
const { uploadLocal, uploadToMemory } = require("./fileUpload");

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  authorizeOwnerOrAdmin,
  validate,
  errorHandler,
  notFoundHandler,
  requestTracker,
  auditEmitter,
  generalLimiter,
  authLimiter,
  messageLimiter,
  uploadLimiter,
  uploadLocal,
  uploadToMemory,
};
