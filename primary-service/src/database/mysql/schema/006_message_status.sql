-- =============================================
-- 006: Message Status Consolidation
-- Consolidates per-user message delivery/read/seen/failed status into a
-- single source of truth: messageReceipts. The duplicate `messageDelivery`
-- table (003) is removed. Uses the common idempotent DDL helpers so the
-- migration is safely re-runnable.
-- Requires: procedures/000_common_ddl_helpers.sql
-- =============================================

USE chat_system;

-- Expand the sender-facing message lifecycle states.
CALL spAlterTableColumn(
  'MODIFY', 'messages', 'status',
  "ENUM('sending','sent','delivered','read','seen','failed','deleted') NOT NULL DEFAULT 'sent'",
  NULL
);

-- Promote messageReceipts to the single per-user status table.
CALL spAlterTableColumn('ADD', 'messageReceipts', 'status',
  "ENUM('sent','delivered','seen','failed') NOT NULL DEFAULT 'sent'", 'AFTER `userId`');
CALL spAlterTableColumn('ADD', 'messageReceipts', 'seenAt', "DATETIME DEFAULT NULL", 'AFTER `readAt`');
CALL spAlterTableColumn('ADD', 'messageReceipts', 'failedAt', "DATETIME DEFAULT NULL", 'AFTER `seenAt`');
CALL spAddIndexIfNotExists('messageReceipts', 'idxReceiptsStatus', '`status`');

-- Remove the duplicate delivery table and its dead procedures.
DROP PROCEDURE IF EXISTS spTrackMessageDelivery;
DROP PROCEDURE IF EXISTS spMarkConversationRead;
DROP TABLE IF EXISTS messageDelivery;
