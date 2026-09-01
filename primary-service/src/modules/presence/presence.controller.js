"use strict";

const presenceService = require("./presence.service");
const { sendSuccess } = require("../../utils/response");

const getContactsPresence = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const presenceData = await presenceService.getContactsPresence(userId);
    return sendSuccess(res, 200, "Contacts presence retrieved", presenceData);
  } catch (error) {
    next(error);
  }
};

const getUserPresence = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const presenceData = await presenceService.getUserPresence(
      userId,
      req.user.userId
    );
    return sendSuccess(res, 200, "User presence retrieved", presenceData);
  } catch (error) {
    next(error);
  }
};

module.exports = { getContactsPresence, getUserPresence };
