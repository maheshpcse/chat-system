"use strict";

const notificationRepository = require("./notification.repository");
const { sendSuccess, sendPaginated } = require("../../utils/response");

class NotificationController {
  async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const notifications = await notificationRepository.getUserNotifications(
        req.user.userId,
        parseInt(page),
        parseInt(limit)
      );
      return sendSuccess(res, 200, "Notifications retrieved", notifications);
    } catch (error) {
      next(error);
    }
  }

  async getUnreadCount(req, res, next) {
    try {
      const count = await notificationRepository.getUnreadCount(
        req.user.userId
      );
      return sendSuccess(res, 200, "Unread count retrieved", {
        unreadCount: count,
      });
    } catch (error) {
      next(error);
    }
  }

  async markAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;
      await notificationRepository.markAsRead(notificationId, req.user.userId);
      return sendSuccess(res, 200, "Notification marked as read");
    } catch (error) {
      next(error);
    }
  }

  async markAllAsRead(req, res, next) {
    try {
      await notificationRepository.markAllAsRead(req.user.userId);
      return sendSuccess(res, 200, "All notifications marked as read");
    } catch (error) {
      next(error);
    }
  }

  async clearAll(req, res, next) {
    try {
      await notificationRepository.clearAll(req.user.userId);
      return sendSuccess(res, 200, "All notifications cleared");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new NotificationController();
