"use strict";

/**
 * Request Logging Middleware
 * Logs all incoming requests with timing information.
 * Demonstrates Event Emitter pattern for audit logging.
 */

const { EventEmitter } = require("events");
const logger = require("../utils/logger");
const { generateId } = require("../utils/helpers");

/**
 * Audit Event Emitter
 * Emits events for request lifecycle tracking.
 * Listeners can perform async operations (DB logging, analytics) without blocking response.
 */
class RequestAuditEmitter extends EventEmitter {}

const auditEmitter = new RequestAuditEmitter();

// Listener: Log completed requests for audit trail
auditEmitter.on("requestCompleted", (auditData) => {
  logger.debug("Audit Trail:", auditData);
});

// Listener: Track slow requests
auditEmitter.on("requestCompleted", (auditData) => {
  if (auditData.responseTime > 3000) {
    logger.warn("Slow Request Detected:", {
      path: auditData.path,
      method: auditData.method,
      responseTime: `${auditData.responseTime}ms`,
    });
  }
});

/**
 * Request tracking middleware.
 * Assigns a unique request ID and measures response time.
 */
const requestTracker = (req, res, next) => {
  const requestId = generateId();
  const startTime = Date.now();

  // Attach request ID for correlation
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  // Log incoming request
  logger.info(`→ ${req.method} ${req.path}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });

  // Capture response finish event
  res.on("finish", () => {
    const responseTime = Date.now() - startTime;

    logger.info(`← ${req.method} ${req.path} ${res.statusCode} (${responseTime}ms)`, {
      requestId,
      statusCode: res.statusCode,
      responseTime,
    });

    // Emit audit event (non-blocking)
    auditEmitter.emit("requestCompleted", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      responseTime,
      userId: req.user ? req.user.userId : null,
      timestamp: new Date().toISOString(),
    });
  });

  next();
};

module.exports = { requestTracker, auditEmitter };
