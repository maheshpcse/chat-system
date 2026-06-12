-- ============================================================
-- STORED PROCEDURES - Authentication Module
-- ============================================================

USE chat_system;

DELIMITER //

-- ============================================================
-- SP: spCreateUser
-- Creates a new user account.
-- ============================================================
CREATE PROCEDURE spCreateUser(
  IN pUserId CHAR(36),
  IN pFirstName VARCHAR(50),
  IN pLastName VARCHAR(50),
  IN pEmail VARCHAR(255),
  IN pUsername VARCHAR(30),
  IN pPasswordHash VARCHAR(255),
  IN pPhoneNumber VARCHAR(20)
)
BEGIN
  INSERT INTO users (userId, firstName, lastName, email, username, passwordHash, phoneNumber)
  VALUES (pUserId, pFirstName, pLastName, pEmail, pUsername, pPasswordHash, pPhoneNumber);

  SELECT userId, firstName, lastName, email, username, role, status, createdAt
  FROM users WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spGetUserByEmail
-- Retrieves user by email for login authentication.
-- ============================================================
CREATE PROCEDURE spGetUserByEmail(
  IN pEmail VARCHAR(255)
)
BEGIN
  SELECT userId, firstName, lastName, email, username, passwordHash, phoneNumber,
         avatarUrl, bio, role, status, isOnline, lastLoginAt, createdAt
  FROM users
  WHERE email = pEmail;
END //

-- ============================================================
-- SP: spGetUserByUsername
-- Retrieves user by username.
-- ============================================================
CREATE PROCEDURE spGetUserByUsername(
  IN pUsername VARCHAR(30)
)
BEGIN
  SELECT userId, firstName, lastName, email, username, role, status, createdAt
  FROM users
  WHERE username = pUsername;
END //

-- ============================================================
-- SP: spGetUserById
-- Retrieves user profile by ID.
-- ============================================================
CREATE PROCEDURE spGetUserById(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT userId, firstName, lastName, email, username, phoneNumber,
         avatarUrl, bio, role, status, isOnline, lastLoginAt, lastSeenAt, createdAt
  FROM users
  WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spUpdateUserProfile
-- Updates user profile fields (only non-null values).
-- ============================================================
CREATE PROCEDURE spUpdateUserProfile(
  IN pUserId CHAR(36),
  IN pFirstName VARCHAR(50),
  IN pLastName VARCHAR(50),
  IN pPhoneNumber VARCHAR(20),
  IN pAvatarUrl VARCHAR(500),
  IN pBio VARCHAR(500)
)
BEGIN
  UPDATE users SET
    firstName = COALESCE(pFirstName, firstName),
    lastName = COALESCE(pLastName, lastName),
    phoneNumber = COALESCE(pPhoneNumber, phoneNumber),
    avatarUrl = COALESCE(pAvatarUrl, avatarUrl),
    bio = COALESCE(pBio, bio)
  WHERE userId = pUserId;

  SELECT userId, firstName, lastName, email, username, phoneNumber,
         avatarUrl, bio, role, status, isOnline
  FROM users WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spUpdateUserPassword
-- Updates user password hash.
-- ============================================================
CREATE PROCEDURE spUpdateUserPassword(
  IN pUserId CHAR(36),
  IN pNewPasswordHash VARCHAR(255)
)
BEGIN
  UPDATE users SET passwordHash = pNewPasswordHash WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spUpdateLastLogin
-- Updates user last login timestamp.
-- ============================================================
CREATE PROCEDURE spUpdateLastLogin(
  IN pUserId CHAR(36)
)
BEGIN
  UPDATE users SET lastLoginAt = NOW() WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spUpdateUserOnlineStatus
-- Updates user online/offline status.
-- ============================================================
CREATE PROCEDURE spUpdateUserOnlineStatus(
  IN pUserId CHAR(36),
  IN pIsOnline TINYINT(1)
)
BEGIN
  UPDATE users SET
    isOnline = pIsOnline,
    lastSeenAt = CASE WHEN pIsOnline = 0 THEN NOW() ELSE lastSeenAt END
  WHERE userId = pUserId;
END //

-- ============================================================
-- SP: spSearchUsers
-- Searches users by name, email, or username.
-- ============================================================
CREATE PROCEDURE spSearchUsers(
  IN pSearchTerm VARCHAR(100),
  IN pLimit INT,
  IN pOffset INT
)
BEGIN
  DECLARE searchPattern VARCHAR(102);
  SET searchPattern = CONCAT('%', pSearchTerm, '%');

  SELECT userId, firstName, lastName, email, username, avatarUrl, isOnline
  FROM users
  WHERE (firstName LIKE searchPattern
    OR lastName LIKE searchPattern
    OR email LIKE searchPattern
    OR username LIKE searchPattern)
    AND status = 'active'
  ORDER BY firstName, lastName
  LIMIT pLimit OFFSET pOffset;

  SELECT COUNT(*) AS total
  FROM users
  WHERE (firstName LIKE searchPattern
    OR lastName LIKE searchPattern
    OR email LIKE searchPattern
    OR username LIKE searchPattern)
    AND status = 'active';
END //

-- ============================================================
-- SP: spStoreRefreshToken
-- Stores a refresh token for a user session.
-- ============================================================
CREATE PROCEDURE spStoreRefreshToken(
  IN pUserId CHAR(36),
  IN pToken TEXT,
  IN pExpiresAt DATETIME
)
BEGIN
  INSERT INTO refreshTokens (userId, token, expiresAt)
  VALUES (pUserId, pToken, pExpiresAt);

  SELECT LAST_INSERT_ID() AS tokenId;
END //

-- ============================================================
-- SP: spValidateRefreshToken
-- Validates a refresh token is active and not expired.
-- ============================================================
CREATE PROCEDURE spValidateRefreshToken(
  IN pUserId CHAR(36),
  IN pToken TEXT
)
BEGIN
  SELECT id, userId, expiresAt
  FROM refreshTokens
  WHERE userId = pUserId
    AND token = pToken
    AND isRevoked = 0
    AND expiresAt > NOW();
END //

-- ============================================================
-- SP: spRevokeRefreshToken
-- Revokes a specific refresh token.
-- ============================================================
CREATE PROCEDURE spRevokeRefreshToken(
  IN pUserId CHAR(36),
  IN pToken TEXT
)
BEGIN
  UPDATE refreshTokens SET isRevoked = 1
  WHERE userId = pUserId AND token = pToken;
END //

-- ============================================================
-- SP: spRevokeAllRefreshTokens
-- Revokes all refresh tokens for a user (logout all sessions).
-- ============================================================
CREATE PROCEDURE spRevokeAllRefreshTokens(
  IN pUserId CHAR(36)
)
BEGIN
  UPDATE refreshTokens SET isRevoked = 1
  WHERE userId = pUserId AND isRevoked = 0;
END //

-- ============================================================
-- SP: spGetOnlineContacts
-- Gets online users who share a conversation with the given user.
-- ============================================================
CREATE PROCEDURE spGetOnlineContacts(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT DISTINCT u.userId, u.firstName, u.lastName, u.username, u.avatarUrl
  FROM users u
  INNER JOIN conversationParticipants cp1 ON u.userId = cp1.userId
  INNER JOIN conversationParticipants cp2 ON cp1.conversationId = cp2.conversationId
  WHERE cp2.userId = pUserId
    AND u.userId != pUserId
    AND u.isOnline = 1
    AND u.status = 'active';
END //

DELIMITER ;
