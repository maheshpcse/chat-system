-- =============================================
-- Stored Procedures for Scheduled Messages, Settings, Notifications
-- FIXED: Updated to match corrected schema table and column names
-- =============================================

DELIMITER $$

-- ============================================
-- SCHEDULED MESSAGES PROCEDURES
-- ============================================

-- Create a scheduled message
CREATE PROCEDURE IF NOT EXISTS spCreateScheduledMessage(
    IN pSenderId CHAR(36),
    IN pConversationId CHAR(36),
    IN pContent TEXT,
    IN pMessageType VARCHAR(10),
    IN pAttachmentUrl VARCHAR(500),
    IN pScheduledAt DATETIME
)
BEGIN
    INSERT INTO scheduledMessages (scheduledMessageId, senderId, conversationId, content, messageType, attachmentUrl, scheduledAt)
    VALUES (UUID(), pSenderId, pConversationId, pContent, pMessageType, pAttachmentUrl, pScheduledAt);

    SELECT * FROM scheduledMessages WHERE senderId = pSenderId ORDER BY createdAt DESC LIMIT 1;
END$$

-- Get pending scheduled messages that are due
CREATE PROCEDURE IF NOT EXISTS spGetDueScheduledMessages()
BEGIN
    SELECT sm.*, u.username AS senderUsername, u.firstName AS senderFirstName
    FROM scheduledMessages sm
    JOIN users u ON sm.senderId = u.userId
    WHERE sm.status = 'pending'
      AND sm.scheduledAt <= NOW()
    ORDER BY sm.scheduledAt ASC
    LIMIT 50;
END$$

-- Get user's scheduled messages
CREATE PROCEDURE IF NOT EXISTS spGetUserScheduledMessages(
    IN pUserId CHAR(36),
    IN pStatus VARCHAR(20)
)
BEGIN
    SELECT sm.*, COALESCE(cg.name, CONCAT(u2.firstName, ' ', u2.lastName)) AS conversationName
    FROM scheduledMessages sm
    LEFT JOIN conversations c ON sm.conversationId = c.conversationId
    LEFT JOIN chatGroups cg ON c.conversationId = cg.conversationId
    LEFT JOIN conversationParticipants cp ON c.conversationId = cp.conversationId AND cp.userId != pUserId
    LEFT JOIN users u2 ON cp.userId = u2.userId
    WHERE sm.senderId = pUserId
      AND (pStatus IS NULL OR sm.status = pStatus)
    ORDER BY sm.scheduledAt ASC;
END$$

-- Update scheduled message status
CREATE PROCEDURE IF NOT EXISTS spUpdateScheduledMessageStatus(
    IN pScheduledMessageId CHAR(36),
    IN pStatus VARCHAR(20)
)
BEGIN
    UPDATE scheduledMessages SET status = pStatus, updatedAt = NOW() WHERE scheduledMessageId = pScheduledMessageId;
END$$

-- Cancel a scheduled message
CREATE PROCEDURE IF NOT EXISTS spCancelScheduledMessage(
    IN pScheduledMessageId CHAR(36),
    IN pUserId CHAR(36)
)
BEGIN
    UPDATE scheduledMessages
    SET status = 'cancelled', updatedAt = NOW()
    WHERE scheduledMessageId = pScheduledMessageId AND senderId = pUserId AND status = 'pending';

    SELECT ROW_COUNT() AS affectedRows;
END$$


-- ============================================
-- USER SETTINGS PROCEDURES
-- ============================================

-- Get all settings for a user
CREATE PROCEDURE IF NOT EXISTS spGetUserSettings(
    IN pUserId CHAR(36)
)
BEGIN
    SELECT settingKey, settingValue
    FROM userSettings
    WHERE userId = pUserId
    ORDER BY settingKey;
END$$

-- Get a specific user setting
CREATE PROCEDURE IF NOT EXISTS spGetUserSetting(
    IN pUserId CHAR(36),
    IN pSettingKey VARCHAR(100)
)
BEGIN
    SELECT settingKey, settingValue
    FROM userSettings
    WHERE userId = pUserId AND settingKey = pSettingKey;
END$$

-- Upsert a user setting
CREATE PROCEDURE IF NOT EXISTS spUpsertUserSetting(
    IN pUserId CHAR(36),
    IN pSettingKey VARCHAR(100),
    IN pSettingValue TEXT
)
BEGIN
    INSERT INTO userSettings (settingId, userId, settingKey, settingValue)
    VALUES (UUID(), pUserId, pSettingKey, pSettingValue)
    ON DUPLICATE KEY UPDATE settingValue = pSettingValue, updatedAt = NOW();
END$$

-- Delete a user setting
CREATE PROCEDURE IF NOT EXISTS spDeleteUserSetting(
    IN pUserId CHAR(36),
    IN pSettingKey VARCHAR(100)
)
BEGIN
    DELETE FROM userSettings WHERE userId = pUserId AND settingKey = pSettingKey;
END$$

-- Delete all user settings
CREATE PROCEDURE IF NOT EXISTS spDeleteAllUserSettings(
    IN pUserId CHAR(36)
)
BEGIN
    DELETE FROM userSettings WHERE userId = pUserId;
END$$


-- ============================================
-- NOTIFICATIONS PROCEDURES
-- ============================================

-- Create a notification
CREATE PROCEDURE IF NOT EXISTS spCreateNotification(
    IN pUserId CHAR(36),
    IN pType VARCHAR(50),
    IN pTitle VARCHAR(200),
    IN pBody TEXT,
    IN pData JSON
)
BEGIN
    INSERT INTO notifications (notificationId, userId, type, title, body, data)
    VALUES (UUID(), pUserId, pType, pTitle, pBody, pData);

    SELECT * FROM notifications WHERE userId = pUserId ORDER BY createdAt DESC LIMIT 1;
END$$

-- Get user notifications with pagination
CREATE PROCEDURE IF NOT EXISTS spGetUserNotifications(
    IN pUserId CHAR(36),
    IN pPage INT,
    IN pPageLimit INT
)
BEGIN
    DECLARE vOffset INT DEFAULT (pPage - 1) * pPageLimit;

    SELECT *
    FROM notifications
    WHERE userId = pUserId
    ORDER BY createdAt DESC
    LIMIT vOffset, pPageLimit;
END$$

-- Get unread notification count
CREATE PROCEDURE IF NOT EXISTS spGetUnreadNotificationCount(
    IN pUserId CHAR(36)
)
BEGIN
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE userId = pUserId AND isRead = 0;
END$$

-- Mark notification as read
CREATE PROCEDURE IF NOT EXISTS spMarkNotificationRead(
    IN pNotificationId CHAR(36),
    IN pUserId CHAR(36)
)
BEGIN
    UPDATE notifications
    SET isRead = 1, updatedAt = NOW()
    WHERE notificationId = pNotificationId AND userId = pUserId;
END$$

-- Mark all notifications as read
CREATE PROCEDURE IF NOT EXISTS spMarkAllNotificationsRead(
    IN pUserId CHAR(36)
)
BEGIN
    UPDATE notifications SET isRead = 1, updatedAt = NOW() WHERE userId = pUserId AND isRead = 0;
END$$

-- Clear all notifications for a user
CREATE PROCEDURE IF NOT EXISTS spClearNotifications(
    IN pUserId CHAR(36)
)
BEGIN
    DELETE FROM notifications WHERE userId = pUserId;
END$$

DELIMITER ;
