"use strict";

/**
 * AWS S3 Service
 * Handles file upload, download, and deletion from Amazon S3.
 * Uses @aws-sdk/client-s3 v3 (modular SDK, Node 18 compatible).
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { config } = require("../../config/environment");
const logger = require("../../utils/logger");

class S3Service {
  constructor() {
    this.client = new S3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined, // Falls back to IAM role if no explicit credentials
    });
    this.bucket = config.aws.s3Bucket;
  }

  /**
   * Uploads a file to S3.
   * @param {Buffer|string} fileContent - File buffer or file path
   * @param {string} key - S3 object key (path in bucket)
   * @param {string} contentType - MIME type
   * @returns {Promise<string>} Public URL of uploaded file
   */
  async uploadFile(fileContent, key, contentType) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: fileContent,
      ContentType: contentType,
    });

    await this.client.send(command);
    logger.info("S3 upload successful", { key, bucket: this.bucket });

    return `https://${this.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
  }

  /**
   * Generates a pre-signed URL for secure file download.
   * URL expires after specified duration.
   * @param {string} key - S3 object key
   * @param {number} expiresIn - URL expiry in seconds (default: 1 hour)
   * @returns {Promise<string>} Pre-signed download URL
   */
  async getPresignedUrl(key, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  /**
   * Deletes a file from S3.
   * @param {string} key - S3 object key
   */
  async deleteFile(key) {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    logger.info("S3 delete successful", { key });
  }

  /**
   * Generates a pre-signed URL for uploading directly from the client.
   * @param {string} key - Desired S3 key
   * @param {string} contentType - Expected content type
   * @param {number} expiresIn - URL expiry in seconds
   * @returns {Promise<string>} Pre-signed upload URL
   */
  async getUploadPresignedUrl(key, contentType, expiresIn = 3600) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }
}

module.exports = new S3Service();
