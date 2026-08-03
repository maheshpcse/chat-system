-- ============================================================
-- 000: Common DDL Helper Procedures (idempotent schema changes)
-- MySQL lacks "ADD COLUMN IF NOT EXISTS", so these procedures emulate it
-- using INFORMATION_SCHEMA guards. All schema ALTERs go through these,
-- making every migration safely re-runnable.
--
--   CALL spAlterTableColumn('ADD',    'tbl', 'col', "VARCHAR(100) NULL", 'AFTER other');
--   CALL spAlterTableColumn('MODIFY', 'tbl', 'col', "ENUM('a','b') NOT NULL DEFAULT 'a'", NULL);
--   CALL spAlterTableColumn('DROP',   'tbl', 'col', NULL, NULL);
--   CALL spAddIndexIfNotExists('tbl', 'idxName', 'colA, colB');
--   CALL spAddForeignKeyIfNotExists('tbl', 'fkName', 'FOREIGN KEY (col) REFERENCES other(col) ON DELETE CASCADE');
-- ============================================================

USE chat_system;

DROP PROCEDURE IF EXISTS spAlterTableColumn;
DROP PROCEDURE IF EXISTS spAddIndexIfNotExists;
DROP PROCEDURE IF EXISTS spAddForeignKeyIfNotExists;

DELIMITER //

-- ------------------------------------------------------------
-- spAlterTableColumn: idempotent ADD / DROP / MODIFY of a column.
-- pAction    : 'ADD' | 'DROP' | 'MODIFY'
-- pDefinition: column definition (ignored for DROP)
-- pPosition  : 'FIRST' | 'AFTER `col`' | NULL
-- ------------------------------------------------------------
CREATE PROCEDURE spAlterTableColumn(
  IN pAction VARCHAR(16),
  IN pTable VARCHAR(64),
  IN pColumn VARCHAR(64),
  IN pDefinition TEXT,
  IN pPosition VARCHAR(128)
)
BEGIN
  DECLARE vExists INT DEFAULT 0;
  DECLARE vSql TEXT DEFAULT NULL;

  SELECT COUNT(*) INTO vExists
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = pTable
    AND COLUMN_NAME = pColumn;

  IF UPPER(pAction) = 'ADD' THEN
    IF vExists = 0 THEN
      SET vSql = CONCAT('ALTER TABLE `', pTable, '` ADD COLUMN `', pColumn, '` ',
                        pDefinition, IFNULL(CONCAT(' ', pPosition), ''));
    END IF;
  ELSEIF UPPER(pAction) = 'DROP' THEN
    IF vExists = 1 THEN
      SET vSql = CONCAT('ALTER TABLE `', pTable, '` DROP COLUMN `', pColumn, '`');
    END IF;
  ELSEIF UPPER(pAction) = 'MODIFY' THEN
    IF vExists = 1 THEN
      SET vSql = CONCAT('ALTER TABLE `', pTable, '` MODIFY COLUMN `', pColumn, '` ',
                        pDefinition, IFNULL(CONCAT(' ', pPosition), ''));
    END IF;
  ELSE
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'INVALID_ALTER_ACTION (use ADD/DROP/MODIFY)';
  END IF;

  IF vSql IS NOT NULL THEN
    SET @ddl = vSql;
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

-- ------------------------------------------------------------
-- spAddIndexIfNotExists: add a plain index only if absent.
-- ------------------------------------------------------------
CREATE PROCEDURE spAddIndexIfNotExists(
  IN pTable VARCHAR(64),
  IN pIndexName VARCHAR(64),
  IN pColumns TEXT
)
BEGIN
  DECLARE vExists INT DEFAULT 0;

  SELECT COUNT(*) INTO vExists
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = pTable
    AND INDEX_NAME = pIndexName;

  IF vExists = 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', pTable, '` ADD INDEX `', pIndexName, '` (', pColumns, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

-- ------------------------------------------------------------
-- spAddForeignKeyIfNotExists: add a named FK only if absent.
-- pDefinition example: 'FOREIGN KEY (`col`) REFERENCES `other`(`col`) ON DELETE SET NULL'
-- ------------------------------------------------------------
CREATE PROCEDURE spAddForeignKeyIfNotExists(
  IN pTable VARCHAR(64),
  IN pConstraintName VARCHAR(64),
  IN pDefinition TEXT
)
BEGIN
  DECLARE vExists INT DEFAULT 0;

  SELECT COUNT(*) INTO vExists
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = pTable
    AND CONSTRAINT_NAME = pConstraintName;

  IF vExists = 0 THEN
    SET @ddl = CONCAT('ALTER TABLE `', pTable, '` ADD CONSTRAINT `', pConstraintName, '` ', pDefinition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END //

DELIMITER ;
