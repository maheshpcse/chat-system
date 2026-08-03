"use strict";

/**
 * Notification Repository
 * Data access layer for persistent notification operations via stored procedures.
 */

const { callProcedure } = require("../../config/database");

class NotificationRepository {
  async create(userId, { actorUserId = null, type, title, body = null, entityType = null, entityId = null, data = null }) {
    const result = await callProcedure("spCreateNotification", [
      userId,
      actorUserId,
      type,
      title,
      body,
      entityType,
      entityId,
      data ? JSON.stringify(data) : null,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async getUserNotifications(userId, page = 1, limit = 20) {
    const result = await callProcedure("spGetUserNotifications", [
      userId,
      page,
      limit,
    ]);
    return result[0] || [];
  }

  async getUnreadCount(userId) {
    const result = await callProcedure("spGetUnreadNotificationCount", [
      userId,
    ]);
    return result[0] ? result[0][0].unreadCount : 0;
  }

  async markAsRead(notificationId, userId) {
    await callProcedure("spMarkNotificationRead", [notificationId, userId]);
  }

  async markAllAsRead(userId) {
    await callProcedure("spMarkAllNotificationsRead", [userId]);
  }

  async clearAll(userId) {
    await callProcedure("spClearNotifications", [userId]);
  }
}

module.exports = new NotificationRepository();
