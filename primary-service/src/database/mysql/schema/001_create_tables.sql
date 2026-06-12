-- ============================================================
-- CHAT SYSTEM - MySQL Schema
-- Database: chat_system
-- ============================================================
-- This script creates all tables, indexes, and foreign keys
-- for the Primary Service database.
-- ============================================================

CREATE DATABASE IF NOT EXISTS chat_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chat_system;

-- ============================================================
-- TABLE: users
-- Core user table for authentication and profile data.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  userId CHAR(36) NOT NULL,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(30) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  phoneNumber VARCHAR(20) DEFAULT NULL,
  avatarUrl VARCHAR(500) DEFAULT NULL,
  bio VARCHAR(500) DEFAULT NULL,
  role ENUM('admin', 'moderator', 'user') NOT NULL DEFAULT 'user',
  status ENUM('active', 'inactive', 'banned', 'suspended') NOT NULL DEFAULT 'active',
  isOnline TINYINT(1) NOT NULL DEFAULT 0,
  lastLoginAt DATETIME DEFAULT NULL,
  lastSeenAt DATETIME DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (userId),
  UNIQUE KEY ukUsersEmail (email),
  UNIQUE KEY ukUsersUsername (username),
  INDEX idxUsersStatus (status),
  INDEX idxUsersRole (role),
  INDEX idxUsersOnline (isOnline),
  INDEX idxUsersCreatedAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: refreshTokens
-- Stores JWT refresh tokens for session management.
-- ============================================================
CREATE TABLE IF NOT EXISTS refreshTokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  userId CHAR(36) NOT NULL,
  token TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  isRevoked TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idxRefreshTokensUserId (userId),
  INDEX idxRefreshTokensExpiry (expiresAt),
  CONSTRAINT fkRefreshTokensUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: conversations
-- Represents a chat thread (private or group).
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  conversationId CHAR(36) NOT NULL,
  conversationType ENUM('private', 'group') NOT NULL DEFAULT 'private',
  lastMessageId CHAR(36) DEFAULT NULL,
  lastMessageAt DATETIME DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (conversationId),
  INDEX idxConversationsType (conversationType),
  INDEX idxConversationsLastMessage (lastMessageAt DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: conversationParticipants
-- Many-to-many relationship between users and conversations.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversationParticipants (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversationId CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lastReadAt DATETIME DEFAULT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY ukParticipantConversation (conversationId, userId),
  INDEX idxParticipantsUserId (userId),
  INDEX idxParticipantsActive (isActive),
  CONSTRAINT fkParticipantsConversation FOREIGN KEY (conversationId) REFERENCES conversations(conversationId) ON DELETE CASCADE,
  CONSTRAINT fkParticipantsUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: messages
-- Stores all chat messages.
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  messageId CHAR(36) NOT NULL,
  conversationId CHAR(36) NOT NULL,
  senderId CHAR(36) NOT NULL,
  content TEXT NOT NULL,
  messageType ENUM('text', 'image', 'file', 'audio', 'video', 'system') NOT NULL DEFAULT 'text',
  attachmentUrl VARCHAR(500) DEFAULT NULL,
  status ENUM('sent', 'delivered', 'read', 'deleted') NOT NULL DEFAULT 'sent',
  isDeleted TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (messageId),
  INDEX idxMessagesConversation (conversationId, createdAt DESC),
  INDEX idxMessagesSender (senderId),
  INDEX idxMessagesStatus (status),
  INDEX idxMessagesCreatedAt (createdAt),
  CONSTRAINT fkMessagesConversation FOREIGN KEY (conversationId) REFERENCES conversations(conversationId) ON DELETE CASCADE,
  CONSTRAINT fkMessagesSender FOREIGN KEY (senderId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: messageReceipts
-- Tracks delivery and read status per recipient.
-- ============================================================
CREATE TABLE IF NOT EXISTS messageReceipts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  messageId CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  deliveredAt DATETIME DEFAULT NULL,
  readAt DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY ukReceiptMessageUser (messageId, userId),
  INDEX idxReceiptsUserId (userId),
  CONSTRAINT fkReceiptsMessage FOREIGN KEY (messageId) REFERENCES messages(messageId) ON DELETE CASCADE,
  CONSTRAINT fkReceiptsUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: chatGroups
-- Group-specific metadata (linked to a conversation).
-- ============================================================
CREATE TABLE IF NOT EXISTS chatGroups (
  groupId CHAR(36) NOT NULL,
  conversationId CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  avatarUrl VARCHAR(500) DEFAULT NULL,
  createdBy CHAR(36) NOT NULL,
  maxMembers INT UNSIGNED NOT NULL DEFAULT 256,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (groupId),
  UNIQUE KEY ukGroupConversation (conversationId),
  INDEX idxGroupsCreatedBy (createdBy),
  INDEX idxGroupsName (name),
  CONSTRAINT fkGroupsConversation FOREIGN KEY (conversationId) REFERENCES conversations(conversationId) ON DELETE CASCADE,
  CONSTRAINT fkGroupsCreatedBy FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: groupMembers
-- Group membership with roles.
-- ============================================================
CREATE TABLE IF NOT EXISTS groupMembers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  groupId CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  role ENUM('owner', 'admin', 'member') NOT NULL DEFAULT 'member',
  joinedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ukGroupMember (groupId, userId),
  INDEX idxGroupMembersUser (userId),
  INDEX idxGroupMembersRole (role),
  CONSTRAINT fkGroupMembersGroup FOREIGN KEY (groupId) REFERENCES chatGroups(groupId) ON DELETE CASCADE,
  CONSTRAINT fkGroupMembersUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: fileUploads
-- Tracks all uploaded files.
-- ============================================================
CREATE TABLE IF NOT EXISTS fileUploads (
  fileId CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  originalName VARCHAR(255) NOT NULL,
  fileName VARCHAR(255) NOT NULL,
  mimeType VARCHAR(100) NOT NULL,
  fileSize BIGINT UNSIGNED NOT NULL,
  storageProvider ENUM('local', 's3') NOT NULL DEFAULT 'local',
  storageUrl VARCHAR(500) NOT NULL,
  messageId CHAR(36) DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (fileId),
  INDEX idxUploadsUser (userId),
  INDEX idxUploadsMessage (messageId),
  CONSTRAINT fkUploadsUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notifications
-- Persistent notification storage.
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  notificationId CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT DEFAULT NULL,
  data JSON DEFAULT NULL,
  isRead TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notificationId),
  INDEX idxNotificationsUser (userId, isRead, createdAt DESC),
  CONSTRAINT fkNotificationsUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
