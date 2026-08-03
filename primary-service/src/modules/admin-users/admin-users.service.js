"use strict";

const adminUsersRepository = require("./admin-users.repository");
const { NotFoundError, BadRequestError } = require("../../utils/errors");

const ALLOWED_STATUS = ["active", "inactive", "banned", "suspended"];

class AdminUsersService {
  async listUsers(query) {
    const page = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { rows, total } = await adminUsersRepository.listUsers({
      search: query.search || "",
      status: query.status || "",
      role: query.role || "",
      offset,
      limit,
    });

    return {
      users: rows,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUser(userId) {
    const user = await adminUsersRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  }

  async updateStatus(userId, status) {
    if (!ALLOWED_STATUS.includes(status)) {
      throw new BadRequestError(`Invalid status. Allowed: ${ALLOWED_STATUS.join(", ")}`);
    }
    const existing = await adminUsersRepository.getUserById(userId);
    if (!existing) {
      throw new NotFoundError("User not found");
    }
    const updated = await adminUsersRepository.updateStatus(userId, status);
    return updated;
  }
}

module.exports = new AdminUsersService();
