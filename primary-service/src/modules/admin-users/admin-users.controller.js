"use strict";

const adminUsersService = require("./admin-users.service");
const { sendSuccess } = require("../../utils/response");

class AdminUsersController {
  async list(req, res, next) {
    try {
      const result = await adminUsersService.listUsers(req.query);
      const { page, limit, total, totalPages } = result.meta;
      return sendSuccess(res, 200, "Users retrieved", result.users, {
        page,
        limit,
        total,
        totalPages,
        pagination: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getOne(req, res, next) {
    try {
      const user = await adminUsersService.getUser(req.params.userId);
      return sendSuccess(res, 200, "User retrieved", user);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const user = await adminUsersService.updateStatus(req.params.userId, req.body.status);
      return sendSuccess(res, 200, "User status updated", user);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminUsersController();
