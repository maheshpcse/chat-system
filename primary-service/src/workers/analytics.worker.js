"use strict";

/**
 * Analytics Worker Thread
 * Performs CPU-intensive analytics calculations in background.
 */

const { parentPort, workerData } = require("worker_threads");

const calculateAnalytics = () => {
  const { data, calculationType } = workerData;

  try {
    const calculations = {
      messageStats: () => computeMessageStats(data),
      userActivity: () => computeUserActivity(data),
      peakHours: () => computePeakHours(data),
    };

    const calculator = calculations[calculationType];
    if (!calculator) {
      throw new Error(`Unknown calculation type: ${calculationType}`);
    }

    const result = calculator();
    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
};

const computeMessageStats = (messages) => {
  const totalMessages = messages.length;
  const byType = messages.reduce((acc, msg) => {
    acc[msg.messageType] = (acc[msg.messageType] || 0) + 1;
    return acc;
  }, {});

  const avgLength = messages.reduce((sum, msg) => sum + (msg.content || "").length, 0) / totalMessages;

  return {
    totalMessages,
    byType,
    averageMessageLength: Math.round(avgLength),
    uniqueSenders: [...new Set(messages.map((m) => m.senderId))].length,
  };
};

const computeUserActivity = (activityLogs) => {
  const userStats = activityLogs.reduce((acc, log) => {
    if (!acc[log.userId]) {
      acc[log.userId] = { messagesSent: 0, lastActive: null };
    }
    acc[log.userId].messagesSent += 1;
    acc[log.userId].lastActive = log.timestamp;
    return acc;
  }, {});

  const sortedUsers = Object.entries(userStats)
    .sort(([, a], [, b]) => b.messagesSent - a.messagesSent)
    .slice(0, 20);

  return { topUsers: sortedUsers, totalActiveUsers: Object.keys(userStats).length };
};

const computePeakHours = (messages) => {
  const hourCounts = new Array(24).fill(0);

  messages.forEach((msg) => {
    const hour = new Date(msg.timestamp).getHours();
    hourCounts[hour] += 1;
  });

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  return { hourlyDistribution: hourCounts, peakHour, peakHourCount: hourCounts[peakHour] };
};

calculateAnalytics();
