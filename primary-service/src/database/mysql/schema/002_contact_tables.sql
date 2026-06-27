-- ============================================================
-- CHAT SYSTEM - Contact/Friend Request Schema
-- ============================================================

USE chat_system;

-- ============================================================
-- TABLE: contactRequests
-- Stores friend/contact request records between users.
-- ============================================================
CREATE TABLE IF NOT EXISTS contactRequests (
  requestId CHAR(36) NOT NULL,
  senderUserId CHAR(36) NOT NULL,
  receiverUserId CHAR(36) NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled', 'blocked') NOT NULL DEFAULT 'pending',
  requestedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acceptedAt DATETIME DEFAULT NULL,
  rejectedAt DATETIME DEFAULT NULL,
  cancelledAt DATETIME DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (requestId),
  INDEX idxContactReqSender (senderUserId, status),
  INDEX idxContactReqReceiver (receiverUserId, status),
  INDEX idxContactReqStatus (status),
  INDEX idxContactReqCreatedAt (createdAt),
  UNIQUE KEY ukContactReqPending (senderUserId, receiverUserId, status),
  CONSTRAINT fkContactReqSender FOREIGN KEY (senderUserId) REFERENCES users(userId) ON DELETE CASCADE,
  CONSTRAINT fkContactReqReceiver FOREIGN KEY (receiverUserId) REFERENCES users(userId) ON DELETE CASCADE,
  CONSTRAINT chkContactReqNotSelf CHECK (senderUserId != receiverUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: userContacts
-- Stores accepted friendships/contacts. One row per friendship
-- (bidirectional: both userId and contactUserId can query).
-- ============================================================
CREATE TABLE IF NOT EXISTS userContacts (
  contactId CHAR(36) NOT NULL,
  userId CHAR(36) NOT NULL,
  contactUserId CHAR(36) NOT NULL,
  status ENUM('active', 'blocked', 'removed') NOT NULL DEFAULT 'active',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (contactId),
  UNIQUE KEY ukUserContact (userId, contactUserId),
  INDEX idxContactUserId (userId, status),
  INDEX idxContactContactUserId (contactUserId, status),
  INDEX idxContactStatus (status),
  CONSTRAINT fkContactUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE,
  CONSTRAINT fkContactContactUser FOREIGN KEY (contactUserId) REFERENCES users(userId) ON DELETE CASCADE,
  CONSTRAINT chkContactNotSelf CHECK (userId != contactUserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
