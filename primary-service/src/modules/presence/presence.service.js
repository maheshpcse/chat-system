"use strict";

const { getRedisClient } = require("../../config/redis");
const { REDIS_KEYS } = require("../../utils/constants");
const contactRepository = require("../contact/contact.repository");

const getContactsPresence = async (userId) => {
  const redis = getRedisClient();

  // Get user's contacts
  const contacts = await contactRepository.getUserContacts(userId);

  // Check online status for each contact
  const presenceData = await Promise.all(
    contacts.map(async (contact) => {
      const contactUserId = contact.contactUserId;
      const isOnline = await redis.get(`${REDIS_KEYS.USER_ONLINE}${contactUserId}`);
      const lastSeen = await redis.get(`user:lastSeen:${contactUserId}`);

      return {
        userId: contactUserId,
        isOnline: !!isOnline,
        lastSeen: lastSeen || null,
      };
    })
  );

  return presenceData;
};

const getUserPresence = async (userId) => {
  const redis = getRedisClient();
  const isOnline = await redis.get(`${REDIS_KEYS.USER_ONLINE}${userId}`);
  const lastSeen = await redis.get(`user:lastSeen:${userId}`);
  const sessionCount = await redis.get(`${REDIS_KEYS.USER_SESSIONS}${userId}`);

  return {
    userId,
    isOnline: !!isOnline,
    lastSeen: lastSeen || null,
    activeDevices: parseInt(sessionCount) || 0,
  };
};

module.exports = { getContactsPresence, getUserPresence };
