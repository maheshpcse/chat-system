"use strict";

/**
 * Constants
 * Application-wide constants organized by domain.
 */

const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
});

const USER_STATUS = Object.freeze({
  ACTIVE: "active",
  INACTIVE: "inactive",
  BANNED: "banned",
  SUSPENDED: "suspended",
});

const MESSAGE_TYPES = Object.freeze({
  TEXT: "text",
  IMAGE: "image",
  FILE: "file",
  AUDIO: "audio",
  VIDEO: "video",
  SYSTEM: "system",
});

const MESSAGE_STATUS = Object.freeze({
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  DELETED: "deleted",
});

const CONVERSATION_TYPES = Object.freeze({
  PRIVATE: "private",
  GROUP: "group",
});

const GROUP_ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
});

const SOCKET_EVENTS = Object.freeze({
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  JOIN_ROOM: "joinRoom",
  LEAVE_ROOM: "leaveRoom",
  SEND_MESSAGE: "sendMessage",
  NEW_MESSAGE: "newMessage",
  TYPING_START: "typingStart",
  TYPING_STOP: "typingStop",
  USER_ONLINE: "userOnline",
  USER_OFFLINE: "userOffline",
  MESSAGE_READ: "messageRead",
  MESSAGE_DELIVERED: "messageDelivered",
  NOTIFICATION: "notification",
});

const REDIS_KEYS = Object.freeze({
  USER_PROFILE: "user:profile:",
  USER_ONLINE: "user:online:",
  USER_SESSIONS: "user:sessions:",
  CONVERSATION: "conversation:",
  RECENT_MESSAGES: "messages:recent:",
  TYPING_INDICATOR: "typing:",
  RATE_LIMIT: "rateLimit:",
});

const REDIS_TTL = Object.freeze({
  USER_PROFILE: 3600,       // 1 hour
  ONLINE_STATUS: 300,       // 5 minutes
  CONVERSATION: 1800,       // 30 minutes
  RECENT_MESSAGES: 900,     // 15 minutes
  TYPING_INDICATOR: 10,     // 10 seconds
  SESSION: 86400,           // 24 hours
});

const PAGINATION = Object.freeze({
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
});

module.exports = {
  USER_ROLES,
  USER_STATUS,
  MESSAGE_TYPES,
  MESSAGE_STATUS,
  CONVERSATION_TYPES,
  GROUP_ROLES,
  SOCKET_EVENTS,
  REDIS_KEYS,
  REDIS_TTL,
  PAGINATION,
};
