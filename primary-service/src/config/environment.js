"use strict";

/**
 * Environment Configuration Loader
 * Loads and validates all environment variables required by the application.
 * Uses dotenv for .env file loading and provides typed access to configuration.
 */

const dotenv = require("dotenv");
const path = require("path");

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(normalized);
};

/**
 * Normalize CORS / Socket.IO origins for browser Origin header matching.
 * - Comma-separated lists supported
 * - Paths stripped (https://host/chat-app → https://host) — browsers never send path
 * - Single entry → string; multiple → string[]
 */
const parseCorsOrigins = (raw) => {
  const fallback = "http://localhost:5200";
  const parts = String(raw || fallback)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((entry) => {
      if (entry === "*") {
        return "*";
      }
      try {
        const url = new URL(entry);
        // Origin = protocol + host + port only (no path/query)
        return url.origin;
      } catch (_err) {
        // Already origin-like or invalid URL — strip trailing slash/path best-effort
        return entry.replace(/\/+$/, "").replace(/(\/[^/]+)+$/, (m, _g, offset, s) => {
          // If looks like scheme://host/path, keep scheme://host
          const match = s.match(/^(https?:\/\/[^/]+)/i);
          return match ? "" : m;
        }) || entry;
      }
    })
    .map((entry) => {
      if (entry === "*") {
        return "*";
      }
      try {
        return new URL(entry).origin;
      } catch (_e) {
        const m = String(entry).match(/^(https?:\/\/[^/]+)/i);
        return m ? m[1] : entry.replace(/\/+$/, "");
      }
    })
    .filter(Boolean);

  const unique = [...new Set(parts.length ? parts : [fallback])];
  return unique.length === 1 ? unique[0] : unique;
};

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Railway / cloud hosts inject PORT. Prefer it over APP_PORT.
const resolvedPort = parseInt(process.env.PORT || process.env.APP_PORT, 10) || 3000;

// Railway MySQL plugin uses MYSQLHOST / MYSQLUSER / etc. (no underscores).
const mysqlHost =
  process.env.MYSQL_HOST || process.env.MYSQLHOST || "localhost";
const mysqlPort = parseInt(
  process.env.MYSQL_PORT || process.env.MYSQLPORT || "3306",
  10
);
const mysqlDatabase =
  process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || "chat_system";
const mysqlUser =
  process.env.MYSQL_USERNAME || process.env.MYSQLUSER || "root";
const mysqlPassword =
  process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || "";

// Optional REDIS_URL (redis://[:password@]host:port/db)
const parseRedisUrl = (url) => {
  if (!url || typeof url !== "string") {
    return null;
  }
  try {
    const parsed = new URL(url);
    const dbFromPath = parsed.pathname && parsed.pathname !== "/"
      ? parseInt(parsed.pathname.replace(/^\//, ""), 10)
      : NaN;
    return {
      host: parsed.hostname || "localhost",
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      db: Number.isFinite(dbFromPath) ? dbFromPath : 0,
    };
  } catch (_err) {
    return null;
  }
};

const redisFromUrl = parseRedisUrl(
  process.env.REDIS_URL || process.env.REDISURL
);

const config = {
  app: {
    name: process.env.APP_NAME || "ChatPrimaryService",
    // Railway requires binding the injected PORT on 0.0.0.0
    port: resolvedPort,
    host: process.env.HOST || process.env.APP_HOST || "0.0.0.0",
    env: process.env.APP_ENV || process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || "1.0.0",
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiry: process.env.JWT_EXPIRY || "15m",
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || "7d",
    adminSecret: process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
    adminRefreshSecret: process.env.JWT_ADMIN_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
    adminExpiry: process.env.JWT_ADMIN_EXPIRY || process.env.JWT_EXPIRY || "15m",
    adminRefreshExpiry: process.env.JWT_ADMIN_REFRESH_EXPIRY || process.env.JWT_REFRESH_EXPIRY || "7d",
  },

  admin: {
    email: process.env.ADMIN_EMAIL || "admin@chatapp.com",
    password: process.env.ADMIN_PASSWORD || "Admin@12345",
    firstName: process.env.ADMIN_FIRST_NAME || "Super",
    lastName: process.env.ADMIN_LAST_NAME || "Admin",
  },

  mysql: {
    host: mysqlHost,
    port: mysqlPort,
    database: mysqlDatabase,
    user: mysqlUser,
    password: mysqlPassword,
    connectionLimit: parseInt(process.env.MYSQL_CONNECTION_LIMIT, 10) || 20,
    queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT, 10) || 0,
  },

  mongo: {
    uri: process.env.MONGO_URI || "mongodb://localhost:27017/chat_analytics",
  },

  redis: {
    host: process.env.REDIS_HOST || process.env.REDISHOST || (redisFromUrl && redisFromUrl.host) || "localhost",
    port: parseInt(
      process.env.REDIS_PORT || process.env.REDISPORT || String((redisFromUrl && redisFromUrl.port) || 6379),
      10
    ),
    password:
      process.env.REDIS_PASSWORD ||
      process.env.REDISPASSWORD ||
      (redisFromUrl && redisFromUrl.password) ||
      undefined,
    db: parseInt(
      process.env.REDIS_DB || String((redisFromUrl && redisFromUrl.db) || 0),
      10
    ),
    keyPrefix: process.env.REDIS_KEY_PREFIX || "chat:",
    // Default optional unless explicitly required (Railway often has no Redis at first).
    required: parseBoolean(process.env.REDIS_REQUIRED, false),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000,
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES_PER_REQUEST, 10) || 3,
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
    // Browser Origin is scheme+host(+port) only — paths like /chat-app are stripped.
    corsOrigin: parseCorsOrigins(
      process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || "http://localhost:5200"
    ),
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
    // Comma-separated list OK. Paths (e.g. /chat-app) stripped to real Origin.
    origin: parseCorsOrigins(process.env.CORS_ORIGIN || "http://localhost:5200"),
    methods: (process.env.CORS_METHODS || "GET,POST,PUT,PATCH,DELETE,OPTIONS")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean),
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
    { key: "JWT_ADMIN_SECRET", value: config.jwt.adminSecret },
    { key: "JWT_ADMIN_REFRESH_SECRET", value: config.jwt.adminRefreshSecret },
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
