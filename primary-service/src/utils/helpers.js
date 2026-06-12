"use strict";

/**
 * Helper Utilities
 * Common utility functions used across the application.
 */

const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

/**
 * Generates a UUID v4 string.
 * @returns {string} UUID
 */
const generateId = () => uuidv4();

/**
 * Generates a random token for verification, password reset, etc.
 * @param {number} bytes - Number of random bytes
 * @returns {string} Hex-encoded random token
 */
const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

/**
 * Safely parses JSON without throwing.
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed value or fallback
 */
const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};

/**
 * Removes undefined and null values from an object.
 * @param {Object} obj - Source object
 * @returns {Object} Cleaned object
 */
const cleanObject = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined && value !== null)
  );

/**
 * Picks specified keys from an object.
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to pick
 * @returns {Object} New object with only specified keys
 */
const pick = (obj, keys) =>
  Object.fromEntries(
    keys.filter((key) => key in obj).map((key) => [key, obj[key]])
  );

/**
 * Omits specified keys from an object.
 * @param {Object} obj - Source object
 * @param {Array<string>} keys - Keys to omit
 * @returns {Object} New object without specified keys
 */
const omit = (obj, keys) =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );

/**
 * Delays execution for specified milliseconds.
 * Useful for retry mechanisms.
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Formats a date to ISO string without milliseconds.
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
const formatDate = (date = new Date()) => date.toISOString().split(".")[0] + "Z";

/**
 * Truncates a string to specified length with ellipsis.
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated string
 */
const truncate = (str, maxLength = 100) =>
  str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;

module.exports = {
  generateId,
  generateToken,
  safeJsonParse,
  cleanObject,
  pick,
  omit,
  delay,
  formatDate,
  truncate,
};
