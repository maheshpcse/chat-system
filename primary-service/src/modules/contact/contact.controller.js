"use strict";

const contactService = require("./contact.service");
const { sendSuccess } = require("../../utils/response");

class ContactController {
  async sendRequest(req, res, next) {
    try {
      const { receiverUserId } = req.body;
      const request = await contactService.sendRequest(req.user.userId, receiverUserId);
      return sendSuccess(res, 201, "Contact request sent", request);
    } catch (error) {
      next(error);
    }
  }

  async acceptRequest(req, res, next) {
    try {
      const result = await contactService.acceptRequest(req.params.requestId, req.user.userId);
      return sendSuccess(res, 200, "Contact request accepted", result);
    } catch (error) {
      next(error);
    }
  }

  async rejectRequest(req, res, next) {
    try {
      const result = await contactService.rejectRequest(req.params.requestId, req.user.userId);
      return sendSuccess(res, 200, "Contact request rejected", result);
    } catch (error) {
      next(error);
    }
  }

  async cancelRequest(req, res, next) {
    try {
      const result = await contactService.cancelRequest(req.params.requestId, req.user.userId);
      return sendSuccess(res, 200, "Contact request cancelled", result);
    } catch (error) {
      next(error);
    }
  }

  async getReceivedRequests(req, res, next) {
    try {
      const requests = await contactService.getReceivedRequests(req.user.userId);
      return sendSuccess(res, 200, "Received requests retrieved", requests);
    } catch (error) {
      next(error);
    }
  }

  async getSentRequests(req, res, next) {
    try {
      const requests = await contactService.getSentRequests(req.user.userId);
      return sendSuccess(res, 200, "Sent requests retrieved", requests);
    } catch (error) {
      next(error);
    }
  }

  async getContacts(req, res, next) {
    try {
      const contacts = await contactService.getUserContacts(req.user.userId);
      return sendSuccess(res, 200, "Contacts retrieved", contacts);
    } catch (error) {
      next(error);
    }
  }

  async removeContact(req, res, next) {
    try {
      await contactService.removeContact(req.user.userId, req.params.contactUserId);
      return sendSuccess(res, 200, "Contact removed");
    } catch (error) {
      next(error);
    }
  }

  async blockContact(req, res, next) {
    try {
      const result = await contactService.blockContact(
        req.user.userId,
        req.params.contactUserId,
        req.body ? req.body.reason : null
      );
      return sendSuccess(res, 200, "Contact blocked", result);
    } catch (error) {
      next(error);
    }
  }

  async unblockContact(req, res, next) {
    try {
      const result = await contactService.unblockContact(req.user.userId, req.params.contactUserId);
      return sendSuccess(res, 200, "Contact unblocked", result);
    } catch (error) {
      next(error);
    }
  }

  async updateContactSettings(req, res, next) {
    try {
      const { nickname, muted, pinned } = req.body || {};
      const result = await contactService.updateContactSettings(
        req.user.userId,
        req.params.contactUserId,
        { nickname, muted, pinned }
      );
      return sendSuccess(res, 200, "Contact settings updated", result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ContactController();
