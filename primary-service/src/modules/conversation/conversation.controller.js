"use strict";

const conversationService = require("./conversation.service");
const { sendSuccess, sendPaginated } = require("../../utils/response");

class ConversationController {
  async create(req, res, next) {
    try {
      const conversation = await conversationService.createPrivateConversation(
        req.user.userId,
        req.body.participantId
      );
      return sendSuccess(res, 201, "Conversation created", conversation);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const { page, limit } = req.query;
      const { conversations, total } = await conversationService.getUserConversations(
        req.user.userId,
        page,
        limit
      );
      return sendPaginated(res, conversations, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const conversation = await conversationService.getConversationById(
        req.params.conversationId,
        req.user.userId
      );
      return sendSuccess(res, 200, "Conversation retrieved", conversation);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConversationController();
