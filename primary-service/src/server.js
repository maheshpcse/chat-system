"use strict";

/**
 * Server Entry Point
 * Bootstraps the application: validates config, connects databases,
 * initializes Socket.IO, and starts HTTP server.
 */

const http = require("http");
const app = require("./app");
const { config, validateConfig } = require("./config/environment");
const { createPool, testConnection, closePool } = require("./config/database");
const { getRedisClient, closeRedisConnections } = require("./config/redis");
const { initializeSocket } = require("./config/socket");
const { initializeSocketHandlers } = require("./socket/socketHandler");
const logger = require("./utils/logger");

/**
 * Application Bootstrap
 */
const startServer = async () => {
  try {
    // Step 1: Validate environment configuration
    validateConfig();
    logger.info(`Environment: ${config.app.env}`);

    // Step 2: Initialize MySQL connection pool
    createPool();
    await testConnection();
    logger.info("MySQL connected successfully");

    // Step 3: Initialize Redis
    const redis = getRedisClient();
    await redis.ping();
    logger.info("Redis connected successfully");

    // Step 4: Create HTTP server and attach Socket.IO
    const httpServer = http.createServer(app);
    const io = initializeSocket(httpServer);

    // Step 5: Initialize WebSocket event handlers
    initializeSocketHandlers(io);
    logger.info("Socket.IO handlers initialized");

    // Step 6: Start listening
    httpServer.listen(config.app.port, () => {
      logger.info(`🚀 ${config.app.name} v${config.app.version} running on port ${config.app.port}`);
      logger.info(`API Base: http://localhost:${config.app.port}/api/v1`);
      logger.info(`Health: http://localhost:${config.app.port}/api/v1/health`);
    });

    // Graceful shutdown handlers
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        logger.info("HTTP server closed");
        await closePool();
        await closeRedisConnections();
        logger.info("All connections closed. Exiting.");
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));

    // Unhandled rejection handler
    process.on("unhandledRejection", (reason) => {
      logger.error("Unhandled Rejection:", reason);
    });

    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });

  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
