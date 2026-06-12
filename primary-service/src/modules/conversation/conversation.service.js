"use strict";

const conversationRepository = require("./conversation.repository");
const { getRedisClient } = require("../../config/redis");
const { generateId } = require("../../utils/helpers");
const { NotFoundError, ConflictError } = require("../../utils/errors");
const { REDIS_KEYS, REDIS_TTL } = require("../../utils/constants");

class ConversationService {
  async createPrivateConversation(userId, participantId) {
    // Check if conversation already exists
    const existing = await conversationRepository.findPrivateConversation(userId, participantId);
    if (existing) {
      return existing;
    }

    const conversationId = generateId();
    const conversation = await conversationRepository.createPrivateConversation(
      conversationId,
      userId,
      participantId
    );

    return conversation;
  }

  async getUserConversations(userId, page, limit) {
    const offset = (page - 1) * limit;
    return conversationRepository.getUserConversations(userId, limit, offset);
  }

  async getConversationById(conversationId, userId) {
    const conversation = await conversationRepository.getConversationById(conversationId, userId);
    if (!conversation) {
      throw new NotFoundError("Conversation not found");
    }
    return conversation;
  }

  async verifyParticipant(conversationId, userId) {
    const isParticipant = await conversationRepository.isParticipant(conversationId, userId);
    if (!isParticipant) {
      throw new NotFoundError("Conversation not found or access denied");
    }
    return true;
  }
}

module.exports = new ConversationService();
