"use strict";

/**
 * JavaScript Patterns - Real Business Usage
 * Demonstrates Currying, Closures, Higher Order Functions,
 * Promises, Async/Await, and Event Emitters in REAL chat application contexts.
 *
 * These are NOT artificial examples. Each pattern solves a real problem
 * within the chat application domain.
 */

// ============================================================
// 1. CURRYING - Permission Validation
// ============================================================

/**
 * Curried permission checker.
 * First call configures the resource type, second call checks the action,
 * third call performs the actual check against a user.
 *
 * REAL USE: Called in route middleware to validate user permissions
 * before accessing chat resources.
 *
 * @example
 * const canAccessGroup = checkPermission("group")("read");
 * const hasAccess = canAccessGroup(currentUser);
 */
const checkPermission = (resource) => (action) => (user) => {
  const permissions = {
    admin: { chat: ["read", "write", "delete", "manage"], group: ["read", "write", "delete", "manage"] },
    moderator: { chat: ["read", "write", "delete"], group: ["read", "write"] },
    user: { chat: ["read", "write"], group: ["read"] },
  };

  const rolePermissions = permissions[user.role];
  if (!rolePermissions) return false;

  const resourcePermissions = rolePermissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
};

/**
 * Curried query builder for constructing database filter conditions.
 * Each curried level adds a filter condition.
 *
 * REAL USE: Building dynamic stored procedure parameters for message filtering.
 */
const buildMessageFilter = (conversationId) => (messageType) => (dateRange) => {
  return {
    conversationId,
    messageType: messageType || null,
    startDate: dateRange ? dateRange.start : null,
    endDate: dateRange ? dateRange.end : null,
  };
};

// ============================================================
// 2. CLOSURES - Rate Limiting & Throttling
// ============================================================

/**
 * Creates a message throttler using closures.
 * The internal state (messageTimestamps) is enclosed and private.
 *
 * REAL USE: Prevents users from flooding a conversation with messages.
 * Each conversation gets its own throttler instance.
 */
const createMessageThrottler = (maxMessages, windowMs) => {
  // CLOSURE: messageTimestamps is private, persists across calls
  const messageTimestamps = new Map();

  return (userId) => {
    const now = Date.now();
    const userTimestamps = messageTimestamps.get(userId) || [];

    // Remove expired timestamps
    const validTimestamps = userTimestamps.filter((ts) => now - ts < windowMs);

    if (validTimestamps.length >= maxMessages) {
      return { allowed: false, retryAfter: windowMs - (now - validTimestamps[0]) };
    }

    validTimestamps.push(now);
    messageTimestamps.set(userId, validTimestamps);

    return { allowed: true, remaining: maxMessages - validTimestamps.length };
  };
};

/**
 * Creates an audit logger with enclosed context.
 * The logger retains the module context across all log calls.
 *
 * REAL USE: Each module creates its own audit logger that automatically
 * includes the module name and version in every log entry.
 */
const createAuditLogger = (moduleName, version = "1.0") => {
  // CLOSURE: moduleName and version are captured
  const logs = [];
  let sequenceNumber = 0;

  return {
    log: (action, userId, details = {}) => {
      sequenceNumber += 1;
      const entry = {
        sequence: sequenceNumber,
        module: moduleName,
        version,
        action,
        userId,
        details,
        timestamp: new Date().toISOString(),
      };
      logs.push(entry);
      return entry;
    },
    getRecent: (count = 10) => logs.slice(-count),
    getCount: () => logs.length,
    clear: () => { logs.length = 0; sequenceNumber = 0; },
  };
};

// ============================================================
// 3. HIGHER ORDER FUNCTIONS - Query Filtering & Transformation
// ============================================================

/**
 * Creates a message transformer pipeline.
 * Composes multiple transformation functions.
 *
 * REAL USE: Processing messages before sending to client.
 * Different transformations applied based on user role and settings.
 */
const createMessagePipeline = (...transformers) => {
  return (messages) => transformers.reduce((result, transformer) => result.map(transformer), messages);
};

// Transformer functions for the pipeline
const sanitizeContent = (message) => ({
  ...message,
  content: message.content.replace(/<script[^>]*>.*?<\/script>/gi, ""),
});

const addReadStatus = (message) => ({
  ...message,
  isRead: message.status === "read",
});

const formatTimestamp = (message) => ({
  ...message,
  formattedTime: new Date(message.createdAt).toLocaleTimeString(),
});

/**
 * Higher Order Function that wraps async service methods with error handling.
 * Eliminates repetitive try/catch in controllers.
 *
 * REAL USE: Applied to all controller methods for consistent error forwarding.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Creates a retry wrapper for unreliable operations.
 * HOF that adds retry logic to any async function.
 *
 * REAL USE: Wrapping Redis operations, external API calls, S3 uploads.
 */
const withRetry = (fn, maxRetries = 3, delayMs = 1000) => {
  return async (...args) => {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    throw lastError;
  };
};

// ============================================================
// 4. PROMISES & ASYNC/AWAIT - Parallel Operations
// ============================================================

/**
 * Loads full conversation context using parallel async operations.
 * Demonstrates Promise.all for independent data fetching.
 *
 * REAL USE: When opening a chat, we need messages, participants, and settings
 * simultaneously - no need to wait for each sequentially.
 */
const loadConversationContext = async (conversationId, userId, deps) => {
  const { messageRepo, conversationRepo, userRepo, cacheService } = deps;

  // Parallel data fetching - all independent operations
  const [messages, conversation, participants, unreadCount] = await Promise.all([
    messageRepo.getMessages(conversationId, 50, 0, null),
    conversationRepo.getConversationById(conversationId, userId),
    conversationRepo.getParticipants(conversationId),
    messageRepo.getUnreadCount(userId),
  ]);

  return { messages, conversation, participants, unreadCount };
};

/**
 * Promise-based batch processor.
 * Processes items in configurable batch sizes to avoid overwhelming resources.
 *
 * REAL USE: Sending notifications to all group members in batches.
 */
const processBatch = async (items, batchSize, processor) => {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
};

// ============================================================
// 5. EVENT EMITTERS - Chat Event System
// ============================================================

const { EventEmitter } = require("events");

/**
 * Chat Event Bus
 * Decouples chat actions from their side effects.
 *
 * REAL USE: When a message is sent, multiple things happen:
 * - Notification to recipient
 * - Cache update
 * - Analytics tracking
 * - Read receipt update
 * None of these should block the message send response.
 */
class ChatEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
  }

  emitMessageSent(messageData) {
    this.emit("messageSent", messageData);
  }

  emitUserJoined(conversationId, userId) {
    this.emit("userJoined", { conversationId, userId, timestamp: Date.now() });
  }

  emitUserLeft(conversationId, userId) {
    this.emit("userLeft", { conversationId, userId, timestamp: Date.now() });
  }

  emitMessageRead(conversationId, userId, messageId) {
    this.emit("messageRead", { conversationId, userId, messageId });
  }
}

const chatEventBus = new ChatEventBus();

module.exports = {
  // Currying
  checkPermission,
  buildMessageFilter,

  // Closures
  createMessageThrottler,
  createAuditLogger,

  // Higher Order Functions
  createMessagePipeline,
  sanitizeContent,
  addReadStatus,
  formatTimestamp,
  asyncHandler,
  withRetry,

  // Promises & Async/Await
  loadConversationContext,
  processBatch,

  // Event Emitters
  ChatEventBus,
  chatEventBus,
};
