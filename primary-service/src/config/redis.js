"use strict";

/**
 * Redis Configuration
 * Manages Redis connection using ioredis with reconnection strategies.
 * Provides pub/sub capabilities for real-time features.
 */

const Redis = require("ioredis");
const { config } = require("./environment");
const logger = require("../utils/logger");

let redisClient = null;
let redisSubscriber = null;
let redisPublisher = null;

/**
 * Creates a Redis client with retry strategy.
 * @param {string} purpose - Purpose label for logging
 * @returns {Object} Redis client instance
 */
const createRedisClient = (purpose = "default") => {
  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
    keyPrefix: config.redis.keyPrefix,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      logger.warn(`Redis [${purpose}] retry attempt ${times}, delay ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on("connect", () => {
    logger.info(`Redis [${purpose}] connected`);
  });

  client.on("error", (error) => {
    logger.error(`Redis [${purpose}] error:`, error.message);
  });

  client.on("close", () => {
    logger.warn(`Redis [${purpose}] connection closed`);
  });

  return client;
};

/**
 * Gets the main Redis client for caching operations.
 * @returns {Object} Redis client
 */
const getRedisClient = () => {
  if (!redisClient) {
    redisClient = createRedisClient("cache");
  }
  return redisClient;
};

/**
 * Gets the Redis subscriber for pub/sub operations.
 * @returns {Object} Redis subscriber client
 */
const getRedisSubscriber = () => {
  if (!redisSubscriber) {
    redisSubscriber = createRedisClient("subscriber");
  }
  return redisSubscriber;
};

/**
 * Gets the Redis publisher for pub/sub operations.
 * @returns {Object} Redis publisher client
 */
const getRedisPublisher = () => {
  if (!redisPublisher) {
    redisPublisher = createRedisClient("publisher");
  }
  return redisPublisher;
};

/**
 * Closes all Redis connections gracefully.
 */
const closeRedisConnections = async () => {
  const connections = [
    { client: redisClient, name: "cache" },
    { client: redisSubscriber, name: "subscriber" },
    { client: redisPublisher, name: "publisher" },
  ];

  await Promise.all(
    connections
      .filter((conn) => conn.client)
      .map(async (conn) => {
        await conn.client.quit();
        logger.info(`Redis [${conn.name}] disconnected`);
      })
  );

  redisClient = null;
  redisSubscriber = null;
  redisPublisher = null;
};

module.exports = {
  getRedisClient,
  getRedisSubscriber,
  getRedisPublisher,
  closeRedisConnections,
};
