-- ============================================================
-- STORED PROCEDURES - Group Module
-- ============================================================

USE chat_system;

DELIMITER //

-- ============================================================
-- SP: spCreateGroup
-- Creates a group with its associated conversation.
-- ============================================================
CREATE PROCEDURE spCreateGroup(
  IN pGroupId CHAR(36),
  IN pConversationId CHAR(36),
  IN pName VARCHAR(100),
  IN pDescription VARCHAR(500),
  IN pCreatedBy CHAR(36)
)
BEGIN
  -- Create conversation record
  INSERT INTO conversations (conversationId, conversationType)
  VALUES (pConversationId, 'group');

  -- Create group record
  INSERT INTO chatGroups (groupId, conversationId, name, description, createdBy)
  VALUES (pGroupId, pConversationId, pName, pDescription, pCreatedBy);

  -- Add creator as conversation participant
  INSERT INTO conversationParticipants (conversationId, userId)
  VALUES (pConversationId, pCreatedBy);

  SELECT g.groupId, g.conversationId, g.name, g.description, g.createdBy, g.createdAt
  FROM chatGroups g WHERE g.groupId = pGroupId;
END //

-- ============================================================
-- SP: spAddGroupMember
-- Adds a user to a group.
-- ============================================================
CREATE PROCEDURE spAddGroupMember(
  IN pGroupId CHAR(36),
  IN pUserId CHAR(36),
  IN pRole VARCHAR(10)
)
BEGIN
  DECLARE vConversationId CHAR(36);

  SELECT conversationId INTO vConversationId
  FROM chatGroups WHERE groupId = pGroupId;

  INSERT INTO groupMembers (groupId, userId, role)
  VALUES (pGroupId, pUserId, pRole)
  ON DUPLICATE KEY UPDATE role = pRole;

  INSERT INTO conversationParticipants (conversationId, userId)
  VALUES (vConversationId, pUserId)
  ON DUPLICATE KEY UPDATE isActive = 1;

  SELECT gm.userId, gm.role, gm.joinedAt,
         u.firstName, u.lastName, u.username, u.avatarUrl
  FROM groupMembers gm
  INNER JOIN users u ON gm.userId = u.userId
  WHERE gm.groupId = pGroupId AND gm.userId = pUserId;
END //

-- ============================================================
-- SP: spRemoveGroupMember
-- Removes a user from a group.
-- ============================================================
CREATE PROCEDURE spRemoveGroupMember(
  IN pGroupId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  DECLARE vConversationId CHAR(36);

  SELECT conversationId INTO vConversationId
  FROM chatGroups WHERE groupId = pGroupId;

  DELETE FROM groupMembers WHERE groupId = pGroupId AND userId = pUserId;

  UPDATE conversationParticipants SET isActive = 0
  WHERE conversationId = vConversationId AND userId = pUserId;
END //

-- ============================================================
-- SP: spGetGroupById
-- Gets group details.
-- ============================================================
CREATE PROCEDURE spGetGroupById(
  IN pGroupId CHAR(36)
)
BEGIN
  SELECT g.groupId, g.conversationId, g.name, g.description, g.avatarUrl,
         g.createdBy, g.maxMembers, g.createdAt,
         u.firstName AS creatorFirstName, u.lastName AS creatorLastName
  FROM chatGroups g
  INNER JOIN users u ON g.createdBy = u.userId
  WHERE g.groupId = pGroupId;
END //

-- ============================================================
-- SP: spGetGroupMembers
-- Gets all members of a group.
-- ============================================================
CREATE PROCEDURE spGetGroupMembers(
  IN pGroupId CHAR(36)
)
BEGIN
  SELECT gm.userId, gm.role, gm.joinedAt,
         u.firstName, u.lastName, u.username, u.avatarUrl, u.isOnline
  FROM groupMembers gm
  INNER JOIN users u ON gm.userId = u.userId
  WHERE gm.groupId = pGroupId
  ORDER BY
    FIELD(gm.role, 'owner', 'admin', 'member'),
    gm.joinedAt ASC;
END //

-- ============================================================
-- SP: spUpdateGroup
-- Updates group details.
-- ============================================================
CREATE PROCEDURE spUpdateGroup(
  IN pGroupId CHAR(36),
  IN pName VARCHAR(100),
  IN pDescription VARCHAR(500),
  IN pAvatarUrl VARCHAR(500)
)
BEGIN
  UPDATE chatGroups SET
    name = COALESCE(pName, name),
    description = COALESCE(pDescription, description),
    avatarUrl = COALESCE(pAvatarUrl, avatarUrl)
  WHERE groupId = pGroupId;

  SELECT groupId, conversationId, name, description, avatarUrl, createdBy, createdAt
  FROM chatGroups WHERE groupId = pGroupId;
END //

-- ============================================================
-- SP: spGetGroupMemberRole
-- Gets a user's role in a group.
-- ============================================================
CREATE PROCEDURE spGetGroupMemberRole(
  IN pGroupId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  SELECT userId, role, joinedAt
  FROM groupMembers
  WHERE groupId = pGroupId AND userId = pUserId;
END //

-- ============================================================
-- SP: spGetUserGroups
-- Gets all groups a user belongs to.
-- ============================================================
CREATE PROCEDURE spGetUserGroups(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT g.groupId, g.conversationId, g.name, g.description, g.avatarUrl,
         g.createdAt, gm.role,
         (SELECT COUNT(*) FROM groupMembers WHERE groupId = g.groupId) AS memberCount
  FROM chatGroups g
  INNER JOIN groupMembers gm ON g.groupId = gm.groupId
  WHERE gm.userId = pUserId
  ORDER BY g.createdAt DESC;
END //

DELIMITER ;
