"use strict";

/**
 * Socket.IO Event Handler
 * Manages real-time WebSocket connections for the chat application.
 * Supports multiple tabs/devices per user with proper presence tracking.
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
    logger.info(`Socket connected: ${socket.userId} (${socket.id})`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // Set user online status (supports multiple tabs)
    handleUserOnline(io, socket);

    // Event handlers
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => handleJoinRoom(socket, data));
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) => handleLeaveRoom(socket, data));
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => handleSendMessage(io, socket, data));
    socket.on(SOCKET_EVENTS.TYPING_START, (data) => handleTyping(io, socket, data, true));
    socket.on(SOCKET_EVENTS.TYPING_STOP, (data) => handleTyping(io, socket, data, false));
    socket.on(SOCKET_EVENTS.MESSAGE_READ, (data) => handleMessageRead(io, socket, data));
    socket.on("get_online_users", () => handleGetOnlineUsers(socket));

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, () => handleDisconnect(io, socket));
  });
};

/**
 * Marks user as online. Tracks active socket count per user.
 * Only broadcasts "online" if user was previously offline (first socket).
 */
const handleUserOnline = async (io, socket) => {
  const redis = getRedisClient();
  const sessionKey = `${REDIS_KEYS.USER_SESSIONS}${socket.userId}`;

  // Increment active socket count
  const count = await redis.incr(sessionKey);
  await redis.expire(sessionKey, REDIS_TTL.ONLINE_STATUS);

  // Mark user as online
  await redis.setex(`${REDIS_KEYS.USER_ONLINE}${socket.userId}`, REDIS_TTL.ONLINE_STATUS, "1");

  // Store last connected time
  await redis.set(`user:lastSeen:${socket.userId}`, new Date().toISOString());

  // Only broadcast if this is the first socket (was offline, now online)
  if (count === 1) {
    socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
      userId: socket.userId,
      timestamp: Date.now(),
    });
    logger.info(`User ${socket.userId} is now ONLINE (first socket)`);
  }

  // Send current online users to the newly connected user
  await sendOnlineUsersToSocket(socket, redis);
};

/**
 * Sends current online users list to a socket.
 */
const sendOnlineUsersToSocket = async (socket, redis) => {
  try {
    const keys = await redis.keys(`${REDIS_KEYS.USER_ONLINE}*`);
    const onlineUserIds = keys.map((key) => key.replace(REDIS_KEYS.USER_ONLINE, ""));
    socket.emit("online_users_list", onlineUserIds);
  } catch (error) {
    logger.error("Error sending online users:", error);
  }
};

/**
 * Handles get_online_users request.
 */
const handleGetOnlineUsers = async (socket) => {
  const redis = getRedisClient();
  await sendOnlineUsersToSocket(socket, redis);
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
 */
const handleSendMessage = (io, socket, messageData) => {
  const { conversationId } = messageData;
  if (!conversationId) return;

  io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, {
    ...messageData,
    senderId: messageData.senderId || socket.userId,
    timestamp: messageData.createdAt || new Date().toISOString(),
  });
};

/**
 * Handles typing indicator events with auto-expiry.
 * Typing is broadcast only to conversation participants (excluding sender).
 */
const handleTyping = async (io, socket, { conversationId }, isTyping) => {
  if (!conversationId) return;

  const redis = getRedisClient();
  const typingKey = `${REDIS_KEYS.TYPING_INDICATOR}${conversationId}:${socket.userId}`;

  if (isTyping) {
    // Set typing with 5-second auto-expiry
    await redis.setex(typingKey, 5, "1");
  } else {
    await redis.del(typingKey);
  }

  const event = isTyping ? SOCKET_EVENTS.TYPING_START : SOCKET_EVENTS.TYPING_STOP;
  socket.to(`conversation:${conversationId}`).emit(event, {
    userId: socket.userId,
    conversationId,
    isTyping,
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
 * Only marks user offline when ALL sockets are disconnected (supports multiple tabs).
 */
const handleDisconnect = async (io, socket) => {
  const redis = getRedisClient();
  const sessionKey = `${REDIS_KEYS.USER_SESSIONS}${socket.userId}`;

  // Decrement active socket count
  const count = await redis.decr(sessionKey);

  // Update last seen
  await redis.set(`user:lastSeen:${socket.userId}`, new Date().toISOString());

  // Only mark offline if no more active sockets
  if (count <= 0) {
    await redis.del(sessionKey);
    await redis.del(`${REDIS_KEYS.USER_ONLINE}${socket.userId}`);

    // Broadcast offline status
    socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
      userId: socket.userId,
      lastSeen: new Date().toISOString(),
    });

    logger.info(`User ${socket.userId} is now OFFLINE (all sockets disconnected)`);
  } else {
    logger.debug(`User ${socket.userId} disconnected one tab (${count} remaining)`);
  }
};

module.exports = { initializeSocketHandlers };
