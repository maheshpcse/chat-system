"use strict";

/**
 * MongoDB Schemas - Analytics Service
 *
 * Collections Purpose:
 * 1. messageArchives - Long-term chat message storage and full-text search
 * 2. analyticsEvents - User activity tracking and analytics
 * 3. auditLogs - System audit trail for compliance
 * 4. chatMetrics - Aggregated chat metrics (daily/hourly)
 * 5. searchIndex - Optimized message search collection
 */

const mongoose = require("mongoose");
const { Schema } = mongoose;

// ============================================================
// Collection: messageArchives
// Purpose: Long-term storage of chat messages for search/history
// ============================================================
const messageArchiveSchema = new Schema(
  {
    originalMessageId: { type: String, required: true, unique: true, index: true },
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    senderName: { type: String, required: true },
    content: { type: String, required: true },
    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "video", "system"],
      default: "text",
    },
    attachmentUrl: { type: String, default: null },
    metadata: {
      wordCount: { type: Number, default: 0 },
      hasAttachment: { type: Boolean, default: false },
      language: { type: String, default: "en" },
    },
    participants: [{ type: String }],
    groupId: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    originalCreatedAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: "messageArchives",
  }
);

// Text index for full-text search
messageArchiveSchema.index({ content: "text", senderName: "text" });
// Compound index for conversation history queries
messageArchiveSchema.index({ conversationId: 1, originalCreatedAt: -1 });
// TTL index - auto-delete after 2 years
messageArchiveSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

// ============================================================
// Collection: analyticsEvents
// Purpose: Track user activities for analytics dashboards
// ============================================================
const analyticsEventSchema = new Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        "userRegistered",
        "userLoggedIn",
        "userLoggedOut",
        "messageSent",
        "messageRead",
        "fileUploaded",
        "groupCreated",
        "groupJoined",
        "groupLeft",
        "profileUpdated",
        "conversationCreated",
      ],
      index: true,
    },
    userId: { type: String, required: true, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    sessionId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: "analyticsEvents",
  }
);

// Compound index for user activity queries
analyticsEventSchema.index({ userId: 1, eventType: 1, timestamp: -1 });
// TTL index - auto-delete after 1 year
analyticsEventSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

// ============================================================
// Collection: auditLogs
// Purpose: Compliance and security audit trail
// ============================================================
const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    module: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    targetId: { type: String, default: null },
    targetType: { type: String, default: null },
    changes: {
      before: { type: Schema.Types.Mixed, default: null },
      after: { type: Schema.Types.Mixed, default: null },
    },
    requestId: { type: String, default: null },
    ipAddress: { type: String, default: null },
    result: { type: String, enum: ["success", "failure", "error"], default: "success" },
    errorMessage: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    collection: "auditLogs",
  }
);

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
// Retain audit logs for 5 years
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 157680000 });

// ============================================================
// Collection: chatMetrics
// Purpose: Pre-aggregated metrics for dashboards
// ============================================================
const chatMetricSchema = new Schema(
  {
    metricType: {
      type: String,
      required: true,
      enum: ["daily", "hourly", "weekly", "monthly"],
    },
    period: { type: String, required: true }, // e.g., "2024-01-15", "2024-01-15T14"
    metrics: {
      totalMessages: { type: Number, default: 0 },
      totalUsers: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
      newRegistrations: { type: Number, default: 0 },
      fileUploads: { type: Number, default: 0 },
      groupsCreated: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 },
    },
    topConversations: [
      {
        conversationId: String,
        messageCount: Number,
      },
    ],
    messagesByType: {
      text: { type: Number, default: 0 },
      image: { type: Number, default: 0 },
      file: { type: Number, default: 0 },
      audio: { type: Number, default: 0 },
      video: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    collection: "chatMetrics",
  }
);

chatMetricSchema.index({ metricType: 1, period: 1 }, { unique: true });

// ============================================================
// Export Models
// ============================================================
const MessageArchive = mongoose.model("MessageArchive", messageArchiveSchema);
const AnalyticsEvent = mongoose.model("AnalyticsEvent", analyticsEventSchema);
const AuditLog = mongoose.model("AuditLog", auditLogSchema);
const ChatMetric = mongoose.model("ChatMetric", chatMetricSchema);

module.exports = {
  MessageArchive,
  AnalyticsEvent,
  AuditLog,
  ChatMetric,
};
