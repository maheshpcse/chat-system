-- ============================================================
-- 010: Contact Settings (nickname / muted / pinned)
-- Per-contact personalization update for the blocker/owner's row.
-- ============================================================

USE chat_system;

DROP PROCEDURE IF EXISTS spUpdateContactSettings;

DELIMITER //

CREATE PROCEDURE spUpdateContactSettings(
  IN pUserId CHAR(36),
  IN pContactUserId CHAR(36),
  IN pNickname VARCHAR(100),
  IN pMuted TINYINT(1),
  IN pPinned TINYINT(1)
)
BEGIN
  UPDATE userContacts
  SET
    nickname = pNickname,
    muted = COALESCE(pMuted, muted),
    pinned = COALESCE(pPinned, pinned),
    updatedAt = NOW()
  WHERE userId = pUserId AND contactUserId = pContactUserId;

  SELECT contactId, userId, contactUserId, status, nickname, muted, pinned
  FROM userContacts
  WHERE userId = pUserId AND contactUserId = pContactUserId;
END //

DELIMITER ;
