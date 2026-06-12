"use strict";

const { callProcedure } = require("../../config/database");

class GroupRepository {
  async createGroup(groupData) {
    const { groupId, conversationId, name, description, createdBy } = groupData;
    const result = await callProcedure("spCreateGroup", [
      groupId,
      conversationId,
      name,
      description || null,
      createdBy,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async addMember(groupId, userId, role) {
    const result = await callProcedure("spAddGroupMember", [groupId, userId, role]);
    return result[0] ? result[0][0] : null;
  }

  async removeMember(groupId, userId) {
    await callProcedure("spRemoveGroupMember", [groupId, userId]);
  }

  async getGroupById(groupId) {
    const result = await callProcedure("spGetGroupById", [groupId]);
    return result[0] ? result[0][0] : null;
  }

  async getGroupMembers(groupId) {
    const result = await callProcedure("spGetGroupMembers", [groupId]);
    return result[0] || [];
  }

  async updateGroup(groupId, updateData) {
    const { name, description, avatarUrl } = updateData;
    const result = await callProcedure("spUpdateGroup", [
      groupId,
      name || null,
      description || null,
      avatarUrl || null,
    ]);
    return result[0] ? result[0][0] : null;
  }

  async getMemberRole(groupId, userId) {
    const result = await callProcedure("spGetGroupMemberRole", [groupId, userId]);
    return result[0] ? result[0][0] : null;
  }

  async getUserGroups(userId) {
    const result = await callProcedure("spGetUserGroups", [userId]);
    return result[0] || [];
  }
}

module.exports = new GroupRepository();
