"use strict";

const contactRepository = require("./contact.repository");
const notificationService = require("../notification/notification.service");
const { generateId } = require("../../utils/helpers");
const { BadRequestError, NotFoundError, ConflictError } = require("../../utils/errors");
const { getIO } = require("../../config/socket");
const { SOCKET_EVENTS } = require("../../utils/constants");
const logger = require("../../utils/logger");

/** Safely obtain the Socket.IO instance (may be absent in tests / cron). */
const safeIO = () => {
  try {
    return getIO();
  } catch (err) {
    return null;
  }
};

/** Emit a real-time event to a specific user's personal room. */
const emitToUser = (userId, event, payload) => {
  const io = safeIO();
  if (io && userId) {
    io.to(`user:${userId}`).emit(event, payload);
  }
};

class ContactService {
  async sendRequest(senderUserId, receiverUserId) {
    if (senderUserId === receiverUserId) {
      throw new BadRequestError("Cannot send contact request to yourself");
    }

    const requestId = generateId();

    try {
      const request = await contactRepository.sendRequest(requestId, senderUserId, receiverUserId);
      logger.info("Contact request sent", { requestId, senderUserId, receiverUserId });
      // Immediate real-time notification to the receiver.
      emitToUser(receiverUserId, SOCKET_EVENTS.CONTACT_REQUEST_RECEIVED, {
        requestId,
        senderUserId,
        request,
      });
      // Persist a notification so it appears in the bell dropdown / page.
      await notificationService.createAndNotify(receiverUserId, {
        actorUserId: senderUserId,
        type: "contactRequest",
        title: "New contact request",
        body: "You have a new contact request",
        entityType: "contactRequest",
        entityId: requestId,
        data: { requestId, senderUserId },
      });
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
      // Notify the original sender that their request was accepted, and refresh
      // both users' contact lists in real time.
      if (result && result.senderUserId) {
        emitToUser(result.senderUserId, SOCKET_EVENTS.CONTACT_REQUEST_ACCEPTED, {
          requestId,
          acceptedBy: userId,
          contact: result,
        });
        emitToUser(result.senderUserId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "accepted" });
        emitToUser(result.receiverUserId || userId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "accepted" });
        // Persist an "accepted" notification for the original sender.
        await notificationService.createAndNotify(result.senderUserId, {
          actorUserId: userId,
          type: "contactAccepted",
          title: "Contact request accepted",
          body: "Your contact request was accepted",
          entityType: "contact",
          entityId: requestId,
          data: { requestId, acceptedBy: userId },
        });
      }
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
      // Inform the original sender their request was rejected (if id available).
      if (result && result.senderUserId) {
        emitToUser(result.senderUserId, SOCKET_EVENTS.CONTACT_REQUEST_REJECTED, {
          requestId,
          rejectedBy: userId,
        });
      }
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

      // Notify original receiver that the pending request was withdrawn.
      const receiverUserId =
        (result && (result.receiverUserId || result.receiver_user_id)) || null;
      if (receiverUserId) {
        emitToUser(receiverUserId, SOCKET_EVENTS.CONTACT_REQUEST_REJECTED, {
          requestId,
          withdrawnBy: userId,
          reason: "withdrawn",
        });
        emitToUser(receiverUserId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, {
          reason: "request_withdrawn",
        });
        await notificationService.createAndNotify(receiverUserId, {
          actorUserId: userId,
          type: "contactRequestWithdrawn",
          title: "Contact request withdrawn",
          body: "A contact request was withdrawn",
          entityType: "contactRequest",
          entityId: requestId,
          data: { requestId, withdrawnBy: userId },
        });
      }

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

  async isBlocked(userId1, userId2) {
    return contactRepository.isBlocked(userId1, userId2);
  }

  async blockContact(blockerUserId, blockedUserId, reason) {
    if (blockerUserId === blockedUserId) {
      throw new BadRequestError("You cannot block yourself");
    }
    const blockId = generateId();
    const result = await contactRepository.blockContact(blockId, blockerUserId, blockedUserId, reason);
    logger.info("Contact blocked", { blockerUserId, blockedUserId });
    // Refresh both users' contact lists in real time.
    emitToUser(blockerUserId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "blocked" });
    emitToUser(blockedUserId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "blocked" });
    return result;
  }

  async unblockContact(blockerUserId, blockedUserId) {
    if (blockerUserId === blockedUserId) {
      throw new BadRequestError("You cannot unblock yourself");
    }
    const result = await contactRepository.unblockContact(blockerUserId, blockedUserId);
    logger.info("Contact unblocked", { blockerUserId, blockedUserId });
    emitToUser(blockerUserId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "unblocked" });
    emitToUser(blockedUserId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "unblocked" });
    return result;
  }

  async updateContactSettings(userId, contactUserId, settings) {
    const result = await contactRepository.updateContactSettings(userId, contactUserId, settings);
    if (!result) {
      throw new NotFoundError("Contact not found");
    }
    logger.info("Contact settings updated", { userId, contactUserId });
    // Refresh the owner's own contact list (nickname/mute/pin are personal).
    emitToUser(userId, SOCKET_EVENTS.CONTACT_LIST_UPDATED, { reason: "settings" });
    return result;
  }
}

module.exports = new ContactService();
