"use strict";

/**
 * Authorization Middleware
 * Role-based access control using Higher Order Functions.
 * Demonstrates currying for permission validation.
 */

const { ForbiddenError } = require("../utils/errors");

/**
 * Creates an authorization middleware that checks if user has required role.
 * Uses CURRYING pattern - returns a middleware function configured with allowed roles.
 *
 * @example
 * router.delete("/user/:id", authenticate, authorize("admin"), controller.delete);
 * router.put("/group", authenticate, authorize("admin", "moderator"), controller.update);
 *
 * @param {...string} allowedRoles - Roles that are permitted access
 * @returns {Function} Express middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError("Authentication required for authorization"));
    }

    const userRole = req.user.role;
    const hasPermission = allowedRoles.includes(userRole);

    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Role '${userRole}' does not have permission to access this resource`
        )
      );
    }

    next();
  };
};

/**
 * Checks if user owns the resource or has admin privileges.
 * Uses CLOSURE to capture the parameter name that holds the resource owner ID.
 *
 * @param {string} ownerField - Request param/body field containing owner ID
 * @returns {Function} Express middleware function
 */
const authorizeOwnerOrAdmin = (ownerField = "userId") => {
  return (req, res, next) => {
    const resourceOwnerId = req.params[ownerField] || req.body[ownerField];
    const currentUserId = req.user.userId;
    const isAdmin = req.user.role === "admin";
    const isOwner = resourceOwnerId === currentUserId;

    if (!isOwner && !isAdmin) {
      return next(
        new ForbiddenError("You do not have permission to perform this action")
      );
    }

    next();
  };
};

module.exports = { authorize, authorizeOwnerOrAdmin };
