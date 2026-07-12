-- =============================================
-- Chat Application Schema Extension
-- 004: Scheduled Messages, User Settings, Notifications Tables
-- =============================================

USE chat_system;

-- ============================================================
-- TABLE: scheduledMessages
-- Stores messages scheduled to be sent at a future time.
-- FIXED: Foreign keys now correctly reference existing table PKs
-- ============================================================
CREATE TABLE IF NOT EXISTS scheduledMessages (
    scheduledMessageId CHAR(36) NOT NULL,
    senderId CHAR(36) NOT NULL,
    conversationId CHAR(36) NOT NULL,
    content TEXT NOT NULL,
    messageType ENUM('text', 'image', 'file', 'emoji') NOT NULL DEFAULT 'text',
    attachmentUrl VARCHAR(500) DEFAULT NULL,
    scheduledAt DATETIME NOT NULL,
    status ENUM('pending', 'sent', 'cancelled', 'failed') NOT NULL DEFAULT 'pending',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scheduledMessageId),
    INDEX idxScheduledStatus (status, scheduledAt),
    INDEX idxScheduledSender (senderId),
    INDEX idxScheduledConversation (conversationId),
    CONSTRAINT fkScheduledMessagesSender FOREIGN KEY (senderId) REFERENCES users(userId) ON DELETE CASCADE,
    CONSTRAINT fkScheduledMessagesConversation FOREIGN KEY (conversationId) REFERENCES conversations(conversationId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: userSettings
-- Stores user preferences and settings using key-value pattern.
-- FIXED: Foreign key now correctly references users(userId)
-- ============================================================
CREATE TABLE IF NOT EXISTS userSettings (
    settingId CHAR(36) NOT NULL,
    userId CHAR(36) NOT NULL,
    settingKey VARCHAR(100) NOT NULL,
    settingValue TEXT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (settingId),
    UNIQUE KEY ukUserSettingKey (userId, settingKey),
    INDEX idxSettingsUser (userId),
    CONSTRAINT fkUserSettingsUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: notificationsArchive (Separate from notifications in 001_create_tables.sql)
-- Stores archived/historical notification records.
-- NOTE: Primary notifications table is defined in 001_create_tables.sql
-- FIXED: Foreign key now correctly references users(userId)
-- ============================================================
CREATE TABLE IF NOT EXISTS notificationsArchive (
    notificationArchiveId CHAR(36) NOT NULL,
    userId CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT DEFAULT NULL,
    data JSON DEFAULT NULL,
    isRead TINYINT(1) NOT NULL DEFAULT 0,
    archivedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    createdAt DATETIME NOT NULL,
    PRIMARY KEY (notificationArchiveId),
    INDEX idxNotificationArchiveUser (userId, archivedAt DESC),
    INDEX idxNotificationArchiveCreated (createdAt DESC),
    CONSTRAINT fkNotificationArchiveUser FOREIGN KEY (userId) REFERENCES users(userId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
