"use strict";

/**
 * Admin Faker Repository
 */

const { callProcedure, getPool } = require("../../config/database");
const { generateId } = require("../../utils/helpers");

class AdminFakerRepository {
  /**
   * Audit log for Data Studio actions.
   * Soft-fails when spCreateFakerSession / admin_faker_sessions is missing
   * so generate/preview/save still succeed on partially migrated DBs.
   */
  async logSession({ adminId, entityType, action, recordCount, payloadJson }) {
    const sessionId = generateId();
    const payload = payloadJson ? JSON.stringify(payloadJson) : null;
    try {
      const result = await callProcedure("spCreateFakerSession", [
        sessionId,
        adminId,
        entityType,
        action,
        recordCount || 0,
        payload,
      ]);
      return result[0] ? result[0][0] : { sessionId };
    } catch (err) {
      const code = err && (err.code || err.errno);
      const msg = (err && err.message) || String(err);
      // Missing procedure/table or similar — do not fail the main operation
      if (
        code === "ER_SP_DOES_NOT_EXIST" ||
        code === "ER_NO_SUCH_TABLE" ||
        code === 1305 ||
        code === 1146 ||
        /spCreateFakerSession|admin_faker_sessions|does not exist|Unknown procedure/i.test(msg)
      ) {
        try {
          // eslint-disable-next-line global-require
          const logger = require("../../utils/logger");
          logger.warn("Faker session log skipped (schema missing)", {
            code,
            message: msg,
            entityType,
            action,
          });
        } catch (_e) {
          // ignore logger issues
        }
        return { sessionId, skipped: true };
      }
      throw err;
    }
  }

  async findExistingEmails(emails) {
    if (!emails.length) return new Set();
    const pool = getPool();
    const placeholders = emails.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `SELECT email FROM users WHERE email IN (${placeholders})`,
      emails
    );
    return new Set(rows.map((r) => r.email.toLowerCase()));
  }

  async findExistingUsernames(usernames) {
    if (!usernames.length) return new Set();
    const pool = getPool();
    const placeholders = usernames.map(() => "?").join(", ");
    const [rows] = await pool.execute(
      `SELECT username FROM users WHERE username IN (${placeholders})`,
      usernames
    );
    return new Set(rows.map((r) => r.username.toLowerCase()));
  }

  async insertUser(user) {
    const result = await callProcedure("spBulkInsertUser", [
      user.userId,
      user.firstName,
      user.lastName,
      user.email,
      user.username,
      user.passwordHash,
      user.phoneNumber || null,
      user.bio || null,
      user.role || "user",
      user.status || "active",
    ]);
    return result[0] ? result[0][0] : null;
  }

  async listActiveUsers(limit = 500) {
    const pool = getPool();
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 500, 1), 1000);
    const [rows] = await pool.query(
      `SELECT userId, firstName, lastName, username, email
       FROM users
       WHERE status = 'active'
       ORDER BY createdAt DESC
       LIMIT ${safeLimit}`
    );
    return rows || [];
  }

  async listConversations(limit = 200) {
    const pool = getPool();
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 200, 1), 500);
    const [rows] = await pool.query(
      `SELECT c.conversationId, c.conversationType,
              GROUP_CONCAT(cp.userId) AS participantCsv
       FROM conversations c
       INNER JOIN conversationParticipants cp ON cp.conversationId = c.conversationId AND cp.isActive = 1
       GROUP BY c.conversationId, c.conversationType
       ORDER BY c.updatedAt DESC
       LIMIT ${safeLimit}`
    );
    return (rows || []).map((r) => ({
      conversationId: r.conversationId,
      conversationType: r.conversationType,
      participantIds: r.participantCsv ? String(r.participantCsv).split(",") : [],
      label: `${r.conversationType}:${String(r.conversationId).slice(0, 8)}`,
    }));
  }

  async contactPairExists(userId, contactUserId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT contactId FROM userContacts
       WHERE ((userId = ? AND contactUserId = ?) OR (userId = ? AND contactUserId = ?))
         AND status = 'active'
       LIMIT 1`,
      [userId, contactUserId, contactUserId, userId]
    );
    return rows && rows.length > 0;
  }

  async pendingRequestExists(userId, contactUserId) {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT requestId FROM contactRequests
       WHERE ((senderUserId = ? AND receiverUserId = ?) OR (senderUserId = ? AND receiverUserId = ?))
         AND status = 'pending'
       LIMIT 1`,
      [userId, contactUserId, contactUserId, userId]
    );
    return rows && rows.length > 0;
  }

  async insertAcceptedContact(userId, contactUserId) {
    const contactId1 = generateId();
    const contactId2 = generateId();
    const requestId = generateId();
    const pool = getPool();
    await pool.execute(
      `INSERT INTO contactRequests
        (requestId, senderUserId, receiverUserId, status, requestedAt, acceptedAt)
       VALUES (?, ?, ?, 'accepted', NOW(), NOW())`,
      [requestId, userId, contactUserId]
    );
    await pool.execute(
      `INSERT IGNORE INTO userContacts (contactId, userId, contactUserId, status)
       VALUES (?, ?, ?, 'active'), (?, ?, ?, 'active')`,
      [contactId1, userId, contactUserId, contactId2, contactUserId, userId]
    );
    return { requestId, contactId1, contactId2, userId, contactUserId };
  }

  async insertPendingContact(senderUserId, receiverUserId) {
    const requestId = generateId();
    const result = await callProcedure("spSendContactRequest", [
      requestId,
      senderUserId,
      receiverUserId,
    ]);
    return result[0] ? result[0][0] : { requestId, senderUserId, receiverUserId };
  }

  async insertGroup({ groupId, conversationId, name, description, createdBy, members }) {
    await callProcedure("spCreateGroup", [
      groupId,
      conversationId,
      name,
      description || null,
      createdBy,
    ]);
    // owner
    await callProcedure("spAddGroupMember", [groupId, createdBy, "owner"]);
    for (const m of members || []) {
      if (m.userId === createdBy) continue;
      await callProcedure("spAddGroupMember", [groupId, m.userId, m.role === "admin" ? "admin" : "member"]);
    }
    const result = await callProcedure("spGetGroupById", [groupId]);
    return result[0] ? result[0][0] : { groupId, conversationId, name };
  }

  async findOrCreatePrivateConversation(userId, participantId) {
    const found = await callProcedure("spFindPrivateConversation", [userId, participantId]);
    if (found[0] && found[0][0] && found[0][0].conversationId) {
      return found[0][0].conversationId;
    }
    const conversationId = generateId();
    await callProcedure("spCreatePrivateConversation", [conversationId, userId, participantId]);
    return conversationId;
  }

  async insertMessage({ messageId, conversationId, senderId, content, messageType }) {
    const result = await callProcedure("spCreateMessage", [
      messageId,
      conversationId,
      senderId,
      content,
      messageType || "text",
      null,
    ]);
    return result[0] ? result[0][0] : { messageId, conversationId, senderId };
  }
}

module.exports = new AdminFakerRepository();
