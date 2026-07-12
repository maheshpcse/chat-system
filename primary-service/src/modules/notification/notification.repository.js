"use strict";

/**
 * Notification Repository
 * Data access layer for persistent notification operations via stored procedures.
 */

const { callProcedure } = require("../../config/database");

class NotificationRepository {
  async create(userId, type, title, message, data = null) {
    const result = await callProcedure("sp_create_notification", [
      userId,
      type,
      title,
      message,
      data ? JSON.stringify(data) : null,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async getUserNotifications(userId, page = 1, limit = 20) {
    const result = await callProcedure("sp_get_user_notifications", [
      userId,
      page,
      limit,
    ]);
    return result[0] || [];
  }

  async getUnreadCount(userId) {
    const result = await callProcedure("sp_get_unread_notification_count", [
      userId,
    ]);
    return result[0] ? result[0][0].unread_count : 0;
  }

  async markAsRead(notificationId, userId) {
    await callProcedure("sp_mark_notification_read", [notificationId, userId]);
  }

  async markAllAsRead(userId) {
    await callProcedure("sp_mark_all_notifications_read", [userId]);
  }

  async clearAll(userId) {
    await callProcedure("sp_clear_notifications", [userId]);
  }
}

module.exports = new NotificationRepository();
