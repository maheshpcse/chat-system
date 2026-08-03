-- =============================================
-- 007: Contact Blocking + Contact Personalization
-- Adds a dedicated blockedContacts table and per-contact personalization
-- columns (nickname / muted / pinned) on userContacts.
-- Uses the common idempotent DDL helpers.
-- Requires: procedures/000_common_ddl_helpers.sql
-- =============================================

USE chat_system;

-- Per-contact personalization
CALL spAlterTableColumn('ADD', 'userContacts', 'nickname', "VARCHAR(100) DEFAULT NULL", 'AFTER `status`');
CALL spAlterTableColumn('ADD', 'userContacts', 'muted', "TINYINT(1) NOT NULL DEFAULT 0", 'AFTER `nickname`');
CALL spAlterTableColumn('ADD', 'userContacts', 'pinned', "TINYINT(1) NOT NULL DEFAULT 0", 'AFTER `muted`');

-- Dedicated, directional, auditable block records
CREATE TABLE IF NOT EXISTS blockedContacts (
  blockId CHAR(36) NOT NULL,
  blockerUserId CHAR(36) NOT NULL,
  blockedUserId CHAR(36) NOT NULL,
  reason VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'removed') NOT NULL DEFAULT 'active',
  blockedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unblockedAt DATETIME DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (blockId),
  UNIQUE KEY ukBlockerBlocked (blockerUserId, blockedUserId),
  INDEX idxBlockedBlocker (blockerUserId, status),
  INDEX idxBlockedBlocked (blockedUserId, status),
  CONSTRAINT fkBlockedBlocker FOREIGN KEY (blockerUserId) REFERENCES users(userId) ON DELETE CASCADE,
  CONSTRAINT fkBlockedBlocked FOREIGN KEY (blockedUserId) REFERENCES users(userId) ON DELETE CASCADE,
  CONSTRAINT chkBlockNotSelf CHECK (blockerUserId != blockedUserId)
);
