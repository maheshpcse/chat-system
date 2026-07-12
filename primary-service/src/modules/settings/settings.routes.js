"use strict";

const { Router } = require("express");
const settingsController = require("./settings.controller");
const { authenticate } = require("../../middleware/authentication");

const router = Router();

router.get("/", authenticate, settingsController.getSettings);
router.put("/", authenticate, settingsController.updateSettings);
router.put("/:key", authenticate, settingsController.updateSetting);
router.delete("/:key", authenticate, settingsController.deleteSetting);

module.exports = router;
