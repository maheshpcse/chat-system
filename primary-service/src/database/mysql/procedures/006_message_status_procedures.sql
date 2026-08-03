-- ============================================================
-- STORED PROCEDURES - Message Status (consolidated)
-- Single source of truth: messageReceipts.
-- Redefines spMarkMessageDelivered / spMarkMessagesRead and adds
-- spMarkMessageFailed / spGetMessageStatus.
-- ============================================================

USE chat_system;

DROP PROCEDURE IF EXISTS spMarkMessageDelivered;
DROP PROCEDURE IF EXISTS spMarkMessagesRead;
DROP PROCEDURE IF EXISTS spMarkMessageFailed;
DROP PROCEDURE IF EXISTS spGetMessageStatus;

DELIMITER //

-- ============================================================
-- SP: spMarkMessageDelivered
-- Marks a single message as delivered to a recipient and advances the
-- sender-facing messages.status from 'sent' -> 'delivered'.
-- Returns the message's sender + new status so the caller can notify.
-- ============================================================
CREATE PROCEDURE spMarkMessageDelivered(
  IN pMessageId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  INSERT INTO messageReceipts (messageId, userId, status, deliveredAt)
  VALUES (pMessageId, pUserId, 'delivered', NOW())
  ON DUPLICATE KEY UPDATE
    deliveredAt = COALESCE(deliveredAt, NOW()),
    status = IF(status = 'seen', 'seen', 'delivered');

  UPDATE messages
  SET status = 'delivered'
  WHERE messageId = pMessageId AND status = 'sent';

  SELECT messageId, conversationId, senderId, status
  FROM messages WHERE messageId = pMessageId;
END //

-- ============================================================
-- SP: spMarkMessagesRead
-- Marks all messages from other participants in a conversation as seen for
-- the given user, advances messages.status -> 'seen', updates lastReadAt, and
-- returns the affected messageIds + their senders so senders can be notified.
-- ============================================================
CREATE PROCEDURE spMarkMessagesRead(
  IN pConversationId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  -- Snapshot the messages that are about to be marked seen (from others).
  DROP TEMPORARY TABLE IF EXISTS tmpSeenMsgs;
  CREATE TEMPORARY TABLE tmpSeenMsgs AS
    SELECT m.messageId, m.senderId
    FROM messages m
    LEFT JOIN messageReceipts r
      ON r.messageId = m.messageId AND r.userId = pUserId
    WHERE m.conversationId = pConversationId
      AND m.senderId <> pUserId
      AND m.isDeleted = 0
      AND (r.seenAt IS NULL);

  -- Upsert receipts as seen.
  INSERT INTO messageReceipts (messageId, userId, status, deliveredAt, readAt, seenAt)
  SELECT t.messageId, pUserId, 'seen', NOW(), NOW(), NOW()
  FROM tmpSeenMsgs t
  ON DUPLICATE KEY UPDATE
    status = 'seen',
    readAt = COALESCE(readAt, NOW()),
    seenAt = COALESCE(seenAt, NOW()),
    deliveredAt = COALESCE(deliveredAt, NOW());

  -- Advance sender-facing status.
  UPDATE messages m
  INNER JOIN tmpSeenMsgs t ON t.messageId = m.messageId
  SET m.status = 'seen';

  -- Update participant's last read timestamp.
  UPDATE conversationParticipants
  SET lastReadAt = NOW()
  WHERE conversationId = pConversationId AND userId = pUserId;

  -- Return affected messages so the caller can emit read receipts to senders.
  SELECT messageId, senderId FROM tmpSeenMsgs;
  DROP TEMPORARY TABLE IF EXISTS tmpSeenMsgs;
END //

-- ============================================================
-- SP: spMarkMessageFailed
-- Flags a message as failed to deliver (used by the retry path).
-- ============================================================
CREATE PROCEDURE spMarkMessageFailed(
  IN pMessageId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  UPDATE messages SET status = 'failed' WHERE messageId = pMessageId;

  IF pUserId IS NOT NULL THEN
    INSERT INTO messageReceipts (messageId, userId, status, failedAt)
    VALUES (pMessageId, pUserId, 'failed', NOW())
    ON DUPLICATE KEY UPDATE status = 'failed', failedAt = NOW();
  END IF;
END //

-- ============================================================
-- SP: spGetMessageStatus
-- Returns the aggregate status of a message and per-user receipt rows
-- (used for group delivery/read breakdown).
-- ============================================================
CREATE PROCEDURE spGetMessageStatus(
  IN pMessageId CHAR(36)
)
BEGIN
  SELECT status AS messageStatus FROM messages WHERE messageId = pMessageId;

  SELECT userId, status, deliveredAt, seenAt, failedAt
  FROM messageReceipts
  WHERE messageId = pMessageId;
END //

DELIMITER ;
