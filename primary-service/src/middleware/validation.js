"use strict";

/**
 * Request Validation Middleware
 * Uses Joi schemas to validate request body, params, and query.
 * Demonstrates Higher Order Function pattern for reusable validation.
 */

const { ValidationError } = require("../utils/errors");

/**
 * Creates a validation middleware for a given Joi schema.
 * HIGHER ORDER FUNCTION - takes a schema and returns a middleware.
 *
 * @param {Object} schema - Joi validation schema object { body, params, query }
 * @returns {Function} Express middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const errors = [];

    const sources = ["body", "params", "query"];

    sources.forEach((source) => {
      if (schema[source]) {
        const { error, value } = schema[source].validate(req[source], {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false,
        });

        if (error) {
          const fieldErrors = error.details.map((detail) => ({
            field: detail.path.join("."),
            message: detail.message.replace(/['"]/g, ""),
            type: detail.type,
          }));
          errors.push(...fieldErrors);
        } else {
          // Replace request source with validated/sanitized data
          req[source] = value;
        }
      }
    });

    if (errors.length > 0) {
      return next(new ValidationError("Validation failed", errors));
    }

    next();
  };
};

module.exports = { validate };
