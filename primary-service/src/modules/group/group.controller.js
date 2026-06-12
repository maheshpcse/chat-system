"use strict";

const groupService = require("./group.service");
const { sendSuccess } = require("../../utils/response");

class GroupController {
  async create(req, res, next) {
    try {
      const group = await groupService.createGroup(req.user.userId, req.body);
      return sendSuccess(res, 201, "Group created", group);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const group = await groupService.updateGroup(req.user.userId, req.params.groupId, req.body);
      return sendSuccess(res, 200, "Group updated", group);
    } catch (error) {
      next(error);
    }
  }

  async addMember(req, res, next) {
    try {
      const result = await groupService.addMember(
        req.user.userId,
        req.params.groupId,
        req.body.userId,
        req.body.role
      );
      return sendSuccess(res, 200, "Member added", result);
    } catch (error) {
      next(error);
    }
  }

  async removeMember(req, res, next) {
    try {
      await groupService.removeMember(req.user.userId, req.params.groupId, req.params.userId);
      return sendSuccess(res, 200, "Member removed");
    } catch (error) {
      next(error);
    }
  }

  async getDetails(req, res, next) {
    try {
      const group = await groupService.getGroupDetails(req.params.groupId);
      return sendSuccess(res, 200, "Group details retrieved", group);
    } catch (error) {
      next(error);
    }
  }

  async getUserGroups(req, res, next) {
    try {
      const groups = await groupService.getUserGroups(req.user.userId);
      return sendSuccess(res, 200, "User groups retrieved", groups);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new GroupController();
