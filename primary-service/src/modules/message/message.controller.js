"use strict";

const messageService = require("./message.service");
const { sendSuccess, sendPaginated } = require("../../utils/response");

class MessageController {
  async send(req, res, next) {
    try {
      const message = await messageService.sendMessage(req.user.userId, req.body);
      return sendSuccess(res, 201, "Message sent", message);
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req, res, next) {
    try {
      const { conversationId } = req.params;
      const { page, limit, before } = req.query;
      const { messages, total } = await messageService.getMessages(
        req.user.userId,
        conversationId,
        page,
        limit,
        before
      );
      return sendPaginated(res, messages, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async deleteMessage(req, res, next) {
    try {
      const result = await messageService.deleteMessage(req.user.userId, req.params.messageId);
      return sendSuccess(res, 200, "Message deleted", result);
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      await messageService.markAsRead(req.user.userId, req.params.conversationId);
      return sendSuccess(res, 200, "Messages marked as read");
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await messageService.getUnreadCount(req.user.userId);
      return sendSuccess(res, 200, "Unread count retrieved", { unreadCount: count });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MessageController();
