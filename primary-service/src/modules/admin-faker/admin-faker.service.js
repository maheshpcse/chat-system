"use strict";

const bcrypt = require("bcrypt");
const { config } = require("../../config/environment");
const fakerEngine = require("./faker.engine");
const adminFakerRepository = require("./admin-faker.repository");
const previewStore = require("./preview-store");
const { generateId } = require("../../utils/helpers");
const { BadRequestError, ConflictError } = require("../../utils/errors");
const logger = require("../../utils/logger");

const PREVIEW_TTL_MIN = Math.round((previewStore.ttlSec || 1800) / 60);

class AdminFakerService {
  async _setPreview(previewId, entry) {
    return previewStore.set(previewId, entry);
  }

  async _getPreview(previewId, adminId) {
    const entry = await previewStore.get(previewId);
    if (!entry || entry.adminId !== adminId) return null;
    return entry;
  }

  async _requirePreview(previewId, adminId, entityType) {
    const entry = await this._getPreview(previewId, adminId);
    if (!entry) throw new BadRequestError("Preview session expired or not found");
    if (entityType && entry.entityType !== entityType) {
      throw new BadRequestError("Preview is for " + entry.entityType + ", not " + entityType);
    }
    return entry;
  }

  _itemsKey(entityType) {
    if (entityType === "users") return "users";
    if (entityType === "contacts") return "contacts";
    if (entityType === "groups") return "groups";
    if (entityType === "messages") return "messages";
    return "items";
  }

  async generateUsers(adminId, { count, defaultPassword, role, status }) {
    const users = fakerEngine.generateUsers(count, { defaultPassword, role, status });
    const previewId = generateId();
    await this._setPreview(previewId, { adminId, entityType: "users", users, createdAt: Date.now() });
    await adminFakerRepository.logSession({
      adminId, entityType: "users", action: "generate", recordCount: users.length,
      payloadJson: { previewId, count: users.length },
    });
    return { previewId, users, expiresInMinutes: PREVIEW_TTL_MIN };
  }

  async getPreview(adminId, previewId) {
    const entry = await this._getPreview(previewId, adminId);
    if (!entry) throw new BadRequestError("Preview session expired or not found");
    const key = this._itemsKey(entry.entityType);
    return {
      previewId,
      entityType: entry.entityType,
      users: entry.users,
      contacts: entry.contacts,
      groups: entry.groups,
      messages: entry.messages,
      [key]: entry[key] || entry.users || [],
      expiresAt: entry.expiresAt ? new Date(entry.expiresAt).toISOString() : null,
    };
  }

  async updatePreviewUser(adminId, previewId, tempId, patch) {
    const entry = await this._requirePreview(previewId, adminId, "users");
    const idx = entry.users.findIndex((u) => u.tempId === tempId);
    if (idx === -1) throw new BadRequestError("Preview user not found");
    const allowed = ["firstName","lastName","email","username","password","phoneNumber","bio","role","status"];
    const updated = Object.assign({}, entry.users[idx]);
    for (const key of allowed) {
      if (patch[key] !== undefined && patch[key] !== null) updated[key] = patch[key];
    }
    if (entry.users.some((u, i) => i !== idx && u.email.toLowerCase() === String(updated.email).toLowerCase())) {
      throw new ConflictError("Email already used in this preview batch");
    }
    if (entry.users.some((u, i) => i !== idx && u.username.toLowerCase() === String(updated.username).toLowerCase())) {
      throw new ConflictError("Username already used in this preview batch");
    }
    entry.users[idx] = updated;
    await this._setPreview(previewId, entry);
    return updated;
  }

  async deletePreviewItem(adminId, previewId, tempId) {
    const entry = await this._getPreview(previewId, adminId);
    if (!entry) throw new BadRequestError("Preview session expired or not found");
    const key = this._itemsKey(entry.entityType);
    const list = entry[key] || entry.users || [];
    const before = list.length;
    entry[key] = list.filter((u) => u.tempId !== tempId);
    if (entry.entityType === "users") entry.users = entry[key];
    if (entry[key].length === before) throw new BadRequestError("Preview item not found");
    await this._setPreview(previewId, entry);
    return { remaining: entry[key].length };
  }

  async regeneratePreviewUser(adminId, previewId, tempId) {
    const entry = await this._requirePreview(previewId, adminId, "users");
    const idx = entry.users.findIndex((u) => u.tempId === tempId);
    if (idx === -1) throw new BadRequestError("Preview user not found");
    let fresh = fakerEngine.regenerateUser(entry.users[idx]);
    const otherEmails = new Set(entry.users.filter((_, i) => i !== idx).map((u) => u.email.toLowerCase()));
    const otherUsernames = new Set(entry.users.filter((_, i) => i !== idx).map((u) => u.username.toLowerCase()));
    let tries = 0;
    while ((otherEmails.has(fresh.email.toLowerCase()) || otherUsernames.has(fresh.username.toLowerCase())) && tries < 15) {
      tries += 1;
      fresh = fakerEngine.regenerateUser(entry.users[idx]);
    }
    fresh.tempId = tempId;
    entry.users[idx] = fresh;
    await this._setPreview(previewId, entry);
    return fresh;
  }

  async discardPreview(adminId, previewId) {
    const entry = await this._getPreview(previewId, adminId);
    if (entry) {
      await previewStore.delete(previewId);
      const key = this._itemsKey(entry.entityType);
      await adminFakerRepository.logSession({
        adminId, entityType: entry.entityType, action: "discard",
        recordCount: (entry[key] || entry.users || []).length,
        payloadJson: { previewId },
      });
    }
    return { discarded: true };
  }

  async saveUsers(adminId, previewId) {
    const entry = await this._requirePreview(previewId, adminId, "users");
    if (!entry.users.length) throw new BadRequestError("No users in preview to save");
    const emails = entry.users.map((u) => u.email.toLowerCase());
    const usernames = entry.users.map((u) => u.username.toLowerCase());
    const existingEmails = await adminFakerRepository.findExistingEmails(emails);
    const existingUsernames = await adminFakerRepository.findExistingUsernames(usernames);
    const conflicts = [];
    entry.users.forEach((u) => {
      if (existingEmails.has(u.email.toLowerCase())) conflicts.push({ field: "email", value: u.email, tempId: u.tempId });
      if (existingUsernames.has(u.username.toLowerCase())) conflicts.push({ field: "username", value: u.username, tempId: u.tempId });
    });
    if (conflicts.length) throw new ConflictError("Cannot save: " + conflicts.length + " uniqueness conflict(s) with existing users");

    const created = [];
    const errors = [];
    for (const u of entry.users) {
      try {
        const passwordHash = await bcrypt.hash(u.password, config.bcrypt.saltRounds);
        const row = await adminFakerRepository.insertUser({
          userId: generateId(),
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          username: u.username,
          passwordHash,
          phoneNumber: u.phoneNumber,
          bio: u.bio,
          role: u.role === "admin" ? "user" : u.role,
          status: u.status || "active",
        });
        if (row) created.push(row);
      } catch (err) {
        logger.error("Faker save user failed", { email: u.email, error: err.message });
        errors.push({ tempId: u.tempId, email: u.email, message: err.message });
      }
    }
    await adminFakerRepository.logSession({
      adminId, entityType: "users", action: "save", recordCount: created.length,
      payloadJson: { previewId, created: created.length, failed: errors.length },
    });
    if (created.length) await previewStore.delete(previewId);
    return { saved: created.length, failed: errors.length, users: created, errors };
  }

  async generateContacts(adminId, { count, mode }) {
    const pool = await adminFakerRepository.listActiveUsers(500);
    if (pool.length < 2) throw new BadRequestError("Need at least 2 active users before generating contacts");
    const contacts = fakerEngine.generateContacts(pool, count, { mode: mode || "accepted" });
    const previewId = generateId();
    await this._setPreview(previewId, { adminId, entityType: "contacts", contacts, createdAt: Date.now() });
    await adminFakerRepository.logSession({
      adminId, entityType: "contacts", action: "generate", recordCount: contacts.length,
      payloadJson: { previewId, count: contacts.length, mode: mode || "accepted" },
    });
    return { previewId, contacts, expiresInMinutes: PREVIEW_TTL_MIN };
  }

  async regeneratePreviewContact(adminId, previewId, tempId) {
    const entry = await this._requirePreview(previewId, adminId, "contacts");
    const idx = entry.contacts.findIndex((c) => c.tempId === tempId);
    if (idx === -1) throw new BadRequestError("Preview contact not found");
    const pool = await adminFakerRepository.listActiveUsers(500);
    const fresh = fakerEngine.regenerateContact(entry.contacts[idx], pool, { mode: entry.contacts[idx].mode });
    entry.contacts[idx] = fresh;
    await this._setPreview(previewId, entry);
    return fresh;
  }

  async saveContacts(adminId, previewId) {
    const entry = await this._requirePreview(previewId, adminId, "contacts");
    if (!entry.contacts.length) throw new BadRequestError("No contacts in preview to save");
    const created = [];
    const errors = [];
    for (const c of entry.contacts) {
      try {
        if (c.mode === "pending") {
          if (await adminFakerRepository.pendingRequestExists(c.userId, c.contactUserId)) {
            errors.push({ tempId: c.tempId, message: "Pending request already exists" });
            continue;
          }
          created.push(await adminFakerRepository.insertPendingContact(c.userId, c.contactUserId));
        } else {
          if (await adminFakerRepository.contactPairExists(c.userId, c.contactUserId)) {
            errors.push({ tempId: c.tempId, message: "Already contacts" });
            continue;
          }
          created.push(await adminFakerRepository.insertAcceptedContact(c.userId, c.contactUserId));
        }
      } catch (err) {
        logger.error("Faker save contact failed", { tempId: c.tempId, error: err.message });
        errors.push({ tempId: c.tempId, message: err.message });
      }
    }
    await adminFakerRepository.logSession({
      adminId, entityType: "contacts", action: "save", recordCount: created.length,
      payloadJson: { previewId, created: created.length, failed: errors.length },
    });
    if (created.length) await previewStore.delete(previewId);
    return { saved: created.length, failed: errors.length, contacts: created, errors };
  }

  async generateGroups(adminId, { count, membersPerGroup }) {
    const pool = await adminFakerRepository.listActiveUsers(500);
    if (pool.length < 2) throw new BadRequestError("Need at least 2 active users before generating groups");
    const groups = fakerEngine.generateGroups(pool, count, { membersPerGroup });
    const previewId = generateId();
    await this._setPreview(previewId, { adminId, entityType: "groups", groups, createdAt: Date.now() });
    await adminFakerRepository.logSession({
      adminId, entityType: "groups", action: "generate", recordCount: groups.length,
      payloadJson: { previewId, count: groups.length },
    });
    return { previewId, groups, expiresInMinutes: PREVIEW_TTL_MIN };
  }

  async regeneratePreviewGroup(adminId, previewId, tempId) {
    const entry = await this._requirePreview(previewId, adminId, "groups");
    const idx = entry.groups.findIndex((g) => g.tempId === tempId);
    if (idx === -1) throw new BadRequestError("Preview group not found");
    const pool = await adminFakerRepository.listActiveUsers(500);
    const fresh = fakerEngine.regenerateGroup(entry.groups[idx], pool, {
      membersPerGroup: (entry.groups[idx].members && entry.groups[idx].members.length) || 4,
    });
    entry.groups[idx] = fresh;
    await this._setPreview(previewId, entry);
    return fresh;
  }

  async updatePreviewGroup(adminId, previewId, tempId, patch) {
    const entry = await this._requirePreview(previewId, adminId, "groups");
    const idx = entry.groups.findIndex((g) => g.tempId === tempId);
    if (idx === -1) throw new BadRequestError("Preview group not found");
    const updated = Object.assign({}, entry.groups[idx]);
    if (patch.name !== undefined) updated.name = String(patch.name).slice(0, 100);
    if (patch.description !== undefined) updated.description = String(patch.description).slice(0, 500);
    entry.groups[idx] = updated;
    await this._setPreview(previewId, entry);
    return updated;
  }

  async saveGroups(adminId, previewId) {
    const entry = await this._requirePreview(previewId, adminId, "groups");
    if (!entry.groups.length) throw new BadRequestError("No groups in preview to save");
    const created = [];
    const errors = [];
    for (const g of entry.groups) {
      try {
        const row = await adminFakerRepository.insertGroup({
          groupId: generateId(),
          conversationId: generateId(),
          name: g.name,
          description: g.description,
          createdBy: g.createdBy,
          members: g.members || [],
        });
        created.push(row);
      } catch (err) {
        logger.error("Faker save group failed", { tempId: g.tempId, error: err.message });
        errors.push({ tempId: g.tempId, message: err.message });
      }
    }
    await adminFakerRepository.logSession({
      adminId, entityType: "groups", action: "save", recordCount: created.length,
      payloadJson: { previewId, created: created.length, failed: errors.length },
    });
    if (created.length) await previewStore.delete(previewId);
    return { saved: created.length, failed: errors.length, groups: created, errors };
  }

  async generateMessages(adminId, { count, messageType }) {
    const pool = await adminFakerRepository.listActiveUsers(500);
    if (pool.length < 2) throw new BadRequestError("Need at least 2 active users before generating messages");
    const conversations = await adminFakerRepository.listConversations(200);
    const messages = fakerEngine.generateMessages(pool, conversations, count, { messageType });
    const previewId = generateId();
    await this._setPreview(previewId, { adminId, entityType: "messages", messages, createdAt: Date.now() });
    await adminFakerRepository.logSession({
      adminId, entityType: "messages", action: "generate", recordCount: messages.length,
      payloadJson: { previewId, count: messages.length },
    });
    return { previewId, messages, expiresInMinutes: PREVIEW_TTL_MIN };
  }

  async regeneratePreviewMessage(adminId, previewId, tempId) {
    const entry = await this._requirePreview(previewId, adminId, "messages");
    const idx = entry.messages.findIndex((m) => m.tempId === tempId);
    if (idx === -1) throw new BadRequestError("Preview message not found");
    const pool = await adminFakerRepository.listActiveUsers(500);
    const conversations = await adminFakerRepository.listConversations(200);
    const fresh = fakerEngine.regenerateMessage(entry.messages[idx], pool, conversations, {});
    entry.messages[idx] = fresh;
    await this._setPreview(previewId, entry);
    return fresh;
  }

  async saveMessages(adminId, previewId) {
    const entry = await this._requirePreview(previewId, adminId, "messages");
    if (!entry.messages.length) throw new BadRequestError("No messages in preview to save");
    const created = [];
    const errors = [];
    for (const m of entry.messages) {
      try {
        let conversationId = m.conversationId;
        if (!conversationId) {
          if (!m.senderId || !m.receiverId) throw new Error("Missing conversation and pair");
          conversationId = await adminFakerRepository.findOrCreatePrivateConversation(m.senderId, m.receiverId);
        }
        const row = await adminFakerRepository.insertMessage({
          messageId: generateId(),
          conversationId,
          senderId: m.senderId,
          content: m.content,
          messageType: m.messageType || "text",
        });
        created.push(row);
      } catch (err) {
        logger.error("Faker save message failed", { tempId: m.tempId, error: err.message });
        errors.push({ tempId: m.tempId, message: err.message });
      }
    }
    await adminFakerRepository.logSession({
      adminId, entityType: "messages", action: "save", recordCount: created.length,
      payloadJson: { previewId, created: created.length, failed: errors.length },
    });
    if (created.length) await previewStore.delete(previewId);
    return { saved: created.length, failed: errors.length, messages: created, errors };
  }
}

module.exports = new AdminFakerService();