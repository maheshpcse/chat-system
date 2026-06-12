"use strict";

/**
 * Notification Service
 * Demonstrates Event Emitter pattern for decoupled notification delivery.
 * Uses CLOSURE to maintain notification configuration per channel.
 */

const { EventEmitter } = require("events");
const { getIO } = require("../../config/socket");
const { getRedisClient } = require("../../config/redis");
const logger = require("../../utils/logger");

class NotificationEmitter extends EventEmitter {}

const notificationEmitter = new NotificationEmitter();

/**
 * Creates a notification sender configured for a specific channel.
 * CLOSURE pattern - captures channel configuration in the returned function.
 *
 * @param {string} channel - Notification channel type
 * @returns {Function} Configured notification sender
 */
const createNotificationSender = (channel) => {
  const channelConfig = {
    socket: { persistent: false, realtime: true },
    push: { persistent: true, realtime: true },
    email: { persistent: true, realtime: false },
  };

  const settings = channelConfig[channel] || channelConfig.socket;

  // CLOSURE: settings is captured here
  return async (userId, notification) => {
    const payload = {
      ...notification,
      channel,
      timestamp: new Date().toISOString(),
      persistent: settings.persistent,
    };

    if (settings.realtime) {
      notificationEmitter.emit("send", userId, payload);
    }

    if (settings.persistent) {
      notificationEmitter.emit("persist", userId, payload);
    }

    return payload;
  };
};

// Listener: Send real-time socket notification
notificationEmitter.on("send", (userId, payload) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification", payload);
  } catch (error) {
    logger.error("Socket notification failed:", error.message);
  }
});

// Listener: Persist notification to Redis for offline users
notificationEmitter.on("persist", async (userId, payload) => {
  try {
    const redis = getRedisClient();
    const key = `notifications:${userId}`;
    await redis.lpush(key, JSON.stringify(payload));
    await redis.ltrim(key, 0, 99); // Keep last 100 notifications
    await redis.expire(key, 86400 * 7); // 7 days
  } catch (error) {
    logger.error("Notification persistence failed:", error.message);
  }
});

// Pre-configured senders for different channels
const sendSocketNotification = createNotificationSender("socket");
const sendPushNotification = createNotificationSender("push");

/**
 * Sends a chat notification to a user.
 */
const notifyNewMessage = async (recipientId, message) => {
  await sendSocketNotification(recipientId, {
    type: "newMessage",
    title: "New Message",
    body: message.content.substring(0, 100),
    data: {
      conversationId: message.conversationId,
      messageId: message.messageId,
      senderId: message.senderId,
    },
  });
};

/**
 * Sends a typing indicator notification.
 */
const notifyTyping = (recipientId, conversationId, senderId, isTyping) => {
  try {
    const io = getIO();
    io.to(`user:${recipientId}`).emit(isTyping ? "typingStart" : "typingStop", {
      conversationId,
      userId: senderId,
    });
  } catch (error) {
    logger.error("Typing notification failed:", error.message);
  }
};

module.exports = {
  notificationEmitter,
  createNotificationSender,
  notifyNewMessage,
  notifyTyping,
  sendSocketNotification,
  sendPushNotification,
};
