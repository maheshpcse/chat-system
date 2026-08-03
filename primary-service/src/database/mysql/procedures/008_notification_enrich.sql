-- =============================================
-- 008: Notification Enrichment
-- Adds actor/entity/readAt columns (via idempotent helpers) and upgrades the
-- notification procedures to populate them.
-- Requires: procedures/000_common_ddl_helpers.sql
-- =============================================

USE chat_system;

CALL spAlterTableColumn('ADD', 'notifications', 'actorUserId', "CHAR(36) DEFAULT NULL", 'AFTER `userId`');
CALL spAlterTableColumn('ADD', 'notifications', 'entityType', "VARCHAR(50) DEFAULT NULL", 'AFTER `data`');
CALL spAlterTableColumn('ADD', 'notifications', 'entityId', "CHAR(36) DEFAULT NULL", 'AFTER `entityType`');
CALL spAlterTableColumn('ADD', 'notifications', 'readAt', "DATETIME DEFAULT NULL", 'AFTER `isRead`');
CALL spAddIndexIfNotExists('notifications', 'idxNotificationsActor', '`actorUserId`');
CALL spAddForeignKeyIfNotExists('notifications', 'fkNotificationsActor',
  'FOREIGN KEY (`actorUserId`) REFERENCES `users`(`userId`) ON DELETE SET NULL');

DELIMITER $$

-- Recreate create-notification to accept actor + entity metadata.
DROP PROCEDURE IF EXISTS spCreateNotification$$
CREATE PROCEDURE spCreateNotification(
    IN pUserId CHAR(36),
    IN pActorUserId CHAR(36),
    IN pType VARCHAR(50),
    IN pTitle VARCHAR(200),
    IN pBody TEXT,
    IN pEntityType VARCHAR(50),
    IN pEntityId CHAR(36),
    IN pData JSON
)
BEGIN
    DECLARE vId CHAR(36);
    SET vId = UUID();
    INSERT INTO notifications
        (notificationId, userId, actorUserId, type, title, body, data, entityType, entityId)
    VALUES
        (vId, pUserId, pActorUserId, pType, pTitle, pBody, pData, pEntityType, pEntityId);

    SELECT * FROM notifications WHERE notificationId = vId;
END$$

-- Mark-read procs now stamp readAt.
DROP PROCEDURE IF EXISTS spMarkNotificationRead$$
CREATE PROCEDURE spMarkNotificationRead(
    IN pNotificationId CHAR(36),
    IN pUserId CHAR(36)
)
BEGIN
    UPDATE notifications
    SET isRead = 1, readAt = NOW()
    WHERE notificationId = pNotificationId AND userId = pUserId;
END$$

DROP PROCEDURE IF EXISTS spMarkAllNotificationsRead$$
CREATE PROCEDURE spMarkAllNotificationsRead(
    IN pUserId CHAR(36)
)
BEGIN
    UPDATE notifications
    SET isRead = 1, readAt = NOW()
    WHERE userId = pUserId AND isRead = 0;
END$$

DELIMITER ;
