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
END;