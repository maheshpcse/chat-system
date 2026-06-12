"use strict";

/**
 * Socket.IO Event Handler
 * Manages real-time WebSocket connections for the chat application.
 * Handles: connection, messaging, typing indicators, online status, read receipts.
 */

const jwt = require("jsonwebtoken");
const { config } = require("../config/environment");
const { getRedisClient } = require("../config/redis");
const { SOCKET_EVENTS, REDIS_KEYS, REDIS_TTL } = require("../utils/constants");
const logger = require("../utils/logger");

/**
 * Initializes all socket event handlers.
 * @param {Object} io - Socket.IO server instance
 */
const initializeSocketHandlers = (io) => {
  // Authenticate socket connections via JWT
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      socket.userId = decoded.userId;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info(`Socket connected: ${socket.userId}`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // Set user online status
    handleUserOnline(socket);

    // Event handlers
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => handleJoinRoom(socket, data));
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) => handleLeaveRoom(socket, data));
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => handleSendMessage(io, socket, data));
    socket.on(SOCKET_EVENTS.TYPING_START, (data) => handleTyping(socket, data, true));
    socket.on(SOCKET_EVENTS.TYPING_STOP, (data) => handleTyping(socket, data, false));
    socket.on(SOCKET_EVENTS.MESSAGE_READ, (data) => handleMessageRead(io, socket, data));

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, () => handleDisconnect(io, socket));
  });
};

/**
 * Marks user as online in Redis and notifies contacts.
 */
const handleUserOnline = async (socket) => {
  const redis = getRedisClient();
  await redis.setex(`${REDIS_KEYS.USER_ONLINE}${socket.userId}`, REDIS_TTL.ONLINE_STATUS, "1");

  // Broadcast online status to user's conversations
  socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
    userId: socket.userId,
    timestamp: Date.now(),
  });
};

/**
 * Joins a user to a conversation room.
 */
const handleJoinRoom = (socket, { conversationId }) => {
  if (!conversationId) return;
  socket.join(`conversation:${conversationId}`);
  logger.debug(`User ${socket.userId} joined room: ${conversationId}`);
};

/**
 * Removes a user from a conversation room.
 */
const handleLeaveRoom = (socket, { conversationId }) => {
  if (!conversationId) return;
  socket.leave(`conversation:${conversationId}`);
  logger.debug(`User ${socket.userId} left room: ${conversationId}`);
};

/**
 * Handles real-time message broadcast.
 * Message is persisted via REST API; this only handles broadcasting.
 */
const handleSendMessage = (io, socket, messageData) => {
  const { conversationId, message } = messageData;
  if (!conversationId || !message) return;

  // Broadcast to all participants in the conversation except sender
  socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, {
    ...message,
    senderId: socket.userId,
    conversationId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Handles typing indicator events.
 */
const handleTyping = (socket, { conversationId }, isTyping) => {
  if (!conversationId) return;

  const event = isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP;
  socket.to(`conversation:${conversationId}`).emit(event, {
    userId: socket.userId,
    conversationId,
  });
};

/**
 * Handles read receipt notifications.
 */
const handleMessageRead = (io, socket, { conversationId, messageId }) => {
  if (!conversationId) return;

  socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
    userId: socket.userId,
    conversationId,
    messageId,
    readAt: new Date().toISOString(),
  });
};

/**
 * Handles user disconnection.
 */
const handleDisconnect = async (io, socket) => {
  const redis = getRedisClient();
  await redis.del(`${REDIS_KEYS.USER_ONLINE}${socket.userId}`);

  // Broadcast offline status
  socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
    userId: socket.userId,
    timestamp: Date.now(),
  });

  logger.info(`Socket disconnected: ${socket.userId}`);
};

module.exports = { initializeSocketHandlers };
