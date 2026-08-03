-- ============================================================
-- ADMIN MODULE TABLES
-- Dedicated admin identity + tokens + faker session audit.
-- Separate from chat `users` table.
-- ============================================================

USE chat_system;

-- ============================================================
-- TABLE: admins
-- Platform administrators (not chat users).
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
  adminId CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  firstName VARCHAR(50) NOT NULL,
  lastName VARCHAR(50) NOT NULL,
  role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'admin',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  lastLoginAt DATETIME DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (adminId),
  UNIQUE KEY ukAdminsEmail (email),
  INDEX idxAdminsStatus (status),
  INDEX idxAdminsRole (role)
);

-- ============================================================
-- TABLE: admin_refresh_tokens
-- JWT refresh tokens for admin sessions only.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_refresh_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  adminId CHAR(36) NOT NULL,
  token TEXT NOT NULL,
  expiresAt DATETIME NOT NULL,
  isRevoked TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idxAdminRefreshTokensAdminId (adminId),
  INDEX idxAdminRefreshTokensExpiry (expiresAt),
  CONSTRAINT fkAdminRefreshTokensAdmin
    FOREIGN KEY (adminId) REFERENCES admins(adminId) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: admin_faker_sessions
-- Audit trail for sample-data generate / preview / save ops.
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_faker_sessions (
  sessionId CHAR(36) NOT NULL,
  adminId CHAR(36) NOT NULL,
  entityType VARCHAR(50) NOT NULL,
  action ENUM('generate', 'preview', 'save', 'discard') NOT NULL,
  recordCount INT UNSIGNED NOT NULL DEFAULT 0,
  payloadJson JSON DEFAULT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (sessionId),
  INDEX idxFakerSessionsAdminId (adminId),
  INDEX idxFakerSessionsEntity (entityType),
  INDEX idxFakerSessionsCreatedAt (createdAt),
  CONSTRAINT fkFakerSessionsAdmin
    FOREIGN KEY (adminId) REFERENCES admins(adminId) ON DELETE CASCADE
);
