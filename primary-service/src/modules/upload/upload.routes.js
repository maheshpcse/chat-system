"use strict";

const { Router } = require("express");
const uploadController = require("./upload.controller");
const { authenticate } = require("../../middleware/authentication");
const { uploadLocal, uploadToMemory } = require("../../middleware/fileUpload");
const { uploadLimiter } = require("../../middleware/rateLimiter");

const router = Router();

router.post("/local", authenticate, uploadLimiter, uploadLocal.single("file"), uploadController.upload);
router.post("/s3", authenticate, uploadLimiter, uploadToMemory.single("file"), uploadController.uploadToS3);
router.get("/download", authenticate, uploadController.download);

module.exports = router;
