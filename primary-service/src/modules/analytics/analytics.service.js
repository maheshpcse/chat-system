"use strict";

/**
 * Analytics Service Client
 * Sends analytics events to the Analytics Microservice (MongoDB).
 * Uses event-driven approach - analytics should never block chat operations.
 */

const { EventEmitter } = require("events");
const logger = require("../../utils/logger");

class AnalyticsCollector extends EventEmitter {
  constructor() {
    super();
    this.analyticsServiceUrl = process.env.ANALYTICS_SERVICE_URL || "http://localhost:3001";
    this.setupListeners();
  }

  setupListeners() {
    this.on("track", async (eventData) => {
      try {
        // In production, send to analytics service via HTTP
        // await fetch(`${this.analyticsServiceUrl}/api/events`, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(eventData),
        // });
        logger.debug("Analytics event tracked:", eventData.eventType);
      } catch (error) {
        logger.error("Analytics tracking failed:", error.message);
      }
    });
  }

  trackEvent(eventType, userId, metadata = {}) {
    this.emit("track", {
      eventType,
      userId,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  trackMessageSent(userId, conversationId, messageType) {
    this.trackEvent("messageSent", userId, { conversationId, messageType });
  }

  trackUserLogin(userId, ipAddress) {
    this.trackEvent("userLoggedIn", userId, { ipAddress });
  }

  trackFileUpload(userId, fileSize, mimeType) {
    this.trackEvent("fileUploaded", userId, { fileSize, mimeType });
  }

  trackGroupCreated(userId, groupId, memberCount) {
    this.trackEvent("groupCreated", userId, { groupId, memberCount });
  }
}

module.exports = new AnalyticsCollector();
