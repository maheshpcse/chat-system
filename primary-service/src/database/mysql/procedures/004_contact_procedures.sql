-- ============================================================
-- CHAT SYSTEM - Contact/Friend Stored Procedures
-- ============================================================

USE chat_system;

DELIMITER //

-- ============================================================
-- SP: spSendContactRequest
-- Sends a friend/contact request from sender to receiver.
-- Validates: not self, no duplicate pending, not already contacts.
-- ============================================================
CREATE PROCEDURE spSendContactRequest(
  IN pRequestId CHAR(36),
  IN pSenderUserId CHAR(36),
  IN pReceiverUserId CHAR(36)
)
BEGIN
  DECLARE existingPending INT DEFAULT 0;
  DECLARE alreadyContacts INT DEFAULT 0;
  DECLARE reverseRequest CHAR(36) DEFAULT NULL;

  -- Check if there's already a pending request in either direction
  SELECT COUNT(*) INTO existingPending
  FROM contactRequests
  WHERE ((senderUserId = pSenderUserId AND receiverUserId = pReceiverUserId)
      OR (senderUserId = pReceiverUserId AND receiverUserId = pSenderUserId))
    AND status = 'pending';

  IF existingPending > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'DUPLICATE_REQUEST';
  END IF;

  -- Check if already contacts
  SELECT COUNT(*) INTO alreadyContacts
  FROM userContacts
  WHERE ((userId = pSenderUserId AND contactUserId = pReceiverUserId)
      OR (userId = pReceiverUserId AND contactUserId = pSenderUserId))
    AND status = 'active';

  IF alreadyContacts > 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ALREADY_CONTACTS';
  END IF;

  -- Check if receiver has a blocked status for sender
  IF EXISTS (
    SELECT 1 FROM contactRequests
    WHERE senderUserId = pReceiverUserId AND receiverUserId = pSenderUserId AND status = 'blocked'
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'USER_BLOCKED';
  END IF;

  -- Insert the request
  INSERT INTO contactRequests (requestId, senderUserId, receiverUserId, status, requestedAt)
  VALUES (pRequestId, pSenderUserId, pReceiverUserId, 'pending', NOW());

  -- Return the created request with user info
  SELECT cr.requestId, cr.senderUserId, cr.receiverUserId, cr.status, cr.requestedAt,
         u.firstName AS receiverFirstName, u.lastName AS receiverLastName,
         u.username AS receiverUsername, u.avatarUrl AS receiverAvatarUrl
  FROM contactRequests cr
  INNER JOIN users u ON cr.receiverUserId = u.userId
  WHERE cr.requestId = pRequestId;
END //

-- ============================================================
-- SP: spAcceptContactRequest
-- Accepts a pending contact request and creates contact records.
-- ============================================================
CREATE PROCEDURE spAcceptContactRequest(
  IN pRequestId CHAR(36),
  IN pUserId CHAR(36),
  IN pContactId1 CHAR(36),
  IN pContactId2 CHAR(36)
)
BEGIN
  DECLARE vSenderUserId CHAR(36);
  DECLARE vReceiverUserId CHAR(36);
  DECLARE vStatus VARCHAR(20);

  -- Get request details
  SELECT senderUserId, receiverUserId, status
  INTO vSenderUserId, vReceiverUserId, vStatus
  FROM contactRequests
  WHERE requestId = pRequestId;

  -- Validate: request exists and user is receiver
  IF vReceiverUserId IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REQUEST_NOT_FOUND';
  END IF;

  IF vReceiverUserId != pUserId THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_AUTHORIZED';
  END IF;

  IF vStatus != 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REQUEST_NOT_PENDING';
  END IF;

  -- Update request status
  UPDATE contactRequests
  SET status = 'accepted', acceptedAt = NOW(), updatedAt = NOW()
  WHERE requestId = pRequestId;

  -- Create bidirectional contact records
  INSERT IGNORE INTO userContacts (contactId, userId, contactUserId, status)
  VALUES (pContactId1, vSenderUserId, vReceiverUserId, 'active');

  INSERT IGNORE INTO userContacts (contactId, userId, contactUserId, status)
  VALUES (pContactId2, vReceiverUserId, vSenderUserId, 'active');

  -- Return the accepted request with sender info
  SELECT cr.requestId, cr.senderUserId, cr.receiverUserId, cr.status, cr.acceptedAt,
         u.firstName AS senderFirstName, u.lastName AS senderLastName,
         u.username AS senderUsername, u.avatarUrl AS senderAvatarUrl
  FROM contactRequests cr
  INNER JOIN users u ON cr.senderUserId = u.userId
  WHERE cr.requestId = pRequestId;
END //

-- ============================================================
-- SP: spRejectContactRequest
-- ============================================================
CREATE PROCEDURE spRejectContactRequest(
  IN pRequestId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  DECLARE vReceiverUserId CHAR(36);
  DECLARE vStatus VARCHAR(20);

  SELECT receiverUserId, status INTO vReceiverUserId, vStatus
  FROM contactRequests WHERE requestId = pRequestId;

  IF vReceiverUserId IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REQUEST_NOT_FOUND';
  END IF;

  IF vReceiverUserId != pUserId THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_AUTHORIZED';
  END IF;

  IF vStatus != 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REQUEST_NOT_PENDING';
  END IF;

  UPDATE contactRequests
  SET status = 'rejected', rejectedAt = NOW(), updatedAt = NOW()
  WHERE requestId = pRequestId;

  SELECT requestId, senderUserId, receiverUserId, status, rejectedAt
  FROM contactRequests WHERE requestId = pRequestId;
END //

-- ============================================================
-- SP: spCancelContactRequest
-- Sender cancels their own pending request.
-- ============================================================
CREATE PROCEDURE spCancelContactRequest(
  IN pRequestId CHAR(36),
  IN pUserId CHAR(36)
)
BEGIN
  DECLARE vSenderUserId CHAR(36);
  DECLARE vStatus VARCHAR(20);

  SELECT senderUserId, status INTO vSenderUserId, vStatus
  FROM contactRequests WHERE requestId = pRequestId;

  IF vSenderUserId IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REQUEST_NOT_FOUND';
  END IF;

  IF vSenderUserId != pUserId THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'NOT_AUTHORIZED';
  END IF;

  IF vStatus != 'pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'REQUEST_NOT_PENDING';
  END IF;

  UPDATE contactRequests
  SET status = 'cancelled', cancelledAt = NOW(), updatedAt = NOW()
  WHERE requestId = pRequestId;

  SELECT requestId, senderUserId, receiverUserId, status
  FROM contactRequests WHERE requestId = pRequestId;
END //

-- ============================================================
-- SP: spGetReceivedRequests
-- Gets all pending requests received by a user.
-- ============================================================
CREATE PROCEDURE spGetReceivedRequests(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT cr.requestId, cr.senderUserId, cr.receiverUserId, cr.status, cr.requestedAt,
         u.firstName, u.lastName, u.username, u.avatarUrl, u.isOnline
  FROM contactRequests cr
  INNER JOIN users u ON cr.senderUserId = u.userId
  WHERE cr.receiverUserId = pUserId AND cr.status = 'pending'
  ORDER BY cr.requestedAt DESC;
END //

-- ============================================================
-- SP: spGetSentRequests
-- Gets all pending requests sent by a user.
-- ============================================================
CREATE PROCEDURE spGetSentRequests(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT cr.requestId, cr.senderUserId, cr.receiverUserId, cr.status, cr.requestedAt,
         u.firstName, u.lastName, u.username, u.avatarUrl, u.isOnline
  FROM contactRequests cr
  INNER JOIN users u ON cr.receiverUserId = u.userId
  WHERE cr.senderUserId = pUserId AND cr.status = 'pending'
  ORDER BY cr.requestedAt DESC;
END //

-- ============================================================
-- SP: spGetUserContacts
-- Gets all active contacts for a user.
-- ============================================================
CREATE PROCEDURE spGetUserContacts(
  IN pUserId CHAR(36)
)
BEGIN
  SELECT uc.contactId, uc.contactUserId, uc.status, uc.createdAt,
         u.firstName, u.lastName, u.username, u.avatarUrl, u.isOnline, u.lastSeenAt
  FROM userContacts uc
  INNER JOIN users u ON uc.contactUserId = u.userId
  WHERE uc.userId = pUserId AND uc.status = 'active'
  ORDER BY u.firstName, u.lastName;
END //

-- ============================================================
-- SP: spRemoveContact
-- Removes a contact relationship (both directions).
-- ============================================================
CREATE PROCEDURE spRemoveContact(
  IN pUserId CHAR(36),
  IN pContactUserId CHAR(36)
)
BEGIN
  UPDATE userContacts SET status = 'removed', updatedAt = NOW()
  WHERE (userId = pUserId AND contactUserId = pContactUserId)
     OR (userId = pContactUserId AND contactUserId = pUserId);

  -- Also update the original request status
  UPDATE contactRequests SET status = 'cancelled', updatedAt = NOW()
  WHERE ((senderUserId = pUserId AND receiverUserId = pContactUserId)
      OR (senderUserId = pContactUserId AND receiverUserId = pUserId))
    AND status = 'accepted';

  SELECT ROW_COUNT() AS affectedRows;
END //

-- ============================================================
-- SP: spAreUsersContacts
-- Checks if two users are active contacts (for conversation restriction).
-- ============================================================
CREATE PROCEDURE spAreUsersContacts(
  IN pUserId1 CHAR(36),
  IN pUserId2 CHAR(36)
)
BEGIN
  SELECT COUNT(*) AS isContact
  FROM userContacts
  WHERE userId = pUserId1 AND contactUserId = pUserId2 AND status = 'active';
END //

-- ============================================================
-- SP: spGetContactRequestStatus
-- Gets the request status between two users (for search result UI).
-- ============================================================
CREATE PROCEDURE spGetContactRequestStatus(
  IN pUserId CHAR(36),
  IN pOtherUserId CHAR(36)
)
BEGIN
  -- Check if already contacts
  IF EXISTS (
    SELECT 1 FROM userContacts
    WHERE userId = pUserId AND contactUserId = pOtherUserId AND status = 'active'
  ) THEN
    SELECT 'contact' AS relationStatus, NULL AS requestId;
  -- Check pending request from current user
  ELSEIF EXISTS (
    SELECT 1 FROM contactRequests
    WHERE senderUserId = pUserId AND receiverUserId = pOtherUserId AND status = 'pending'
  ) THEN
    SELECT 'request_sent' AS relationStatus,
           (SELECT requestId FROM contactRequests WHERE senderUserId = pUserId AND receiverUserId = pOtherUserId AND status = 'pending') AS requestId;
  -- Check pending request from other user
  ELSEIF EXISTS (
    SELECT 1 FROM contactRequests
    WHERE senderUserId = pOtherUserId AND receiverUserId = pUserId AND status = 'pending'
  ) THEN
    SELECT 'request_received' AS relationStatus,
           (SELECT requestId FROM contactRequests WHERE senderUserId = pOtherUserId AND receiverUserId = pUserId AND status = 'pending') AS requestId;
  ELSE
    SELECT 'none' AS relationStatus, NULL AS requestId;
  END IF;
END //

DELIMITER ;
