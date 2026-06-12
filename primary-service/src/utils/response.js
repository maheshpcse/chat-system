"use strict";

/**
 * API Response Utility
 * Standardizes all API responses across the application.
 * Ensures consistent response format for success and error cases.
 */

/**
 * Sends a success response.
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object|Array|null} data - Response payload
 * @param {Object} meta - Additional metadata (pagination, etc.)
 */
const sendSuccess = (res, statusCode = 200, message = "Success", data = null, meta = null) => {
  const response = {
    success: true,
    statusCode,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sends an error response.
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Array|null} errors - Detailed error list
 */
const sendError = (res, statusCode = 500, message = "Internal Server Error", errors = null) => {
  const response = {
    success: false,
    statusCode,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Sends a paginated response.
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} total - Total number of items
 */
const sendPaginated = (res, data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);

  return sendSuccess(res, 200, "Success", data, {
    pagination: {
      currentPage: page,
      itemsPerPage: limit,
      totalItems: total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
