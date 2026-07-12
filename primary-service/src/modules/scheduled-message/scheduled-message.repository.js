"use strict";

/**
 * Scheduled Message Repository
 * Data access layer for scheduled message operations via stored procedures.
 */

const { callProcedure } = require("../../config/database");

class ScheduledMessageRepository {
  async create(senderId, conversationId, content, messageType, fileUrl, scheduledAt) {
    const result = await callProcedure("sp_create_scheduled_message", [
      senderId,
      conversationId,
      content,
      messageType || "text",
      fileUrl || null,
      scheduledAt,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async getDueMessages() {
    const result = await callProcedure("sp_get_due_scheduled_messages", []);
    return result[0] || [];
  }

  async getUserScheduledMessages(userId, status = null) {
    const result = await callProcedure("sp_get_user_scheduled_messages", [
      userId,
      status,
    ]);
    return result[0] || [];
  }

  async updateStatus(id, status) {
    await callProcedure("sp_update_scheduled_message_status", [id, status]);
  }

  async cancel(id, userId) {
    const result = await callProcedure("sp_cancel_scheduled_message", [
      id,
      userId,
    ]);
    return result[0] ? result[0][0].affected_rows > 0 : false;
  }
}

module.exports = new ScheduledMessageRepository();
