-- ====================================================
-- 005: Presence & Delivery Stored Procedures
-- ====================================================

DELIMITER //

-- Update user presence on connect
CREATE PROCEDURE IF NOT EXISTS `spUserConnected`(
  IN p_userId CHAR(36)
)
BEGIN
  INSERT INTO userPresence (userId, isOnline, activeSocketCount, lastConnectedAt, lastSeenAt)
  VALUES (p_userId, 1, 1, NOW(), NOW())
  ON DUPLICATE KEY UPDATE
    isOnline = 1,
    activeSocketCount = activeSocketCount + 1,
    lastConnectedAt = NOW(),
    lastSeenAt = NOW();
END //

-- Update user presence on disconnect
CREATE PROCEDURE IF NOT EXISTS `spUserDisconnected`(
  IN p_userId CHAR(36)
)
BEGIN
  UPDATE userPresence
  SET activeSocketCount = GREATEST(activeSocketCount - 1, 0),
      lastDisconnectedAt = NOW(),
      lastSeenAt = NOW(),
      isOnline = CASE WHEN activeSocketCount <= 1 THEN 0 ELSE 1 END
  WHERE userId = p_userId;
END //

-- Get user presence
CREATE PROCEDURE IF NOT EXISTS `spGetUserPresence`(
  IN p_userId CHAR(36)
)
BEGIN
  SELECT userId, isOnline, activeSocketCount, lastSeenAt, lastConnectedAt, lastDisconnectedAt
  FROM userPresence
  WHERE userId = p_userId;
END //

-- Track message delivery
CREATE PROCEDURE IF NOT EXISTS `spTrackMessageDelivery`(
  IN p_messageId CHAR(36),
  IN p_userId CHAR(36),
  IN p_status ENUM('sent', 'delivered', 'read')
)
BEGIN
  INSERT INTO messageDelivery (messageId, userId, status, deliveredAt, readAt)
  VALUES (
    p_messageId,
    p_userId,
    p_status,
    CASE WHEN p_status IN ('delivered', 'read') THEN NOW() ELSE NULL END,
    CASE WHEN p_status = 'read' THEN NOW() ELSE NULL END
  )
  ON DUPLICATE KEY UPDATE
    status = p_status,
    deliveredAt = COALESCE(deliveredAt, CASE WHEN p_status IN ('delivered', 'read') THEN NOW() ELSE NULL END),
    readAt = COALESCE(readAt, CASE WHEN p_status = 'read' THEN NOW() ELSE NULL END);
END //

-- Mark messages as read for a conversation
CREATE PROCEDURE IF NOT EXISTS `spMarkConversationRead`(
  IN p_conversationId CHAR(36),
  IN p_userId CHAR(36)
)
BEGIN
  UPDATE messageDelivery md
  INNER JOIN messages m ON md.messageId = m.messageId
  SET md.status = 'read', md.readAt = NOW()
  WHERE m.conversationId = p_conversationId
    AND md.userId = p_userId
    AND md.status != 'read';
END //

-- Track shared media
CREATE PROCEDURE IF NOT EXISTS `spTrackSharedMedia`(
  IN p_conversationId CHAR(36),
  IN p_messageId CHAR(36),
  IN p_fileUrl VARCHAR(500),
  IN p_fileType ENUM('image', 'video', 'audio', 'document', 'other'),
  IN p_fileName VARCHAR(255),
  IN p_fileSize BIGINT,
  IN p_uploadedBy CHAR(36)
)
BEGIN
  INSERT INTO sharedMedia (conversationId, messageId, fileUrl, fileType, fileName, fileSize, uploadedBy)
  VALUES (p_conversationId, p_messageId, p_fileUrl, p_fileType, p_fileName, p_fileSize, p_uploadedBy);
END //

-- Get shared media count for a conversation
CREATE PROCEDURE IF NOT EXISTS `spGetSharedMediaCount`(
  IN p_conversationId CHAR(36)
)
BEGIN
  SELECT
    COUNT(*) AS totalCount,
    SUM(CASE WHEN fileType = 'image' THEN 1 ELSE 0 END) AS imageCount,
    SUM(CASE WHEN fileType = 'video' THEN 1 ELSE 0 END) AS videoCount,
    SUM(CASE WHEN fileType = 'document' THEN 1 ELSE 0 END) AS documentCount,
    SUM(CASE WHEN fileType = 'audio' THEN 1 ELSE 0 END) AS audioCount
  FROM sharedMedia
  WHERE conversationId = p_conversationId;
END //

-- Get shared media for a conversation (paginated)
CREATE PROCEDURE IF NOT EXISTS `spGetSharedMedia`(
  IN p_conversationId CHAR(36),
  IN p_limit INT,
  IN p_offset INT
)
BEGIN
  SELECT mediaId, conversationId, messageId, fileUrl, fileType, fileName, fileSize, uploadedBy, createdAt
  FROM sharedMedia
  WHERE conversationId = p_conversationId
  ORDER BY createdAt DESC
  LIMIT p_limit OFFSET p_offset;
END //

DELIMITER ;
