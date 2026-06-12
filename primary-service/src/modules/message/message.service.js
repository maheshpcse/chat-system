"use strict";

const messageRepository = require("./message.repository");
const conversationService = require("../conversation/conversation.service");
const { getRedisClient } = require("../../config/redis");
const { generateId } = require("../../utils/helpers");
const { NotFoundError, ForbiddenError } = require("../../utils/errors");
const { REDIS_KEYS, REDIS_TTL } = require("../../utils/constants");
const logger = require("../../utils/logger");

class MessageService {
  async sendMessage(userId, messageData) {
    const { conversationId, content, messageType, attachmentUrl } = messageData;

    // Verify user is a participant
    await conversationService.verifyParticipant(conversationId, userId);

    const messageId = generateId();
    const message = await messageRepository.createMessage({
      messageId,
      conversationId,
      senderId: userId,
      content,
      messageType,
      attachmentUrl,
    });

    // Cache recent message
    const redis = getRedisClient();
    const cacheKey = `${REDIS_KEYS.RECENT_MESSAGES}${conversationId}`;
    await redis.lpush(cacheKey, JSON.stringify(message));
    await redis.ltrim(cacheKey, 0, 49); // Keep last 50
    await redis.expire(cacheKey, REDIS_TTL.RECENT_MESSAGES);

    logger.debug("Message sent", { messageId, conversationId });
    return message;
  }

  async getMessages(userId, conversationId, page, limit, before) {
    await conversationService.verifyParticipant(conversationId, userId);

    const offset = (page - 1) * limit;
    return messageRepository.getMessages(conversationId, limit, offset, before);
  }

  async deleteMessage(userId, messageId) {
    const message = await messageRepository.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError("Message not found");
    }

    if (message.senderId !== userId) {
      throw new ForbiddenError("You can only delete your own messages");
    }

    await messageRepository.deleteMessage(messageId, userId);

    // Invalidate cache
    const redis = getRedisClient();
    await redis.del(`${REDIS_KEYS.RECENT_MESSAGES}${message.conversationId}`);

    return { messageId, conversationId: message.conversationId };
  }

  async markAsRead(userId, conversationId) {
    await conversationService.verifyParticipant(conversationId, userId);
    await messageRepository.markAsRead(conversationId, userId);
  }

  async getUnreadCount(userId) {
    return messageRepository.getUnreadCount(userId);
  }
}

module.exports = new MessageService();
