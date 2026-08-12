"use strict";

const { Router } = require("express");
const adminFakerController = require("./admin-faker.controller");
const { authenticateAdmin } = require("../../middleware/adminAuthentication");
const { validate } = require("../../middleware/validation");
const {
  generateUsersSchema,
  generateContactsSchema,
  linkContactsSchema,
  updatePreviewContactSchema,
  generateGroupsSchema,
  generateMessagesSchema,
  previewIdParamSchema,
  previewUserParamSchema,
  updatePreviewUserSchema,
  updatePreviewGroupSchema,
  savePreviewSchema,
} = require("./admin-faker.validation");

const router = Router();
router.use(authenticateAdmin);

// Users
router.post("/users/generate", validate(generateUsersSchema), adminFakerController.generateUsers);
router.get("/users/preview/:previewId", validate(previewIdParamSchema), adminFakerController.getPreview);
router.patch("/users/preview/:previewId/:tempId", validate(updatePreviewUserSchema), adminFakerController.updatePreviewUser);
router.delete("/users/preview/:previewId/:tempId", validate(previewUserParamSchema), adminFakerController.deletePreviewItem);
router.post("/users/preview/:previewId/:tempId/regenerate", validate(previewUserParamSchema), adminFakerController.regeneratePreviewUser);
router.delete("/users/preview/:previewId", validate(previewIdParamSchema), adminFakerController.discardPreview);
router.post("/users/save", validate(savePreviewSchema), adminFakerController.saveUsers);

// Contacts
router.get("/contacts/users", adminFakerController.listContactUsers);
router.post("/contacts/generate", validate(generateContactsSchema), adminFakerController.generateContacts);
router.post("/contacts/link", validate(linkContactsSchema), adminFakerController.linkContacts);
router.get("/contacts/preview/:previewId", validate(previewIdParamSchema), adminFakerController.getPreview);
router.patch(
  "/contacts/preview/:previewId/:tempId",
  validate(updatePreviewContactSchema),
  adminFakerController.updatePreviewContact
);
router.delete("/contacts/preview/:previewId/:tempId", validate(previewUserParamSchema), adminFakerController.deletePreviewItem);
router.post("/contacts/preview/:previewId/:tempId/regenerate", validate(previewUserParamSchema), adminFakerController.regeneratePreviewContact);
router.delete("/contacts/preview/:previewId", validate(previewIdParamSchema), adminFakerController.discardPreview);
router.post("/contacts/save", validate(savePreviewSchema), adminFakerController.saveContacts);

// Groups
router.post("/groups/generate", validate(generateGroupsSchema), adminFakerController.generateGroups);
router.get("/groups/preview/:previewId", validate(previewIdParamSchema), adminFakerController.getPreview);
router.patch("/groups/preview/:previewId/:tempId", validate(updatePreviewGroupSchema), adminFakerController.updatePreviewGroup);
router.delete("/groups/preview/:previewId/:tempId", validate(previewUserParamSchema), adminFakerController.deletePreviewItem);
router.post("/groups/preview/:previewId/:tempId/regenerate", validate(previewUserParamSchema), adminFakerController.regeneratePreviewGroup);
router.delete("/groups/preview/:previewId", validate(previewIdParamSchema), adminFakerController.discardPreview);
router.post("/groups/save", validate(savePreviewSchema), adminFakerController.saveGroups);

// Messages
router.post("/messages/generate", validate(generateMessagesSchema), adminFakerController.generateMessages);
router.get("/messages/preview/:previewId", validate(previewIdParamSchema), adminFakerController.getPreview);
router.delete("/messages/preview/:previewId/:tempId", validate(previewUserParamSchema), adminFakerController.deletePreviewItem);
router.post("/messages/preview/:previewId/:tempId/regenerate", validate(previewUserParamSchema), adminFakerController.regeneratePreviewMessage);
router.delete("/messages/preview/:previewId", validate(previewIdParamSchema), adminFakerController.discardPreview);
router.post("/messages/save", validate(savePreviewSchema), adminFakerController.saveMessages);

module.exports = router;