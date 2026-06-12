"use strict";

/**
 * Cache Service
 * Centralized Redis caching with TTL management and invalidation strategies.
 *
 * Cache Invalidation Strategy:
 * 1. TTL-based: All cached data has expiration times
 * 2. Write-through: Cache is updated/invalidated on every write operation
 * 3. Event-driven: Cache invalidation triggered by domain events
 * 4. Pattern-based: Bulk invalidation using Redis key patterns
 */

const { getRedisClient } = require("../../config/redis");
const logger = require("../../utils/logger");

class CacheService {
  constructor() {
    this.defaultTtl = 3600; // 1 hour
  }

  /**
   * Gets a value from cache.
   * @param {string} key - Cache key
   * @returns {Promise<*>} Parsed value or null
   */
  async get(key) {
    const redis = getRedisClient();
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * Sets a value in cache with TTL.
   * @param {string} key - Cache key
   * @param {*} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = this.defaultTtl) {
    const redis = getRedisClient();
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  /**
   * Deletes a cache entry.
   * @param {string} key - Cache key to delete
   */
  async delete(key) {
    const redis = getRedisClient();
    await redis.del(key);
  }

  /**
   * Deletes all keys matching a pattern.
   * Uses SCAN for production safety (non-blocking).
   * @param {string} pattern - Key pattern (e.g., "user:profile:*")
   */
  async deletePattern(pattern) {
    const redis = getRedisClient();
    let cursor = "0";

    do {
      const [newCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = newCursor;

      if (keys.length > 0) {
        // Remove key prefix before deleting (ioredis adds prefix automatically)
        await redis.del(...keys.map((k) => k.replace(redis.options.keyPrefix || "", "")));
      }
    } while (cursor !== "0");
  }

  /**
   * Cache-aside pattern implementation.
   * HIGHER ORDER FUNCTION - wraps a data fetcher with caching.
   *
   * @param {string} key - Cache key
   * @param {Function} fetcher - Async function to fetch data if cache miss
   * @param {number} ttl - TTL in seconds
   * @returns {Promise<*>} Cached or freshly fetched data
   */
  async getOrSet(key, fetcher, ttl = this.defaultTtl) {
    const cached = await this.get(key);
    if (cached) {
      return cached;
    }

    const data = await fetcher();
    if (data) {
      await this.set(key, data, ttl);
    }
    return data;
  }

  /**
   * Creates a cache wrapper function (CURRYING pattern).
   * Returns a function that automatically caches results.
   *
   * @param {string} keyPrefix - Prefix for cache keys
   * @param {number} ttl - TTL in seconds
   * @returns {Function} Curried caching function
   *
   * @example
   * const cacheUser = cacheService.createCacheWrapper("user:profile:", 3600);
   * const user = await cacheUser(userId, () => userRepository.findById(userId));
   */
  createCacheWrapper(keyPrefix, ttl = this.defaultTtl) {
    return (identifier, fetcher) => {
      const key = `${keyPrefix}${identifier}`;
      return this.getOrSet(key, fetcher, ttl);
    };
  }

  /**
   * Invalidates all caches related to a user.
   * Used when user data changes significantly.
   * @param {string} userId - User ID
   */
  async invalidateUserCaches(userId) {
    await this.delete(`user:profile:${userId}`);
    await this.delete(`user:online:${userId}`);
    await this.deletePattern(`conversation:*:${userId}*`);
    logger.debug("User caches invalidated", { userId });
  }
}

module.exports = new CacheService();
