"use strict";

/**
 * Admin Dashboard Service
 */

const adminDashboardRepository = require("./admin-dashboard.repository");

class AdminDashboardService {
  async getOverview() {
    const stats = await adminDashboardRepository.getStats();
    const activity = await adminDashboardRepository.getRecentActivity(10);

    return {
      stats: {
        totalUsers: Number(stats?.totalUsers || 0),
        onlineUsers: Number(stats?.onlineUsers || 0),
        activeUsers: Number(stats?.activeUsers || 0),
        bannedUsers: Number(stats?.bannedUsers || 0),
        totalGroups: Number(stats?.totalGroups || 0),
        totalMessages: Number(stats?.totalMessages || 0),
        privateConversations: Number(stats?.privateConversations || 0),
        groupConversations: Number(stats?.groupConversations || 0),
        totalFriends: Number(stats?.totalFriends || 0),
        pendingFriendRequests: Number(stats?.pendingFriendRequests || 0),
        unreadNotifications: Number(stats?.unreadNotifications || 0),
      },
      recentUsers: activity.recentUsers,
      recentMessages: activity.recentMessages,
    };
  }
}

module.exports = new AdminDashboardService();
