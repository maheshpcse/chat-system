"use strict";

const { getRedisClient } = require("../../config/redis");
const { REDIS_KEYS } = require("../../utils/constants");
const contactRepository = require("../contact/contact.repository");
const settingsRepository = require("../settings/settings.repository");

const PRIVACY_EVERYONE = "everyone";
const PRIVACY_CONTACTS = "contacts";
const PRIVACY_NOBODY = "nobody";

const resolvePrivacyLevel = (settings, key) => {
  if (!settings || settings[key] == null) {
    return PRIVACY_EVERYONE;
  }
  const raw = settings[key];
  if (typeof raw === "string") {
    return raw.toLowerCase();
  }
  if (raw && typeof raw === "object" && raw.value) {
    return String(raw.value).toLowerCase();
  }
  return String(raw).toLowerCase();
};

const canViewerSee = async (targetUserId, viewerId, level) => {
  if (!viewerId || String(targetUserId) === String(viewerId)) {
    return true;
  }
  const normalized = (level || PRIVACY_EVERYONE).toLowerCase();
  if (normalized === PRIVACY_NOBODY) {
    return false;
  }
  if (normalized === PRIVACY_EVERYONE) {
    return true;
  }
  if (normalized === PRIVACY_CONTACTS) {
    try {
      const contacts = await contactRepository.getUserContacts(targetUserId);
      return (contacts || []).some(
        (c) => String(c.contactUserId) === String(viewerId)
      );
    } catch (e) {
      return false;
    }
  }
  return true;
};

const applyPresencePrivacy = async (raw, viewerId) => {
  const targetUserId = raw.userId;
  let settings = {};
  try {
    settings = await settingsRepository.getUserSettings(targetUserId);
  } catch (e) {
    settings = {};
  }

  const onlinePrivacy =
    settings["privacy.onlineStatus"] != null
      ? resolvePrivacyLevel(settings, "privacy.onlineStatus")
      : resolvePrivacyLevel(settings, "onlineStatus");
  const lastSeenPrivacy =
    settings["privacy.lastSeen"] != null
      ? resolvePrivacyLevel(settings, "privacy.lastSeen")
      : resolvePrivacyLevel(settings, "lastSeen");

  const showOnline = await canViewerSee(targetUserId, viewerId, onlinePrivacy);
  const showLastSeen = await canViewerSee(
    targetUserId,
    viewerId,
    lastSeenPrivacy
  );

  return {
    userId: targetUserId,
    isOnline: showOnline ? !!raw.isOnline : false,
    lastSeen: showLastSeen ? raw.lastSeen || null : null,
    activeDevices: raw.activeDevices != null ? raw.activeDevices : undefined,
    privacyHidden: !showOnline && !showLastSeen,
  };
};

const getContactsPresence = async (userId) => {
  const redis = getRedisClient();
  const contacts = await contactRepository.getUserContacts(userId);

  const presenceData = await Promise.all(
    (contacts || []).map(async (contact) => {
      const contactUserId = contact.contactUserId;
      const isOnline = await redis.get(
        REDIS_KEYS.USER_ONLINE + contactUserId
      );
      const lastSeen = await redis.get("user:lastSeen:" + contactUserId);

      const raw = {
        userId: contactUserId,
        isOnline: !!isOnline,
        lastSeen: lastSeen || null,
      };
      return applyPresencePrivacy(raw, userId);
    })
  );

  return presenceData;
};

const getUserPresence = async (userId, viewerId) => {
  const redis = getRedisClient();
  const isOnline = await redis.get(REDIS_KEYS.USER_ONLINE + userId);
  const lastSeen = await redis.get("user:lastSeen:" + userId);
  const sessionCount = await redis.get(REDIS_KEYS.USER_SESSIONS + userId);

  const raw = {
    userId: userId,
    isOnline: !!isOnline,
    lastSeen: lastSeen || null,
    activeDevices: parseInt(sessionCount, 10) || 0,
  };

  return applyPresencePrivacy(raw, viewerId || userId);
};

module.exports = { getContactsPresence, getUserPresence };
