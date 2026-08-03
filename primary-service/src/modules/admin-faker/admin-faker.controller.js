"use strict";

const adminFakerService = require("./admin-faker.service");
const { sendSuccess } = require("../../utils/response");

class AdminFakerController {
  async generateUsers(req, res, next) {
    try {
      const result = await adminFakerService.generateUsers(req.admin.adminId, req.body);
      return sendSuccess(res, 200, "Preview users generated", result);
    } catch (error) { next(error); }
  }

  async getPreview(req, res, next) {
    try {
      const result = await adminFakerService.getPreview(req.admin.adminId, req.params.previewId);
      return sendSuccess(res, 200, "Preview retrieved", result);
    } catch (error) { next(error); }
  }

  async updatePreviewUser(req, res, next) {
    try {
      const result = await adminFakerService.updatePreviewUser(
        req.admin.adminId, req.params.previewId, req.params.tempId, req.body
      );
      return sendSuccess(res, 200, "Preview user updated", result);
    } catch (error) { next(error); }
  }

  async deletePreviewItem(req, res, next) {
    try {
      const result = await adminFakerService.deletePreviewItem(
        req.admin.adminId, req.params.previewId, req.params.tempId
      );
      return sendSuccess(res, 200, "Preview item removed", result);
    } catch (error) { next(error); }
  }

  async regeneratePreviewUser(req, res, next) {
    try {
      const result = await adminFakerService.regeneratePreviewUser(
        req.admin.adminId, req.params.previewId, req.params.tempId
      );
      return sendSuccess(res, 200, "Preview user regenerated", result);
    } catch (error) { next(error); }
  }

  async discardPreview(req, res, next) {
    try {
      const result = await adminFakerService.discardPreview(req.admin.adminId, req.params.previewId);
      return sendSuccess(res, 200, "Preview discarded", result);
    } catch (error) { next(error); }
  }

  async saveUsers(req, res, next) {
    try {
      const result = await adminFakerService.saveUsers(req.admin.adminId, req.body.previewId || req.params.previewId);
      return sendSuccess(res, 201, "Users saved to database", result);
    } catch (error) { next(error); }
  }

  async generateContacts(req, res, next) {
    try {
      const result = await adminFakerService.generateContacts(req.admin.adminId, req.body);
      return sendSuccess(res, 200, "Preview contacts generated", result);
    } catch (error) { next(error); }
  }

  async regeneratePreviewContact(req, res, next) {
    try {
      const result = await adminFakerService.regeneratePreviewContact(
        req.admin.adminId, req.params.previewId, req.params.tempId
      );
      return sendSuccess(res, 200, "Preview contact regenerated", result);
    } catch (error) { next(error); }
  }

  async saveContacts(req, res, next) {
    try {
      const result = await adminFakerService.saveContacts(req.admin.adminId, req.body.previewId);
      return sendSuccess(res, 201, "Contacts saved to database", result);
    } catch (error) { next(error); }
  }

  async generateGroups(req, res, next) {
    try {
      const result = await adminFakerService.generateGroups(req.admin.adminId, req.body);
      return sendSuccess(res, 200, "Preview groups generated", result);
    } catch (error) { next(error); }
  }

  async regeneratePreviewGroup(req, res, next) {
    try {
      const result = await adminFakerService.regeneratePreviewGroup(
        req.admin.adminId, req.params.previewId, req.params.tempId
      );
      return sendSuccess(res, 200, "Preview group regenerated", result);
    } catch (error) { next(error); }
  }

  async updatePreviewGroup(req, res, next) {
    try {
      const result = await adminFakerService.updatePreviewGroup(
        req.admin.adminId, req.params.previewId, req.params.tempId, req.body
      );
      return sendSuccess(res, 200, "Preview group updated", result);
    } catch (error) { next(error); }
  }

  async saveGroups(req, res, next) {
    try {
      const result = await adminFakerService.saveGroups(req.admin.adminId, req.body.previewId);
      return sendSuccess(res, 201, "Groups saved to database", result);
    } catch (error) { next(error); }
  }

  async generateMessages(req, res, next) {
    try {
      const result = await adminFakerService.generateMessages(req.admin.adminId, req.body);
      return sendSuccess(res, 200, "Preview messages generated", result);
    } catch (error) { next(error); }
  }

  async regeneratePreviewMessage(req, res, next) {
    try {
      const result = await adminFakerService.regeneratePreviewMessage(
        req.admin.adminId, req.params.previewId, req.params.tempId
      );
      return sendSuccess(res, 200, "Preview message regenerated", result);
    } catch (error) { next(error); }
  }

  async saveMessages(req, res, next) {
    try {
      const result = await adminFakerService.saveMessages(req.admin.adminId, req.body.previewId);
      return sendSuccess(res, 201, "Messages saved to database", result);
    } catch (error) { next(error); }
  }
}

module.exports = new AdminFakerController();
