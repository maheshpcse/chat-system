"use strict";

const { Router } = require("express");
const contactController = require("./contact.controller");
const { authenticate } = require("../../middleware/authentication");
const { validate } = require("../../middleware/validation");
const { sendRequestSchema, requestIdParamSchema, contactUserIdParamSchema } = require("./contact.validation");

const router = Router();

// All routes require authentication
router.use(authenticate);

// Contact requests
router.post("/request", validate(sendRequestSchema), contactController.sendRequest);
router.get("/requests/received", contactController.getReceivedRequests);
router.get("/requests/sent", contactController.getSentRequests);
router.put("/requests/:requestId/accept", validate(requestIdParamSchema), contactController.acceptRequest);
router.put("/requests/:requestId/reject", validate(requestIdParamSchema), contactController.rejectRequest);
router.put("/requests/:requestId/cancel", validate(requestIdParamSchema), contactController.cancelRequest);

// Contacts list
router.get("/", contactController.getContacts);
router.delete("/:contactUserId", validate(contactUserIdParamSchema), contactController.removeContact);

module.exports = router;
