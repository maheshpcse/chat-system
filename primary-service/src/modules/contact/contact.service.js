"use strict";

const contactRepository = require("./contact.repository");
const { generateId } = require("../../utils/helpers");
const { BadRequestError, NotFoundError, ConflictError } = require("../../utils/errors");
const logger = require("../../utils/logger");

class ContactService {
  async sendRequest(senderUserId, receiverUserId) {
    if (senderUserId === receiverUserId) {
      throw new BadRequestError("Cannot send contact request to yourself");
    }

    const requestId = generateId();

    try {
      const request = await contactRepository.sendRequest(requestId, senderUserId, receiverUserId);
      logger.info("Contact request sent", { requestId, senderUserId, receiverUserId });
      return request;
    } catch (error) {
      if (error.message === "DUPLICATE_REQUEST") {
        throw new ConflictError("A pending request already exists between these users");
      }
      if (error.message === "ALREADY_CONTACTS") {
        throw new ConflictError("You are already contacts with this user");
      }
      if (error.message === "USER_BLOCKED") {
        throw new BadRequestError("Cannot send request to this user");
      }
      throw error;
    }
  }

  async acceptRequest(requestId, userId) {
    const contactId1 = generateId();
    const contactId2 = generateId();

    try {
      const result = await contactRepository.acceptRequest(requestId, userId, contactId1, contactId2);
      logger.info("Contact request accepted", { requestId, userId });
      return result;
    } catch (error) {
      if (error.message === "REQUEST_NOT_FOUND") {
        throw new NotFoundError("Contact request not found");
      }
      if (error.message === "NOT_AUTHORIZED") {
        throw new BadRequestError("You are not authorized to accept this request");
      }
      if (error.message === "REQUEST_NOT_PENDING") {
        throw new BadRequestError("This request is no longer pending");
      }
      throw error;
    }
  }

  async rejectRequest(requestId, userId) {
    try {
      const result = await contactRepository.rejectRequest(requestId, userId);
      logger.info("Contact request rejected", { requestId, userId });
      return result;
    } catch (error) {
      if (error.message === "REQUEST_NOT_FOUND") {
        throw new NotFoundError("Contact request not found");
      }
      if (error.message === "NOT_AUTHORIZED") {
        throw new BadRequestError("You are not authorized to reject this request");
      }
      if (error.message === "REQUEST_NOT_PENDING") {
        throw new BadRequestError("This request is no longer pending");
      }
      throw error;
    }
  }

  async cancelRequest(requestId, userId) {
    try {
      const result = await contactRepository.cancelRequest(requestId, userId);
      logger.info("Contact request cancelled", { requestId, userId });
      return result;
    } catch (error) {
      if (error.message === "REQUEST_NOT_FOUND") {
        throw new NotFoundError("Contact request not found");
      }
      if (error.message === "NOT_AUTHORIZED") {
        throw new BadRequestError("You are not authorized to cancel this request");
      }
      if (error.message === "REQUEST_NOT_PENDING") {
        throw new BadRequestError("This request is no longer pending");
      }
      throw error;
    }
  }

  async getReceivedRequests(userId) {
    return contactRepository.getReceivedRequests(userId);
  }

  async getSentRequests(userId) {
    return contactRepository.getSentRequests(userId);
  }

  async getUserContacts(userId) {
    return contactRepository.getUserContacts(userId);
  }

  async removeContact(userId, contactUserId) {
    const result = await contactRepository.removeContact(userId, contactUserId);
    if (!result || result.affectedRows === 0) {
      throw new NotFoundError("Contact not found");
    }
    logger.info("Contact removed", { userId, contactUserId });
    return result;
  }

  async areUsersContacts(userId1, userId2) {
    return contactRepository.areUsersContacts(userId1, userId2);
  }

  async getContactRequestStatus(userId, otherUserId) {
    return contactRepository.getContactRequestStatus(userId, otherUserId);
  }
}

module.exports = new ContactService();
