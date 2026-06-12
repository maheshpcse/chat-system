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
    await callProcedure("spMarkMessageDelivered", [messageId, userId]);
  }

  async markAsRead(conversationId, userId) {
    await callProcedure("spMarkMessagesRead", [conversationId, userId]);
  }

  async getUnreadCount(userId) {
    const result = await callProcedure("spGetUnreadMessageCount", [userId]);
    return result[0] ? result[0][0].unreadCount : 0;
  }
}

module.exports = new MessageRepository();
