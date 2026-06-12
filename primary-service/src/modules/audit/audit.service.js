"use strict";

/**
 * Audit Service
 * Tracks important application events for compliance and debugging.
 * Sends audit data to the Analytics Service (MongoDB).
 */

const logger = require("../../utils/logger");

/**
 * Creates an audit trail entry.
 * In production, this would send to the Analytics Service via HTTP or SQS.
 *
 * @param {string} action - Action performed
 * @param {string} module - Module name
 * @param {string} userId - User who performed the action
 * @param {Object} details - Additional details
 */
const createAuditEntry = async (action, module, userId, details = {}) => {
  const entry = {
    action,
    module,
    userId,
    targetId: details.targetId || null,
    targetType: details.targetType || null,
    changes: details.changes || null,
    requestId: details.requestId || null,
    ipAddress: details.ipAddress || null,
    result: details.result || "success",
    timestamp: new Date().toISOString(),
  };

  // In production: send to analytics service
  // await axios.post(`${ANALYTICS_URL}/api/audit`, entry);

  logger.info("Audit:", entry);
  return entry;
};

/**
 * Audit middleware factory (HIGHER ORDER FUNCTION).
 * Creates middleware that automatically logs the action.
 *
 * @param {string} action - Action name to log
 * @param {string} module - Module context
 * @returns {Function} Express middleware
 */
const auditAction = (action, module) => {
  return (req, res, next) => {
    // Log after response is sent (non-blocking)
    res.on("finish", () => {
      if (res.statusCode < 400) {
        createAuditEntry(action, module, req.user ? req.user.userId : "anonymous", {
          requestId: req.requestId,
          ipAddress: req.ip,
          result: "success",
        });
      }
    });
    next();
  };
};

module.exports = { createAuditEntry, auditAction };
