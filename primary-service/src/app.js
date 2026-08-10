"use strict";

/**
 * Express Application Configuration
 * Sets up Express with all middleware, security headers, and routes.
 */

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const morgan = require("morgan");
const hpp = require("hpp");
const path = require("path");

const { config } = require("./config/environment");
const routes = require("./routes");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");
const { requestTracker } = require("./middleware/requestTracker");
const { generalLimiter } = require("./middleware/rateLimiter");

const app = express();

// =============================================
// Security Middleware
// =============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // SPA on another origin (GitHub Pages) calling this API
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
app.use(hpp()); // Prevent HTTP parameter pollution

// CORS must answer browser preflight (OPTIONS) with Access-Control-Allow-Origin.
// config.cors.origin is string | string[] (paths already stripped in environment.js).
const corsOriginOption = config.cors.origin;
app.use(cors({
  origin: corsOriginOption,
  methods: config.cors.methods,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
}));
// Explicit preflight for all routes (some proxies mishandle bare OPTIONS)
app.options("*", cors({
  origin: corsOriginOption,
  methods: config.cors.methods,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
}));

// =============================================
// Request Processing
// =============================================
app.use(compression()); // Gzip compression
app.use(express.json({ limit: "10mb" })); // JSON body parser
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // URL-encoded body parser

// =============================================
// Logging & Tracking
// =============================================
app.use(requestTracker); // Custom request tracking with audit

if (config.app.env !== "production") {
  app.use(morgan("dev")); // HTTP request logging in development
}

// =============================================
// Rate Limiting
// =============================================
app.use("/api", generalLimiter);

// =============================================
// Static Files (for local uploads)
// =============================================
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// =============================================
// API Routes
// =============================================
app.use("/api/v1", routes);

// =============================================
// Error Handling (must be last)
// =============================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
