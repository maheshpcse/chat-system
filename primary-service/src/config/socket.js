"use strict";

/**
 * Socket.IO Configuration
 * Sets up WebSocket server with authentication, rooms, and event handling.
 */

const { Server } = require("socket.io");
const { config } = require("./environment");
const logger = require("../utils/logger");

let io = null;

/**
 * Initializes Socket.IO server attached to HTTP server.
 * @param {Object} httpServer - Node.js HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: config.socket.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true, // Support Socket.IO v2 clients (EIO=3)
    pingTimeout: config.socket.pingTimeout,
    pingInterval: config.socket.pingInterval,
    transports: ["websocket", "polling"],
  });

  logger.info("Socket.IO server initialized");
  return io;
};

/**
 * Gets the Socket.IO server instance.
 * @returns {Object} Socket.IO server instance
 */
const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
