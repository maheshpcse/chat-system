"use strict";

/**
 * Central Configuration Index
 * Re-exports all configuration modules for clean imports.
 */

const { config, validateConfig } = require("./environment");
const database = require("./database");
const redis = require("./redis");
const socket = require("./socket");

module.exports = {
  config,
  validateConfig,
  database,
  redis,
  socket,
};
