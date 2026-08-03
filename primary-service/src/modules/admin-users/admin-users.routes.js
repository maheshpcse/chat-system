"use strict";

const { Router } = require("express");
const adminUsersController = require("./admin-users.controller");
const { authenticateAdmin } = require("../../middleware/adminAuthentication");
const { validate } = require("../../middleware/validation");
const {
  listUsersSchema,
  userIdParamSchema,
  updateStatusSchema,
} = require("./admin-users.validation");

const router = Router();

router.use(authenticateAdmin);
router.get("/", validate(listUsersSchema), adminUsersController.list);
router.get("/:userId", validate(userIdParamSchema), adminUsersController.getOne);
router.patch("/:userId/status", validate(updateStatusSchema), adminUsersController.updateStatus);

module.exports = router;
