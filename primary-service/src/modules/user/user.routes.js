"use strict";

const { Router } = require("express");
const userController = require("./user.controller");
const { authenticate } = require("../../middleware/authentication");
const { validate } = require("../../middleware/validation");
const { updateProfileSchema, getUserSchema, searchUsersSchema } = require("./user.validation");

const router = Router();

router.get("/me", authenticate, userController.getProfile);
router.get("/search", authenticate, validate(searchUsersSchema), userController.searchUsers);
router.get("/:userId", authenticate, validate(getUserSchema), userController.getProfile);
router.put("/me", authenticate, validate(updateProfileSchema), userController.updateProfile);

module.exports = router;
