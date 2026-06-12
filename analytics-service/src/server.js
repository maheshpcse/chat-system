"use strict";

/**
 * Analytics Service - Server Entry Point
 * Connects to MongoDB and exposes endpoints for:
 * - Message archival
 * - Full-text search
 * - Analytics queries
 * - Audit log retrieval
 */

const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const PORT = process.env.ANALYTICS_PORT || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/chat_analytics";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => console.log("MongoDB connected - Analytics Service"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Import models
const { MessageArchive, AnalyticsEvent, AuditLog, ChatMetric } = require("./models");

// =============================================
// Routes
// =============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, service: "analytics", timestamp: new Date().toISOString() });
});

// Archive a message
app.post("/api/messages/archive", async (req, res, next) => {
  try {
    const archive = await MessageArchive.create(req.body);
    res.status(201).json({ success: true, data: archive });
  } catch (error) {
    next(error);
  }
});

// Search messages (full-text)
app.get("/api/messages/search", async (req, res, next) => {
  try {
    const { query, conversationId, page = 1, limit = 20 } = req.query;
    const filter = { $text: { $search: query } };

    if (conversationId) {
      filter.conversationId = conversationId;
    }

    const messages = await MessageArchive.find(filter, { score: { $meta: "textScore" } })
      .sort({ score: { $meta: "textScore" } })
      .skip((page - 1) * limit)
      .limit(parseInt(limit, 10));

    const total = await MessageArchive.countDocuments(filter);

    res.json({ success: true, data: messages, meta: { total, page: parseInt(page, 10), limit: parseInt(limit, 10) } });
  } catch (error) {
    next(error);
  }
});

// Track analytics event
app.post("/api/events", async (req, res, next) => {
  try {
    const event = await AnalyticsEvent.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    next(error);
  }
});

// Get user activity
app.get("/api/events/user/:userId", async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { eventType, startDate, endDate, limit = 50 } = req.query;

    const filter = { userId };
    if (eventType) filter.eventType = eventType;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const events = await AnalyticsEvent.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10));

    res.json({ success: true, data: events });
  } catch (error) {
    next(error);
  }
});

// Create audit log
app.post("/api/audit", async (req, res, next) => {
  try {
    const log = await AuditLog.create(req.body);
    res.status(201).json({ success: true, data: log });
  } catch (error) {
    next(error);
  }
});

// Get metrics
app.get("/api/metrics/:metricType/:period", async (req, res, next) => {
  try {
    const { metricType, period } = req.params;
    const metric = await ChatMetric.findOne({ metricType, period });
    res.json({ success: true, data: metric });
  } catch (error) {
    next(error);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.listen(PORT, () => {
  console.log(`Analytics Service running on port ${PORT}`);
});
