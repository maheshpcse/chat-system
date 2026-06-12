"use strict";

/**
 * Logger Utility
 * Centralized logging using Winston with file and console transports.
 * Structured logging with timestamps and log levels.
 */

const winston = require("winston");
const path = require("path");

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    return `[${timestamp}] ${level}: ${message} ${metaStr}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "debug",
  format: logFormat,
  defaultMeta: { service: "chat-primary" },
  transports: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_FILE_PATH || "./logs", "error.log"),
      level: "error",
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(process.env.LOG_FILE_PATH || "./logs", "combined.log"),
      maxsize: 5242880,
      maxFiles: 5,
    }),
  ],
});

// Add console transport for non-production environments
if (process.env.APP_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

module.exports = logger;
