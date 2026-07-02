"use strict";

const { Router } = require("express");
const presenceController = require("./presence.controller");
const { authenticate } = require("../../middleware/authentication");

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /api/v1/presence/contacts - Get online status of all contacts
router.get("/contacts", presenceController.getContactsPresence);

// GET /api/v1/presence/:userId - Get specific user's presence
router.get("/:userId", presenceController.getUserPresence);

module.exports = router;
