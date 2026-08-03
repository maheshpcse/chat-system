-- ============================================================
-- STORED PROCEDURES - Admin Auth Module
-- ============================================================

USE chat_system;

DELIMITER //

-- ============================================================
-- SP: spCreateAdmin
-- ============================================================
DROP PROCEDURE IF EXISTS spCreateAdmin //
CREATE PROCEDURE spCreateAdmin(
  IN pAdminId CHAR(36),
  IN pEmail VARCHAR(255),
  IN pPasswordHash VARCHAR(255),
  IN pFirstName VARCHAR(50),
  IN pLastName VARCHAR(50),
  IN pRole VARCHAR(20)
)
BEGIN
  INSERT INTO admins (adminId, email, passwordHash, firstName, lastName, role)
  VALUES (pAdminId, pEmail, pPasswordHash, pFirstName, pLastName, pRole);

  SELECT adminId, email, firstName, lastName, role, status, createdAt
  FROM admins WHERE adminId = pAdminId;
END //

-- ============================================================
-- SP: spGetAdminByEmail
-- ============================================================
DROP PROCEDURE IF EXISTS spGetAdminByEmail //
CREATE PROCEDURE spGetAdminByEmail(
  IN pEmail VARCHAR(255)
)
BEGIN
  SELECT adminId, email, passwordHash, firstName, lastName, role, status, lastLoginAt, createdAt
  FROM admins
  WHERE email = pEmail;
END //

-- ============================================================
-- SP: spGetAdminById
-- ============================================================
DROP PROCEDURE IF EXISTS spGetAdminById //
CREATE PROCEDURE spGetAdminById(
  IN pAdminId CHAR(36)
)
BEGIN
  SELECT adminId, email, firstName, lastName, role, status, lastLoginAt, createdAt
  FROM admins
  WHERE adminId = pAdminId;
END //

-- ============================================================
-- SP: spUpdateAdminLastLogin
-- ============================================================
DROP PROCEDURE IF EXISTS spUpdateAdminLastLogin //
CREATE PROCEDURE spUpdateAdminLastLogin(
  IN pAdminId CHAR(36)
)
BEGIN
  UPDATE admins SET lastLoginAt = NOW() WHERE adminId = pAdminId;
END //

-- ============================================================
-- SP: spStoreAdminRefreshToken
-- ============================================================
DROP PROCEDURE IF EXISTS spStoreAdminRefreshToken //
CREATE PROCEDURE spStoreAdminRefreshToken(
  IN pAdminId CHAR(36),
  IN pToken TEXT,
  IN pExpiresAt DATETIME
)
BEGIN
  INSERT INTO admin_refresh_tokens (adminId, token, expiresAt)
  VALUES (pAdminId, pToken, pExpiresAt);

  SELECT id, adminId, expiresAt, createdAt
  FROM admin_refresh_tokens
  WHERE id = LAST_INSERT_ID();
END //

-- ============================================================
-- SP: spValidateAdminRefreshToken
-- ============================================================
DROP PROCEDURE IF EXISTS spValidateAdminRefreshToken //
CREATE PROCEDURE spValidateAdminRefreshToken(
  IN pAdminId CHAR(36),
  IN pToken TEXT
)
BEGIN
  SELECT id, adminId, token, expiresAt, isRevoked, createdAt
  FROM admin_refresh_tokens
  WHERE adminId = pAdminId
    AND token = pToken
    AND isRevoked = 0
    AND expiresAt > NOW()
  LIMIT 1;
END //

-- ============================================================
-- SP: spRevokeAdminRefreshToken
-- ============================================================
DROP PROCEDURE IF EXISTS spRevokeAdminRefreshToken //
CREATE PROCEDURE spRevokeAdminRefreshToken(
  IN pAdminId CHAR(36),
  IN pToken TEXT
)
BEGIN
  UPDATE admin_refresh_tokens
  SET isRevoked = 1
  WHERE adminId = pAdminId AND token = pToken AND isRevoked = 0;
END //

-- ============================================================
-- SP: spRevokeAllAdminRefreshTokens
-- ============================================================
DROP PROCEDURE IF EXISTS spRevokeAllAdminRefreshTokens //
CREATE PROCEDURE spRevokeAllAdminRefreshTokens(
  IN pAdminId CHAR(36)
)
BEGIN
  UPDATE admin_refresh_tokens
  SET isRevoked = 1
  WHERE adminId = pAdminId AND isRevoked = 0;
END //

-- ============================================================
-- SP: spCreateFakerSession
-- ============================================================
DROP PROCEDURE IF EXISTS spCreateFakerSession //
CREATE PROCEDURE spCreateFakerSession(
  IN pSessionId CHAR(36),
  IN pAdminId CHAR(36),
  IN pEntityType VARCHAR(50),
  IN pAction VARCHAR(20),
  IN pRecordCount INT UNSIGNED,
  IN pPayloadJson JSON
)
BEGIN
  INSERT INTO admin_faker_sessions (sessionId, adminId, entityType, action, recordCount, payloadJson)
  VALUES (pSessionId, pAdminId, pEntityType, pAction, pRecordCount, pPayloadJson);

  SELECT sessionId, adminId, entityType, action, recordCount, createdAt
  FROM admin_faker_sessions WHERE sessionId = pSessionId;
END //

-- ============================================================
-- SP: spGetDashboardStats
-- Aggregate counters for admin dashboard cards.
-- ============================================================
DROP PROCEDURE IF EXISTS spGetDashboardStats //
CREATE PROCEDURE spGetDashboardStats()
BEGIN
  SELECT
    (SELECT COUNT(*) FROM users) AS totalUsers,
    (SELECT COUNT(*) FROM users WHERE isOnline = 1) AS onlineUsers,
    (SELECT COUNT(*) FROM users WHERE status = 'active') AS activeUsers,
    (SELECT COUNT(*) FROM users WHERE status = 'banned') AS bannedUsers,
    (SELECT COUNT(*) FROM chatGroups) AS totalGroups,
    (SELECT COUNT(*) FROM messages WHERE isDeleted = 0) AS totalMessages,
    (SELECT COUNT(*) FROM conversations WHERE conversationType = 'private') AS privateConversations,
    (SELECT COUNT(*) FROM conversations WHERE conversationType = 'group') AS groupConversations,
    (SELECT COUNT(*) FROM userContacts WHERE status = 'active') AS totalFriends,
    (SELECT COUNT(*) FROM contactRequests WHERE status = 'pending') AS pendingFriendRequests,
    (SELECT COUNT(*) FROM notifications WHERE isRead = 0) AS unreadNotifications;
END //

-- ============================================================
-- SP: spGetRecentActivity
-- Recent users + messages for dashboard feed.
-- ============================================================
DROP PROCEDURE IF EXISTS spGetRecentActivity //
CREATE PROCEDURE spGetRecentActivity(
  IN pLimit INT
)
BEGIN
  SELECT 'user_registered' AS activityType,
         u.userId AS entityId,
         CONCAT(u.firstName, ' ', u.lastName) AS title,
         u.email AS subtitle,
         u.createdAt AS occurredAt
  FROM users u
  ORDER BY u.createdAt DESC
  LIMIT pLimit;

  SELECT 'message_sent' AS activityType,
         m.messageId AS entityId,
         LEFT(m.content, 80) AS title,
         m.senderId AS subtitle,
         m.createdAt AS occurredAt
  FROM messages m
  WHERE m.isDeleted = 0
  ORDER BY m.createdAt DESC
  LIMIT pLimit;
END //

-- ============================================================
-- SP: spListUsersAdmin
-- Paginated user list for admin panel.
-- ============================================================
DROP PROCEDURE IF EXISTS spListUsersAdmin //
CREATE PROCEDURE spListUsersAdmin(
  IN pSearch VARCHAR(255),
  IN pStatus VARCHAR(20),
  IN pRole VARCHAR(20),
  IN pOffset INT,
  IN pLimit INT
)
BEGIN
  SELECT userId, firstName, lastName, email, username, phoneNumber,
         avatarUrl, role, status, isOnline, lastLoginAt, lastSeenAt, createdAt
  FROM users
  WHERE (pSearch IS NULL OR pSearch = ''
         OR email LIKE CONCAT('%', pSearch, '%')
         OR username LIKE CONCAT('%', pSearch, '%')
         OR firstName LIKE CONCAT('%', pSearch, '%')
         OR lastName LIKE CONCAT('%', pSearch, '%'))
    AND (pStatus IS NULL OR pStatus = '' OR status = pStatus)
    AND (pRole IS NULL OR pRole = '' OR role = pRole)
  ORDER BY createdAt DESC
  LIMIT pOffset, pLimit;

  SELECT COUNT(*) AS total
  FROM users
  WHERE (pSearch IS NULL OR pSearch = ''
         OR email LIKE CONCAT('%', pSearch, '%')
         OR username LIKE CONCAT('%', pSearch, '%')
         OR firstName LIKE CONCAT('%', pSearch, '%')
         OR lastName LIKE CONCAT('%', pSearch, '%'))
    AND (pStatus IS NULL OR pStatus = '' OR status = pStatus)
    AND (pRole IS NULL OR pRole = '' OR role = pRole);
END //

-- ============================================================
-- SP: spUpdateUserStatusAdmin
-- ============================================================
DROP PROCEDURE IF EXISTS spUpdateUserStatusAdmin //
CREATE PROCEDURE spUpdateUserStatusAdmin(
  IN pUserId CHAR(36),
  IN pStatus VARCHAR(20)
)
BEGIN
  UPDATE users SET status = pStatus WHERE userId = pUserId;

  SELECT userId, firstName, lastName, email, username, role, status, isOnline, createdAt
  FROM users WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spBulkInsertUser
-- Insert one faker user (called in loop / transaction from service).
-- ============================================================
DROP PROCEDURE IF EXISTS spBulkInsertUser //
CREATE PROCEDURE spBulkInsertUser(
  IN pUserId CHAR(36),
  IN pFirstName VARCHAR(50),
  IN pLastName VARCHAR(50),
  IN pEmail VARCHAR(255),
  IN pUsername VARCHAR(30),
  IN pPasswordHash VARCHAR(255),
  IN pPhoneNumber VARCHAR(20),
  IN pBio VARCHAR(500),
  IN pRole VARCHAR(20),
  IN pStatus VARCHAR(20)
)
BEGIN
  INSERT INTO users (
    userId, firstName, lastName, email, username, passwordHash,
    phoneNumber, bio, role, status
  ) VALUES (
    pUserId, pFirstName, pLastName, pEmail, pUsername, pPasswordHash,
    pPhoneNumber, pBio, pRole, pStatus
  );

  SELECT userId, firstName, lastName, email, username, role, status, createdAt
  FROM users WHERE userId = pUserId;
END //

DELIMITER ;
