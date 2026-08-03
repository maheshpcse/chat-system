"use strict";

const { callProcedure } = require("../../config/database");

class MessageRepository {
  async createMessage(messageData) {
    const { messageId, conversationId, senderId, content, messageType, attachmentUrl } = messageData;
    const result = await callProcedure("spCreateMessage", [
      messageId,
      conversationId,
      senderId,
      content,
      messageType,
      attachmentUrl || null,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async getMessages(conversationId, limit, offset, before) {
    const result = await callProcedure("spGetMessages", [
      conversationId,
      limit,
      offset,
      before || null,
    ]);
    return {
      messages: result[0] || [],
      total: result[1] ? result[1][0].total : 0,
    };
  }

  async getMessageById(messageId) {
    const result = await callProcedure("spGetMessageById", [messageId]);
    return result[0] ? result[0][0] : null;
  }

  async deleteMessage(messageId, userId) {
    const result = await callProcedure("spDeleteMessage", [messageId, userId]);
    return result[0] ? result[0][0] : null;
  }

  async markAsDelivered(messageId, userId) {
    const result = await callProcedure("spMarkMessageDelivered", [messageId, userId]);
    return result[0] ? result[0][0] : null;
  }

  async markAsRead(conversationId, userId) {
    // Returns the list of { messageId, senderId } that were marked seen.
    const result = await callProcedure("spMarkMessagesRead", [conversationId, userId]);
    // The affected rows are the last result set the procedure produced.
    const affected = Array.isArray(result)
      ? result.filter(Array.isArray).pop()
      : [];
    return affected || [];
  }

  async markAsFailed(messageId, userId) {
    await callProcedure("spMarkMessageFailed", [messageId, userId || null]);
  }

  async getMessageStatus(messageId) {
    const result = await callProcedure("spGetMessageStatus", [messageId]);
    return {
      messageStatus: result[0] && result[0][0] ? result[0][0].messageStatus : null,
      receipts: result[1] || [],
    };
  }

  async getUnreadCount(userId) {
    const result = await callProcedure("spGetUnreadMessageCount", [userId]);
    return result[0] ? result[0][0].unreadCount : 0;
  }
}

module.exports = new MessageRepository();
