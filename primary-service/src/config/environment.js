"use strict";

/**
 * Environment Configuration Loader
 * Loads and validates all environment variables required by the application.
 * Uses dotenv for .env file loading and provides typed access to configuration.
 */

const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const config = {
  app: {
    name: process.env.APP_NAME || "ChatPrimaryService",
    port: parseInt(process.env.APP_PORT, 10) || 3000,
    env: process.env.APP_ENV || "development",
    version: process.env.APP_VERSION || "1.0.0",
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiry: process.env.JWT_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  mysql: {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    database: process.env.MYSQL_DATABASE || "chat_system",
    user: process.env.MYSQL_USERNAME || "root",
    password: process.env.MYSQL_PASSWORD || "",
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 20,
    queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT, 10) || 0,
  },

  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017/chat_analytics",
  },

  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: process.env.REDIS_KEY_PREFIX || "chat:",
  },

  aws: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET || "chat-uploads-bucket",
    secretName: process.env.AWS_SECRET_NAME || "chat/production/secrets",
    parameterName: process.env.AWS_PARAMETER_NAME || "/chat/production/config",
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760,
    uploadPath: process.env.UPLOAD_PATH || "./uploads",
    allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || "image/jpeg,image/png,image/gif").split(","),
  },

  socket: {
    corsOrigin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:4200",
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT, 10) || 60000,
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL, 10) || 25000,
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  logging: {
    level: process.env.LOG_LEVEL || "debug",
    filePath: process.env.LOG_FILE_PATH || "./logs",
  },

  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:4200",
    methods: (process.env.CORS_METHODS || "GET,POST,PUT,DELETE,PATCH").split(","),
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },
};

/**
 * Validates that all required environment variables are present.
 * Throws an error if any critical configuration is missing.
 */
const validateConfig = () => {
  const requiredVars = [
    { key: "JWT_SECRET", value: config.jwt.secret },
    { key: "JWT_REFRESH_SECRET", value: config.jwt.refreshSecret },
    { key: "MYSQL_HOST", value: config.mysql.host },
    { key: "MYSQL_DATABASE", value: config.mysql.database },
  ];

  const missingVars = requiredVars
    .filter((item) => !item.value)
    .map((item) => item.key);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`
    );
  }
};

module.exports = { config, validateConfig };
