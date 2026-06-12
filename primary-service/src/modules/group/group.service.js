"use strict";

const groupRepository = require("./group.repository");
const { generateId } = require("../../utils/helpers");
const { NotFoundError, ForbiddenError } = require("../../utils/errors");
const logger = require("../../utils/logger");

class GroupService {
  async createGroup(userId, groupData) {
    const { name, description, memberIds } = groupData;
    const groupId = generateId();
    const conversationId = generateId();

    const group = await groupRepository.createGroup({
      groupId,
      conversationId,
      name,
      description,
      createdBy: userId,
    });

    // Add creator as owner
    await groupRepository.addMember(groupId, userId, "owner");

    // Add all members
    await Promise.all(
      memberIds
        .filter((id) => id !== userId)
        .map((memberId) => groupRepository.addMember(groupId, memberId, "member"))
    );

    logger.info("Group created", { groupId, name, createdBy: userId });
    return group;
  }

  async updateGroup(userId, groupId, updateData) {
    await this.verifyAdminAccess(groupId, userId);
    const updated = await groupRepository.updateGroup(groupId, updateData);
    if (!updated) {
      throw new NotFoundError("Group not found");
    }
    return updated;
  }

  async addMember(userId, groupId, memberId, role) {
    await this.verifyAdminAccess(groupId, userId);
    return groupRepository.addMember(groupId, memberId, role);
  }

  async removeMember(userId, groupId, memberId) {
    await this.verifyAdminAccess(groupId, userId);

    // Cannot remove the owner
    const memberRole = await groupRepository.getMemberRole(groupId, memberId);
    if (memberRole && memberRole.role === "owner") {
      throw new ForbiddenError("Cannot remove the group owner");
    }

    await groupRepository.removeMember(groupId, memberId);
  }

  async getGroupDetails(groupId) {
    const group = await groupRepository.getGroupById(groupId);
    if (!group) {
      throw new NotFoundError("Group not found");
    }
    const members = await groupRepository.getGroupMembers(groupId);
    return { ...group, members };
  }

  async getUserGroups(userId) {
    return groupRepository.getUserGroups(userId);
  }

  async verifyAdminAccess(groupId, userId) {
    const memberRole = await groupRepository.getMemberRole(groupId, userId);
    if (!memberRole) {
      throw new NotFoundError("Group not found");
    }
    if (!["owner", "admin"].includes(memberRole.role)) {
      throw new ForbiddenError("Only group admins can perform this action");
    }
    return memberRole;
  }
}

module.exports = new GroupService();
