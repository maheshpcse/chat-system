"use strict";

const { Router } = require("express");
const groupController = require("./group.controller");
const { authenticate } = require("../../middleware/authentication");
const { validate } = require("../../middleware/validation");
const { createGroupSchema, updateGroupSchema, addMemberSchema, removeMemberSchema } = require("./group.validation");

const router = Router();

router.post("/", authenticate, validate(createGroupSchema), groupController.create);
router.get("/", authenticate, groupController.getUserGroups);
router.get("/:groupId", authenticate, groupController.getDetails);
router.put("/:groupId", authenticate, validate(updateGroupSchema), groupController.update);
router.post("/:groupId/members", authenticate, validate(addMemberSchema), groupController.addMember);
router.delete("/:groupId/members/:userId", authenticate, validate(removeMemberSchema), groupController.removeMember);

module.exports = router;
