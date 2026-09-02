"use strict";

/**
 * Rate Limiting Middleware
 * Protects against brute force and DDoS attacks.
 * Different limits for different route groups.
 */

const rateLimit = require("express-rate-limit");
const { config } = require("../config/environment");
const { TooManyRequestsError } = require("../utils/errors");

/**
 * General API rate limiter.
 * Applies to all routes by default.
 */
const skipOptions = (req) => req.method === "OPTIONS";

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipOptions,
  handler: (req, res, next) => {
    next(new TooManyRequestsError("Too many requests. Please try again later."));
  },
});

/**
 * Strict limiter for authentication routes.
 * Prevents brute force login attempts.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 40, // raised from 10 — login + refresh + multi-device
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // successful auth does not count against limit
  skip: skipOptions,
  handler: (req, res, next) => {
    next(new TooManyRequestsError("Too many login attempts. Please try again after 15 minutes."));
  },
});

/**
 * Message sending rate limiter.
 * Prevents message flooding in chat.
 */
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // raised from 60
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? req.user.userId : req.ip,
  handler: (req, res, next) => {
    next(new TooManyRequestsError("Message rate limit exceeded. Please slow down."));
  },
});

/**
 * File upload rate limiter.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // raised from 50
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user ? req.user.userId : req.ip,
  handler: (req, res, next) => {
    next(new TooManyRequestsError("Upload limit exceeded. Please try again later."));
  },
});

module.exports = { generalLimiter, authLimiter, messageLimiter, uploadLimiter };
