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
const messageService = require("../modules/message/message.service");
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
      // Optional claims if present on newer tokens
      socket.userFirstName = decoded.firstName || decoded.first_name || null;
      socket.userLastName = decoded.lastName || decoded.last_name || null;
      next();
    } catch (error) {
      next(new Error("Invalid token"));
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    logger.info(`Socket connected: ${socket.userId} (${socket.id})`);

    // Join user's personal room for direct notifications
    socket.join(`user:${socket.userId}`);

    // Resolve First+Last for typing / presence labels (async, non-blocking for next())
    resolveSocketDisplayName(socket).catch(() => {});

    // Set user online status (supports multiple tabs)
    handleUserOnline(io, socket);

    // Event handlers
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data) => handleJoinRoom(socket, data));
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) => handleLeaveRoom(socket, data));
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, (data) => handleSendMessage(io, socket, data));
    socket.on(SOCKET_EVENTS.TYPING_START, (data) => handleTyping(io, socket, data, true));
    socket.on(SOCKET_EVENTS.TYPING_STOP, (data) => handleTyping(io, socket, data, false));
    socket.on(SOCKET_EVENTS.MESSAGE_READ, (data) => handleMessageRead(io, socket, data));
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, (data) => handleMessageDelivered(io, socket, data));
    socket.on("get_online_users", () => handleGetOnlineUsers(socket));
    // Keep Redis online TTL alive while socket stays open
    socket.on("presence_heartbeat", () => handlePresenceHeartbeat(socket));

    // Disconnect handler
    socket.on(SOCKET_EVENTS.DISCONNECT, () => handleDisconnect(io, socket));
  });
};

/**
 * Loads First + Last for typing indicators (JWT usually only has email).
 */
const resolveSocketDisplayName = async (socket) => {
  if (!socket.userId || socket.displayName) return;
  try {
    const fromClaims = [socket.userFirstName, socket.userLastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    if (fromClaims) {
      socket.displayName = fromClaims;
      socket.userName = fromClaims;
      return;
    }
    const userRepository = require("../modules/user/user.repository");
    const user = await userRepository.findById(socket.userId);
    if (user) {
      const name = [user.firstName || user.first_name, user.lastName || user.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (name) {
        socket.displayName = name;
        socket.userName = name;
        socket.userFirstName = user.firstName || user.first_name || null;
        socket.userLastName = user.lastName || user.last_name || null;
      }
    }
  } catch (err) {
    logger.debug("resolveSocketDisplayName failed", { error: err.message });
  }
};

/**
 * Collect peer user ids (accepted contacts both directions + conversation partners).
 */
const collectPeerIds = async (userId) => {
  const userRepository = require("../modules/user/user.repository");
  const contacts = await userRepository.getOnlineContacts(userId);
  const peerIds = new Set();
  (contacts || []).forEach((contact) => {
    const peerId =
      contact.userId ||
      contact.user_id ||
      contact.contactUserId ||
      contact.contact_user_id ||
      contact.id;
    if (peerId && String(peerId) !== String(userId)) {
      peerIds.add(String(peerId));
    }
  });
  return peerIds;
};

/**
 * Refreshes online + session TTLs so long-lived tabs stay Online.
 */
const handlePresenceHeartbeat = async (socket) => {
  if (!socket.userId) return;
  try {
    const redis = getRedisClient();
    const sessionKey = `${REDIS_KEYS.USER_SESSIONS}${socket.userId}`;
    const onlineKey = `${REDIS_KEYS.USER_ONLINE}${socket.userId}`;
    const ttl = REDIS_TTL.ONLINE_STATUS;
    // Always refresh while socket is open (stay Online across any page)
    await redis.setex(onlineKey, ttl, "1");
    const sessions = await redis.exists(sessionKey);
    if (sessions) {
      await redis.expire(sessionKey, ttl);
    } else {
      // Session key lost but socket still connected — restore count at least 1
      await redis.setex(sessionKey, ttl, "1");
    }
    await redis.set(`user:lastSeen:${socket.userId}`, new Date().toISOString());
  } catch (err) {
    logger.debug("presence_heartbeat failed", { error: err.message });
  }
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
    // Peer-scoped broadcast: friends (both directions) + conversation partners
    try {
      const peerIds = await collectPeerIds(socket.userId);
      peerIds.forEach((peerId) => {
        io.to(`user:${peerId}`).emit(SOCKET_EVENTS.USER_ONLINE, {
          userId: socket.userId,
          timestamp: Date.now(),
        });
      });
      if (peerIds.size === 0) {
        socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
          userId: socket.userId,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      logger.error("handleUserOnline contact lookup failed", { error: err.message });
      socket.broadcast.emit(SOCKET_EVENTS.USER_ONLINE, {
        userId: socket.userId,
        timestamp: Date.now(),
      });
    }
    logger.info(`User ${socket.userId} is now ONLINE (first socket)`);
  }

  // Friend-filtered online list for the newly connected user
  await sendOnlineUsersToSocket(socket, redis);
};

/**
 * Sends online users list filtered to friends / conversation peers of this socket.
 * Always includes self so FE can show own Online state.
 */
const sendOnlineUsersToSocket = async (socket, redis) => {
  try {
    const keys = await redis.keys(`${REDIS_KEYS.USER_ONLINE}*`);
    const allOnline = keys.map((key) => key.replace(REDIS_KEYS.USER_ONLINE, ""));
    let peerIds;
    try {
      peerIds = await collectPeerIds(socket.userId);
    } catch (err) {
      peerIds = null;
    }
    let onlineUserIds;
    if (peerIds && peerIds.size > 0) {
      onlineUserIds = allOnline.filter(
        (id) => peerIds.has(String(id)) || String(id) === String(socket.userId)
      );
    } else {
      // No peer graph yet — send full list (FE still maps friends)
      onlineUserIds = allOnline;
    }
    if (!onlineUserIds.map(String).includes(String(socket.userId))) {
      onlineUserIds = [...onlineUserIds, String(socket.userId)];
    }
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
  // Prefer First + Last; never emit bare email local-part if name known
  if (!socket.displayName && !socket.userName) {
    await resolveSocketDisplayName(socket);
  }
  const displayName = (
    socket.displayName ||
    socket.userName ||
    [socket.userFirstName, socket.userLastName].filter(Boolean).join(" ").trim() ||
    (socket.userEmail ? String(socket.userEmail).split("@")[0] : null) ||
    "Someone"
  ).trim();
  socket.to(`conversation:${conversationId}`).emit(event, {
    userId: socket.userId,
    conversationId,
    isTyping,
    username: displayName,
    displayName,
  });
};

/**
 * Handles read receipt notifications.
 */
const handleMessageRead = async (io, socket, { conversationId }) => {
  if (!conversationId) return;

  try {
    // Persist seen state and notify affected senders (handled in the service).
    await messageService.markAsRead(socket.userId, conversationId);
    // Let other tabs of the same reader stay in sync.
    socket.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
      userId: socket.userId,
      conversationId,
      readAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("handleMessageRead failed", { error: err.message, conversationId });
  }
};

/**
 * Handles a delivery acknowledgement from a recipient's client.
 * Persists the delivered state and notifies the original sender.
 */
const handleMessageDelivered = async (io, socket, { messageId }) => {
  if (!messageId) return;
  try {
    await messageService.markDelivered(socket.userId, messageId);
  } catch (err) {
    logger.error("handleMessageDelivered failed", { error: err.message, messageId });
  }
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

    // Peer-scoped offline broadcast (friends both directions + conversation peers)
    try {
      const peerIds = await collectPeerIds(socket.userId);
      peerIds.forEach((peerId) => {
        io.to(`user:${peerId}`).emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId: socket.userId,
          lastSeen: new Date().toISOString(),
          timestamp: Date.now(),
        });
      });
      if (peerIds.size === 0) {
        socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
          userId: socket.userId,
          lastSeen: new Date().toISOString(),
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      logger.error("handleDisconnect contact lookup failed", { error: err.message });
      socket.broadcast.emit(SOCKET_EVENTS.USER_OFFLINE, {
        userId: socket.userId,
        lastSeen: new Date().toISOString(),
        timestamp: Date.now(),
      });
    }

    logger.info(`User ${socket.userId} is now OFFLINE (all sockets disconnected)`);
  } else {
    logger.debug(`User ${socket.userId} disconnected one tab (${count} remaining)`);
  }
};

module.exports = { initializeSocketHandlers };
