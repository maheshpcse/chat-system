"use strict";

const presenceService = require("./presence.service");
const { sendSuccess } = require("../../utils/response");

const getContactsPresence = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const presenceData = await presenceService.getContactsPresence(userId);
    sendSuccess(res, presenceData, "Contacts presence retrieved");
  } catch (error) {
    next(error);
  }
};

const getUserPresence = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const presenceData = await presenceService.getUserPresence(userId);
    sendSuccess(res, presenceData, "User presence retrieved");
  } catch (error) {
    next(error);
  }
};

module.exports = { getContactsPresence, getUserPresence };
