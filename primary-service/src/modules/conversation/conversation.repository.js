"use strict";

const { callProcedure } = require("../../config/database");

class ConversationRepository {
  async createPrivateConversation(conversationId, userId, participantId) {
    const result = await callProcedure("spCreatePrivateConversation", [
      conversationId,
      userId,
      participantId,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async findPrivateConversation(userId, participantId) {
    const result = await callProcedure("spFindPrivateConversation", [userId, participantId]);
    return result[0] ? result[0][0] : null;
  }

  async getUserConversations(userId, limit, offset) {
    const result = await callProcedure("spGetUserConversations", [userId, limit, offset]);
    return {
      conversations: result[0] || [],
      total: result[1] ? result[1][0].total : 0,
    };
  }

  async getConversationById(conversationId, userId) {
    const result = await callProcedure("spGetConversationById", [conversationId, userId]);
    return result[0] ? result[0][0] : null;
  }

  async isParticipant(conversationId, userId) {
    const result = await callProcedure("spIsConversationParticipant", [conversationId, userId]);
    return result[0] && result[0][0] ? result[0][0].isParticipant === 1 : false;
  }

  async updateLastMessage(conversationId, messageId) {
    await callProcedure("spUpdateConversationLastMessage", [conversationId, messageId]);
  }
}

module.exports = new ConversationRepository();
