"use strict";

const { callProcedure } = require("../../config/database");

class ContactRepository {
  async sendRequest(requestId, senderUserId, receiverUserId) {
    const result = await callProcedure("spSendContactRequest", [
      requestId,
      senderUserId,
      receiverUserId,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async acceptRequest(requestId, userId, contactId1, contactId2) {
    const result = await callProcedure("spAcceptContactRequest", [
      requestId,
      userId,
      contactId1,
      contactId2,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async rejectRequest(requestId, userId) {
    const result = await callProcedure("spRejectContactRequest", [requestId, userId]);
    return result[0] ? result[0][0] : null;
  }

  async cancelRequest(requestId, userId) {
    const result = await callProcedure("spCancelContactRequest", [requestId, userId]);
    return result[0] ? result[0][0] : null;
  }

  async getReceivedRequests(userId) {
    const result = await callProcedure("spGetReceivedRequests", [userId]);
    return result[0] || [];
  }

  async getSentRequests(userId) {
    const result = await callProcedure("spGetSentRequests", [userId]);
    return result[0] || [];
  }

  async getUserContacts(userId) {
    const result = await callProcedure("spGetUserContacts", [userId]);
    return result[0] || [];
  }

  async removeContact(userId, contactUserId) {
    const result = await callProcedure("spRemoveContact", [userId, contactUserId]);
    return result[0] ? result[0][0] : null;
  }

  async areUsersContacts(userId1, userId2) {
    const result = await callProcedure("spAreUsersContacts", [userId1, userId2]);
    return result[0] && result[0][0] ? result[0][0].isContact > 0 : false;
  }

  async getContactRequestStatus(userId, otherUserId) {
    const result = await callProcedure("spGetContactRequestStatus", [userId, otherUserId]);
    return result[0] ? result[0][0] : { relationStatus: "none", requestId: null };
  }
}

module.exports = new ContactRepository();
