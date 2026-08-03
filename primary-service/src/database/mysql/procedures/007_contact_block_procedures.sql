-- ============================================================
-- STORED PROCEDURES - Contact Blocking
-- spBlockContact / spUnblockContact / spIsBlocked
-- ============================================================

USE chat_system;

DROP PROCEDURE IF EXISTS spBlockContact;
DROP PROCEDURE IF EXISTS spUnblockContact;
DROP PROCEDURE IF EXISTS spIsBlocked;

DELIMITER //

-- ============================================================
-- SP: spBlockContact
-- Records a directional block and marks the blocker's contact row blocked.
-- Idempotent: re-blocking reactivates an existing record.
-- ============================================================
CREATE PROCEDURE spBlockContact(
  IN pBlockId CHAR(36),
  IN pBlockerUserId CHAR(36),
  IN pBlockedUserId CHAR(36),
  IN pReason VARCHAR(255)
)
BEGIN
  IF pBlockerUserId = pBlockedUserId THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CANNOT_BLOCK_SELF';
  END IF;

  INSERT INTO blockedContacts (blockId, blockerUserId, blockedUserId, reason, status, blockedAt)
  VALUES (pBlockId, pBlockerUserId, pBlockedUserId, pReason, 'active', NOW())
  ON DUPLICATE KEY UPDATE
    status = 'active',
    reason = pReason,
    blockedAt = NOW(),
    unblockedAt = NULL;

  -- Reflect the block on the blocker's contact relationship (if any).
  UPDATE userContacts
  SET status = 'blocked'
  WHERE userId = pBlockerUserId AND contactUserId = pBlockedUserId;

  SELECT pBlockId AS blockId, pBlockerUserId AS blockerUserId,
         pBlockedUserId AS blockedUserId, 'active' AS status;
END //

-- ============================================================
-- SP: spUnblockContact
-- Lifts a block and restores the contact relationship to active.
-- ============================================================
CREATE PROCEDURE spUnblockContact(
  IN pBlockerUserId CHAR(36),
  IN pBlockedUserId CHAR(36)
)
BEGIN
  UPDATE blockedContacts
  SET status = 'removed', unblockedAt = NOW()
  WHERE blockerUserId = pBlockerUserId
    AND blockedUserId = pBlockedUserId
    AND status = 'active';

  UPDATE userContacts
  SET status = 'active'
  WHERE userId = pBlockerUserId
    AND contactUserId = pBlockedUserId
    AND status = 'blocked';

  SELECT ROW_COUNT() AS affected;
END //

-- ============================================================
-- SP: spIsBlocked
-- Returns blocked=1 if EITHER user has an active block on the other.
-- Used to enforce messaging / conversation / presence rules.
-- ============================================================
CREATE PROCEDURE spIsBlocked(
  IN pUserId1 CHAR(36),
  IN pUserId2 CHAR(36)
)
BEGIN
  SELECT COUNT(*) AS blocked
  FROM blockedContacts
  WHERE status = 'active'
    AND (
      (blockerUserId = pUserId1 AND blockedUserId = pUserId2)
      OR (blockerUserId = pUserId2 AND blockedUserId = pUserId1)
    );
END //

DELIMITER ;
