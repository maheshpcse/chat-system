"use strict";

/**
 * User Service
 * Business logic for user profile management.
 * Integrates Redis caching for profile data.
 */

const userRepository = require("./user.repository");
const { getRedisClient } = require("../../config/redis");
const { NotFoundError } = require("../../utils/errors");
const { REDIS_KEYS, REDIS_TTL } = require("../../utils/constants");
const logger = require("../../utils/logger");

class UserService {
  async getProfile(userId) {
    const redis = getRedisClient();
    const cacheKey = `${REDIS_KEYS.USER_PROFILE}${userId}`;

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Remove sensitive data before caching
    const { passwordHash, ...profile } = user;

    // Cache the profile
    await redis.setex(cacheKey, REDIS_TTL.USER_PROFILE, JSON.stringify(profile));

    return profile;
  }

  async updateProfile(userId, profileData) {
    const updatedUser = await userRepository.updateProfile(userId, profileData);
    if (!updatedUser) {
      throw new NotFoundError("User not found");
    }

    // Invalidate cache
    const redis = getRedisClient();
    await redis.del(`${REDIS_KEYS.USER_PROFILE}${userId}`);

    logger.info("Profile updated", { userId });
    return updatedUser;
  }

  async searchUsers(searchTerm, page, limit) {
    return userRepository.searchUsers(searchTerm, page, limit);
  }

  async setOnlineStatus(userId, isOnline) {
    const redis = getRedisClient();
    const onlineKey = `${REDIS_KEYS.USER_ONLINE}${userId}`;

    if (isOnline) {
      await redis.setex(onlineKey, REDIS_TTL.ONLINE_STATUS, "1");
    } else {
      await redis.del(onlineKey);
    }

    await userRepository.updateOnlineStatus(userId, isOnline);
  }

  async isUserOnline(userId) {
    const redis = getRedisClient();
    const result = await redis.get(`${REDIS_KEYS.USER_ONLINE}${userId}`);
    return result === "1";
  }
}

module.exports = new UserService();
