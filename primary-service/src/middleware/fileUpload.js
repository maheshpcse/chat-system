"use strict";

/**
 * File Upload Middleware
 * Configures multer for handling multipart/form-data.
 * Supports both local and memory storage strategies.
 */

const multer = require("multer");
const path = require("path");
const { config } = require("../config/environment");
const { BadRequestError } = require("../utils/errors");
const { generateId } = require("../utils/helpers");

/**
 * Local disk storage configuration.
 * Files are stored in the uploads directory with unique names.
 */
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${generateId()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

/**
 * Memory storage for direct S3 uploads.
 * File is stored in buffer, not written to disk.
 */
const memoryStorage = multer.memoryStorage();

/**
 * File filter - validates allowed MIME types.
 */
const fileFilter = (req, file, cb) => {
  const isAllowed = config.upload.allowedFileTypes.includes(file.mimetype);

  if (isAllowed) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`File type '${file.mimetype}' is not allowed`), false);
  }
};

/**
 * Upload middleware for local storage.
 */
const uploadLocal = multer({
  storage: diskStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
});

/**
 * Upload middleware for S3 (memory buffer).
 */
const uploadToMemory = multer({
  storage: memoryStorage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter,
});

module.exports = { uploadLocal, uploadToMemory };
