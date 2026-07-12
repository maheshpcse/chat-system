"use strict";

const { Router } = require("express");
const scheduledMessageController = require("./scheduled-message.controller");
const { authenticate } = require("../../middleware/authentication");

const router = Router();

router.post("/", authenticate, scheduledMessageController.create);
router.get("/", authenticate, scheduledMessageController.getMyScheduled);
router.put("/:id/cancel", authenticate, scheduledMessageController.cancel);

module.exports = router;
