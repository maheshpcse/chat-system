"use strict";

const uploadService = require("./upload.service");
const { sendSuccess } = require("../../utils/response");

class UploadController {
  async upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file provided" });
      }
      const result = await uploadService.uploadFile(req.file, req.user.userId, "local");
      return sendSuccess(res, 201, "File uploaded", result);
    } catch (error) {
      next(error);
    }
  }

  async uploadToS3(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file provided" });
      }
      const result = await uploadService.uploadFile(req.file, req.user.userId, "s3");
      return sendSuccess(res, 201, "File uploaded to S3", result);
    } catch (error) {
      next(error);
    }
  }

  async download(req, res, next) {
    try {
      const { fileUrl, provider } = req.query;
      const downloadUrl = await uploadService.getDownloadUrl(fileUrl, provider);
      return sendSuccess(res, 200, "Download URL generated", { url: downloadUrl });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UploadController();
