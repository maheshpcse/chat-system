-- ============================================================
-- STORED PROCEDURES - Chat, Conversation, Message Module
-- ============================================================

USE chat_system;

DELIMITER //

-- ============================================================
-- SP: spCreatePrivateConversation
-- Creates a private (1:1) conversation between two users.
-- ============================================================
CREATE PROCEDURE spCreatePrivateConversation(
  IN pConversationId CHAR(36),
  IN pUserId CHAR(36),
  IN pParticipantId CHAR(36)
)
BEGIN
  INSERT INTO conversations (conversationId, conversationType)
  VALUES (pConversationId, 'private');

  INSERT INTO conversationParticipants (conversationId, userId)
  VALUES (pConversationId, pUserId), (pConversationId, pParticipantId);

  SELECT c.conversationId, c.conversationType, c.createdAt,
         u.userId AS participantId, u.firstName, u.lastName, u.username, u.avatarUrl
  FROM conversations c
  INNER JOIN conversationParticipants cp ON c.conversationId = cp.conversationId
  INNER JOIN users u ON cp.userId = u.userId
  WHERE c.conversationId = pConversationId AND u.userId = pParticipantId;
END //

-- ============================================================
-- SP: spFindPrivateConversation
-- Finds existing private conversation between two users.
-- ============================================================
CREATE PROCEDURE spFindPrivateConversation(
  IN pUserId CHAR(36),
  IN pParticipantId CHAR(36)
)
BEGIN
  SELECT c.conversationId, c.conversationType, c.lastMessageAt, c.createdAt
  FROM conversations c
  INNER JOIN conversationParticipants cp1 ON c.conversationId = cp1.conversationId
  INNER JOIN conversationParticipants cp2 ON c.conversationId = cp2.conversationId
  WHERE c.conversationType = 'private'
    AND cp1.userId = pUserId
    AND cp2.userId = pParticipantId
    AND cp1.isActive = 1
    AND cp2.isActive = 1
  LIMIT 1;
END //

-- ============================================================
-- SP: spGetUserConversations
-- Gets all conversations for a user with last message preview.
-- ============================================================
CREATE PROCEDURE spGetUserConversations(
  IN pUserId CHAR(36),
  IN pLimit INT,
  IN pOffset INT
)
BEGIN
  SELECT c.conversationId, c.conversationType, c.lastMessageAt,
         m.content AS lastMessageContent, m.messageType AS lastMessageType,
         m.senderId AS lastMessageSender,
         CASE
           WHEN c.conversationType = 'private' THEN
             (SELECT CONCAT(u2.firstName, ' ', u2.lastName)
              FROM conversationParticipants cp2
              INNER JOIN users u2 ON cp2.userId = u2.userId
              WHERE cp2.conversationId = c.conversationId AND cp2.userId != pUserId
              LIMIT 1)
           WHEN c.conversationType = 'group' THEN
             (SELECT g.name FROM chatGroups g WHERE g.conversationId = c.conversationId)
         END AS displayName,
         CASE
           WHEN c.conversationType = 'private' THEN
             (SELECT u2.avatarUrl
              FROM conversationParticipants cp2
              INNER JOIN users u2 ON cp2.userId = u2.userId
              WHERE cp2.conversationId = c.conversationId AND cp2.userId != pUserId
              LIMIT 1)
           WHEN c.conversationType = 'group' THEN
             (SELECT g.avatarUrl FROM chatGroups g WHERE g.conversationId = c.conversationId)
         END AS avatarUrl
  FROM conversations c
  INNER JOIN conversationParticipants cp ON c.conversationId = cp.conversationId
  LEFT JOIN messages m ON c.lastMessageId = m.messageId
  WHERE cp.userId = pUserId AND cp.isActive = 1
  ORDER BY c.lastMessageAt DESC
  LIMIT pLimit OFFSET pOffset;

  SELECT COUNT(*) AS total
  FROM conversationParticipants
  WHERE userId = pUserId AND isActive = 1;
END //

-- ============================================================
-- SP: spGetConversationById
-- Gets conversation details if user is a participant.
-- ============================================================
CREATE PROCEDURE spGetConversationById(
  IN pConversationId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  SELECT c.conversationId, c.conversationType, c.lastMessageAt, c.createdAt
  FROM conversations c
  INNER JOIN conversationParticipants cp ON c.conversationId = cp.conversationId
  WHERE c.conversationId = pConversationId
    AND cp.userId = pUserId
    AND cp.isActive = 1;
END //

-- ============================================================
-- SP: spIsConversationParticipant
-- Checks if a user is an active participant.
-- ============================================================
CREATE PROCEDURE spIsConversationParticipant(
  IN pConversationId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM conversationParticipants
    WHERE conversationId = pConversationId AND userId = pUserId AND isActive = 1
  ) AS isParticipant;
END //

-- ============================================================
-- SP: spUpdateConversationLastMessage
-- Updates the last message reference on a conversation.
-- ============================================================
CREATE PROCEDURE spUpdateConversationLastMessage(
  IN pConversationId CHAR(36),
  IN pMessageId CHAR(36)
)
BEGIN
  UPDATE conversations SET
    lastMessageId = pMessageId,
    lastMessageAt = NOW()
  WHERE conversationId = pConversationId;
END //

-- ============================================================
-- SP: spCreateMessage
-- Inserts a new message into a conversation.
-- ============================================================
CREATE PROCEDURE spCreateMessage(
  IN pMessageId CHAR(36),
  IN pConversationId CHAR(36),
  IN pSenderId CHAR(36),
  IN pContent TEXT,
  IN pMessageType VARCHAR(10),
  IN pAttachmentUrl VARCHAR(500)
)
BEGIN
  INSERT INTO messages (messageId, conversationId, senderId, content, messageType, attachmentUrl)
  VALUES (pMessageId, pConversationId, pSenderId, pContent, pMessageType, pAttachmentUrl);

  -- Update conversation last message
  UPDATE conversations SET
    lastMessageId = pMessageId,
    lastMessageAt = NOW()
  WHERE conversationId = pConversationId;

  -- Return the created message
  SELECT m.messageId, m.conversationId, m.senderId, m.content, m.messageType,
         m.attachmentUrl, m.status, m.createdAt,
         u.firstName AS senderFirstName, u.lastName AS senderLastName, u.avatarUrl AS senderAvatar
  FROM messages m
  INNER JOIN users u ON m.senderId = u.userId
  WHERE m.messageId = pMessageId;
END //

-- ============================================================
-- SP: spGetMessages
-- Retrieves paginated messages for a conversation.
-- ============================================================
CREATE PROCEDURE spGetMessages(
  IN pConversationId CHAR(36),
  IN pLimit INT,
  IN pOffset INT,
  IN pBefore DATETIME
)
BEGIN
  SELECT m.messageId, m.conversationId, m.senderId, m.content, m.messageType,
         m.attachmentUrl, m.status, m.isDeleted, m.createdAt,
         u.firstName AS senderFirstName, u.lastName AS senderLastName,
         u.username AS senderUsername, u.avatarUrl AS senderAvatar
  FROM messages m
  INNER JOIN users u ON m.senderId = u.userId
  WHERE m.conversationId = pConversationId
    AND m.isDeleted = 0
    AND (pBefore IS NULL OR m.createdAt < pBefore)
  ORDER BY m.createdAt DESC
  LIMIT pLimit OFFSET pOffset;

  SELECT COUNT(*) AS total
  FROM messages
  WHERE conversationId = pConversationId AND isDeleted = 0;
END //

-- ============================================================
-- SP: spGetMessageById
-- Gets a single message by ID.
-- ============================================================
CREATE PROCEDURE spGetMessageById(
  IN pMessageId CHAR(36)
)
BEGIN
  SELECT messageId, conversationId, senderId, content, messageType,
         attachmentUrl, status, isDeleted, createdAt
  FROM messages
  WHERE messageId = pMessageId;
END //

-- ============================================================
-- SP: spDeleteMessage
-- Soft-deletes a message (only by sender).
-- ============================================================
CREATE PROCEDURE spDeleteMessage(
  IN pMessageId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  UPDATE messages SET
    isDeleted = 1,
    status = 'deleted',
    content = 'This message was deleted'
  WHERE messageId = pMessageId AND senderId = pUserId;

  SELECT messageId, conversationId, status FROM messages WHERE messageId = pMessageId;
END //

-- ============================================================
-- SP: spMarkMessageDelivered
-- Marks a message as delivered to a specific user.
-- ============================================================
CREATE PROCEDURE spMarkMessageDelivered(
  IN pMessageId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  INSERT INTO messageReceipts (messageId, userId, deliveredAt)
  VALUES (pMessageId, pUserId, NOW())
  ON DUPLICATE KEY UPDATE deliveredAt = COALESCE(deliveredAt, NOW());
END //

-- ============================================================
-- SP: spMarkMessagesRead
-- Marks all unread messages in a conversation as read for a user.
-- ============================================================
CREATE PROCEDURE spMarkMessagesRead(
  IN pConversationId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  -- Update receipts
  INSERT INTO messageReceipts (messageId, userId, readAt)
  SELECT m.messageId, pUserId, NOW()
  FROM messages m
  WHERE m.conversationId = pConversationId
    AND m.senderId != pUserId
    AND m.messageId NOT IN (
      SELECT messageId FROM messageReceipts WHERE userId = pUserId AND readAt IS NOT NULL
    )
  ON DUPLICATE KEY UPDATE readAt = COALESCE(readAt, NOW());

  -- Update participant's last read timestamp
  UPDATE conversationParticipants SET lastReadAt = NOW()
  WHERE conversationId = pConversationId AND userId = pUserId;
END //

-- ============================================================
-- SP: spGetUnreadMessageCount
-- Gets total unread message count across all conversations.
-- ============================================================
CREATE PROCEDURE spGetUnreadMessageCount(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT COUNT(*) AS unreadCount
  FROM messages m
  INNER JOIN conversationParticipants cp ON m.conversationId = cp.conversationId
  WHERE cp.userId = pUserId
    AND m.senderId != pUserId
    AND m.isDeleted = 0
    AND m.createdAt > COALESCE(cp.lastReadAt, '1970-01-01');
END //

DELIMITER ;
