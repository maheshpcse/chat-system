"use strict";

/**
 * Application Error Classes
 * Custom error hierarchy for consistent error handling.
 * Each error type maps to a specific HTTP status code.
 */

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad Request") {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource Not Found") {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

class ValidationError extends AppError {
  constructor(message = "Validation Error", errors = []) {
    super(message, 422);
    this.errors = errors;
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = "Too Many Requests") {
    super(message, 429);
  }
}

class InternalServerError extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, 500, false);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = "Service Unavailable") {
    super(message, 503);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  TooManyRequestsError,
  InternalServerError,
  ServiceUnavailableError,
};
