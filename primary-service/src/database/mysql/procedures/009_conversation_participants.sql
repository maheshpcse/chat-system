-- ============================================================
-- 009: Conversation participants lookup
-- Returns active participants of a conversation (with conversationType)
-- so services can enforce block rules and fan out notifications.
-- ============================================================

USE chat_system;

DROP PROCEDURE IF EXISTS spGetConversationParticipants;

DELIMITER //

CREATE PROCEDURE spGetConversationParticipants(
  IN pConversationId CHAR(36)
)
BEGIN
  SELECT cp.userId, cp.isActive, c.conversationType
  FROM conversationParticipants cp
  INNER JOIN conversations c ON c.conversationId = cp.conversationId
  WHERE cp.conversationId = pConversationId
    AND cp.isActive = 1;
END //

DELIMITER ;
