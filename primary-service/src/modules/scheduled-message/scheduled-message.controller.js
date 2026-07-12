"use strict";

const scheduledMessageRepository = require("./scheduled-message.repository");
const { sendSuccess } = require("../../utils/response");

class ScheduledMessageController {
  async create(req, res, next) {
    try {
      const { conversationId, content, messageType, fileUrl, scheduledAt } =
        req.body;

      if (!conversationId || !content || !scheduledAt) {
        return res.status(400).json({
          success: false,
          message: "conversationId, content, and scheduledAt are required",
        });
      }

      // Validate scheduledAt is in the future
      const schedDate = new Date(scheduledAt);
      if (schedDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: "Scheduled time must be in the future",
        });
      }

      const scheduled = await scheduledMessageRepository.create(
        req.user.userId,
        conversationId,
        content,
        messageType,
        fileUrl,
        schedDate
      );

      return sendSuccess(res, 201, "Message scheduled", scheduled);
    } catch (error) {
      next(error);
    }
  }

  async getMyScheduled(req, res, next) {
    try {
      const { status } = req.query;
      const messages =
        await scheduledMessageRepository.getUserScheduledMessages(
          req.user.userId,
          status || null
        );
      return sendSuccess(res, 200, "Scheduled messages retrieved", messages);
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const { id } = req.params;
      const cancelled = await scheduledMessageRepository.cancel(
        id,
        req.user.userId
      );

      if (!cancelled) {
        return res.status(404).json({
          success: false,
          message:
            "Scheduled message not found or already sent/cancelled",
        });
      }

      return sendSuccess(res, 200, "Scheduled message cancelled");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ScheduledMessageController();
