"use strict";

/**
 * Authentication Module Index
 */

const authRoutes = require("./authentication.routes");
const authController = require("./authentication.controller");
const authService = require("./authentication.service");
const authRepository = require("./authentication.repository");

module.exports = {
  authRoutes,
  authController,
  authService,
  authRepository,
};
