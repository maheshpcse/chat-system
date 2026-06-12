"use strict";

/**
 * Upload Service
 * Abstraction layer for file storage.
 * Supports Local and S3 storage providers via strategy pattern.
 */

const path = require("path");
const fs = require("fs/promises");
const { config } = require("../../config/environment");
const { generateId } = require("../../utils/helpers");
const { NotFoundError } = require("../../utils/errors");
const logger = require("../../utils/logger");

// Lazy-loaded S3 service
let s3Service = null;

const getS3Service = () => {
  if (!s3Service) {
    s3Service = require("../../services/aws/s3.service");
  }
  return s3Service;
};

class UploadService {
  /**
   * Uploads a file using the configured storage provider.
   * @param {Object} file - Multer file object
   * @param {string} userId - Uploader's user ID
   * @param {string} provider - Storage provider ("local" | "s3")
   * @returns {Promise<Object>} Upload result with URL and metadata
   */
  async uploadFile(file, userId, provider = "local") {
    const fileId = generateId();
    const extension = path.extname(file.originalname);
    const fileName = `${fileId}${extension}`;

    const uploadStrategies = {
      local: () => this.uploadToLocal(file, fileName),
      s3: () => this.uploadToS3(file, fileName),
    };

    const strategy = uploadStrategies[provider];
    if (!strategy) {
      throw new Error(`Unknown storage provider: ${provider}`);
    }

    const result = await strategy();

    logger.info("File uploaded", { fileId, provider, userId });

    return {
      fileId,
      fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: result.url,
      provider,
    };
  }

  async uploadToLocal(file, fileName) {
    const uploadDir = config.upload.uploadPath;
    await fs.mkdir(uploadDir, { recursive: true });

    if (file.buffer) {
      await fs.writeFile(path.join(uploadDir, fileName), file.buffer);
    }

    return { url: `/uploads/${fileName}` };
  }

  async uploadToS3(file, fileName) {
    const s3 = getS3Service();
    const key = `chat-uploads/${fileName}`;
    const url = await s3.uploadFile(file.buffer || file.path, key, file.mimetype);
    return { url };
  }

  async deleteFile(fileUrl, provider = "local") {
    if (provider === "local") {
      const filePath = path.join(process.cwd(), fileUrl);
      await fs.unlink(filePath).catch(() => null);
    } else if (provider === "s3") {
      const s3 = getS3Service();
      await s3.deleteFile(fileUrl);
    }
  }

  async getDownloadUrl(fileUrl, provider = "local") {
    if (provider === "s3") {
      const s3 = getS3Service();
      return s3.getSignedUrl(fileUrl);
    }
    return fileUrl;
  }
}

module.exports = new UploadService();
