"use strict";

const messageRepository = require("./message.repository");
const conversationService = require("../conversation/conversation.service");
const contactRepository = require("../contact/contact.repository");
const notificationService = require("../notification/notification.service");
const { getRedisClient } = require("../../config/redis");
const { getIO } = require("../../config/socket");
const { generateId } = require("../../utils/helpers");
const { NotFoundError, ForbiddenError } = require("../../utils/errors");
const { REDIS_KEYS, REDIS_TTL, SOCKET_EVENTS } = require("../../utils/constants");
const logger = require("../../utils/logger");

/** Safely obtain the Socket.IO instance (may be absent in tests / cron). */
const safeIO = () => {
  try {
    return getIO();
  } catch (err) {
    return null;
  }
};

class MessageService {
  async sendMessage(userId, messageData) {
    const { conversationId, content, messageType, attachmentUrl } = messageData;

    // Verify user is a participant
    await conversationService.verifyParticipant(conversationId, userId);

    // Resolve participants for block enforcement + notification fan-out.
    const participants = await conversationService.getParticipants(conversationId);
    const others = participants.filter((p) => p.userId !== userId);
    const isPrivate =
      (participants[0] && participants[0].conversationType === "private") ||
      participants.length === 2;

    // Blocked users cannot message each other in a private conversation.
    if (isPrivate) {
      for (const other of others) {
        const blocked = await contactRepository.isBlocked(userId, other.userId);
        if (blocked) {
          throw new ForbiddenError("You cannot send messages to this user");
        }
      }
    }

    const messageId = generateId();
    const message = await messageRepository.createMessage({
      messageId,
      conversationId,
      senderId: userId,
      content,
      messageType,
      attachmentUrl,
    });

    // Cache recent message (Redis optional — never fail the send)
    try {
      const redis = getRedisClient();
      if (redis && (redis.status === "ready" || redis.status === "connect")) {
        const cacheKey = `${REDIS_KEYS.RECENT_MESSAGES}${conversationId}`;
        await redis.lpush(cacheKey, JSON.stringify(message));
        await redis.ltrim(cacheKey, 0, 49); // Keep last 50
        await redis.expire(cacheKey, REDIS_TTL.RECENT_MESSAGES);
      }
    } catch (cacheErr) {
      logger.debug("message cache skip", { error: cacheErr.message });
    }

    // Ensure messageId present on payload (SP row may omit if SELECT fails)
    const payload = message && message.messageId
      ? message
      : { ...(message || {}), messageId, conversationId, senderId: userId, content, messageType, attachmentUrl };

    // Authoritative real-time broadcast: persistence and socket share one payload.
    const io = safeIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, payload);
    }

    // Persist + push a notification to each other participant.
    const preview = (content || "").substring(0, 100);
    others.forEach((other) => {
      notificationService
        .createAndNotify(other.userId, {
          actorUserId: userId,
          type: "newMessage",
          title: "New message",
          body: preview,
          entityType: "conversation",
          entityId: conversationId,
          data: { conversationId, messageId, senderId: userId },
        })
        .catch(() => {});
    });

    logger.debug("Message sent", { messageId, conversationId });
    return payload;
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

  /**
   * Marks a single message as delivered to the given recipient and notifies
   * the original sender in real time. Returns the updated message summary.
   */
  async markDelivered(userId, messageId) {
    const updated = await messageRepository.markAsDelivered(messageId, userId);
    if (updated && updated.senderId) {
      const io = safeIO();
      if (io) {
        io.to(`user:${updated.senderId}`).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
          messageId: updated.messageId,
          conversationId: updated.conversationId,
          status: updated.status,
          deliveredTo: userId,
        });
      }
    }
    return updated;
  }

  /**
   * Marks every message from other participants in a conversation as seen for
   * the given user, then emits read receipts back to each affected sender.
   * Returns the list of affected { messageId, senderId }.
   */
  async markAsRead(userId, conversationId) {
    await conversationService.verifyParticipant(conversationId, userId);
    const affected = await messageRepository.markAsRead(conversationId, userId);

    const io = safeIO();
    if (io && affected && affected.length) {
      // Notify each distinct sender that their messages were seen.
      const senders = [...new Set(affected.map((a) => a.senderId))];
      senders.forEach((senderId) => {
        io.to(`user:${senderId}`).emit(SOCKET_EVENTS.MESSAGE_READ, {
          conversationId,
          seenBy: userId,
          messageIds: affected
            .filter((a) => a.senderId === senderId)
            .map((a) => a.messageId),
          readAt: new Date().toISOString(),
        });
      });
    }
    return affected;
  }

  /** Flags a message as failed (used by the client retry path). */
  async markFailed(userId, messageId) {
    await messageRepository.markAsFailed(messageId, userId);
  }

  async getUnreadCount(userId) {
    return messageRepository.getUnreadCount(userId);
  }
}

module.exports = new MessageService();

