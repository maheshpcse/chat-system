"use strict";

const userService = require("./user.service");
const { sendSuccess, sendPaginated } = require("../../utils/response");

class UserController {
  async getProfile(req, res, next) {
    try {
      const userId = req.params.userId || req.user.userId;
      const profile = await userService.getProfile(userId);
      return sendSuccess(res, 200, "Profile retrieved", profile);
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const updatedProfile = await userService.updateProfile(req.user.userId, req.body);
      return sendSuccess(res, 200, "Profile updated", updatedProfile);
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req, res, next) {
    try {
      const { search, page, limit } = req.query;
      const { users, total } = await userService.searchUsers(search, page, limit);
      return sendPaginated(res, users, page, limit, total);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();
