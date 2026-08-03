"use strict";

/**
 * FakerEngine — server-side only sample data generation.
 * Uses @faker-js/faker. Never expose this to the Angular client.
 */

const { faker } = require("@faker-js/faker");
const { generateId } = require("../../utils/helpers");

const ROLES = ["user", "moderator"];
const STATUSES = ["active", "inactive"];
const GROUP_ROLES = ["member", "member", "member", "admin"];

class FakerEngine {
  generateUsers(count = 10, options = {}) {
    const n = Math.min(Math.max(parseInt(count, 10) || 10, 1), 200);
    const defaultPassword = options.defaultPassword || "User@12345";
    const usedEmails = new Set();
    const usedUsernames = new Set();
    const usedPhones = new Set();
    const users = [];

    let attempts = 0;
    const maxAttempts = n * 20;

    while (users.length < n && attempts < maxAttempts) {
      attempts += 1;
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const baseUsername = faker.internet
        .userName({ firstName, lastName })
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 24)
        .toLowerCase() || `user${users.length}`;

      let username = baseUsername;
      let suffix = 0;
      while (usedUsernames.has(username) || username.length < 3) {
        suffix += 1;
        username = `${baseUsername.slice(0, 20)}${suffix}`;
      }

      let email = faker.internet.email({ firstName, lastName }).toLowerCase();
      let emailTry = 0;
      while (usedEmails.has(email) && emailTry < 10) {
        emailTry += 1;
        email = faker.internet.email({ firstName, lastName }).toLowerCase();
      }
      if (usedEmails.has(email)) {
        email = `${username}${users.length}@example.test`;
      }

      let phoneNumber = `+1${faker.string.numeric(10)}`;
      let phoneTry = 0;
      while (usedPhones.has(phoneNumber) && phoneTry < 10) {
        phoneTry += 1;
        phoneNumber = `+1${faker.string.numeric(10)}`;
      }

      usedEmails.add(email);
      usedUsernames.add(username);
      usedPhones.add(phoneNumber);

      users.push({
        tempId: generateId(),
        firstName: firstName.slice(0, 50),
        lastName: lastName.slice(0, 50),
        email: email.slice(0, 255),
        username: username.slice(0, 30),
        password: defaultPassword,
        phoneNumber: phoneNumber.slice(0, 20),
        bio: faker.lorem.sentence({ min: 3, max: 12 }).slice(0, 500),
        role: options.role || faker.helpers.arrayElement(ROLES),
        status: options.status || faker.helpers.arrayElement(STATUSES),
      });
    }

    return users;
  }

  regenerateUser(existing = {}, options = {}) {
    const [fresh] = this.generateUsers(1, options);
    return {
      ...fresh,
      tempId: existing.tempId || fresh.tempId,
    };
  }

  /**
   * Generate contact pairs from existing DB users.
   * @param {Array<{userId:string,username:string,firstName:string,lastName:string}>} pool
   * @param {number} count
   * @param {{mode?:'accepted'|'pending'}} options
   */
  generateContacts(pool = [], count = 10, options = {}) {
    const n = Math.min(Math.max(parseInt(count, 10) || 10, 1), 200);
    if (!pool || pool.length < 2) {
      return [];
    }
    const mode = options.mode || "accepted";
    const pairs = [];
    const used = new Set();
    let attempts = 0;
    const maxAttempts = n * 40;

    while (pairs.length < n && attempts < maxAttempts) {
      attempts += 1;
      const a = faker.helpers.arrayElement(pool);
      const b = faker.helpers.arrayElement(pool);
      if (!a || !b || a.userId === b.userId) continue;
      const key = [a.userId, b.userId].sort().join(":");
      if (used.has(key)) continue;
      used.add(key);
      pairs.push({
        tempId: generateId(),
        userId: a.userId,
        contactUserId: b.userId,
        userLabel: `${a.firstName} ${a.lastName} (@${a.username})`,
        contactLabel: `${b.firstName} ${b.lastName} (@${b.username})`,
        mode,
        status: mode === "pending" ? "pending" : "active",
      });
    }
    return pairs;
  }

  regenerateContact(existing = {}, pool = [], options = {}) {
    const [fresh] = this.generateContacts(pool, 1, options);
    if (!fresh) return existing;
    return { ...fresh, tempId: existing.tempId || fresh.tempId };
  }

  /**
   * Generate groups with member ids from pool.
   */
  generateGroups(pool = [], count = 5, options = {}) {
    const n = Math.min(Math.max(parseInt(count, 10) || 5, 1), 50);
    if (!pool || pool.length < 2) return [];
    const membersPerGroup = Math.min(
      Math.max(parseInt(options.membersPerGroup, 10) || 4, 2),
      Math.min(pool.length, 20)
    );
    const groups = [];

    for (let i = 0; i < n; i += 1) {
      const shuffled = faker.helpers.shuffle([...pool]);
      const owner = shuffled[0];
      const members = shuffled.slice(0, membersPerGroup).map((u, idx) => ({
        userId: u.userId,
        username: u.username,
        label: `${u.firstName} ${u.lastName}`,
        role: idx === 0 ? "owner" : faker.helpers.arrayElement(GROUP_ROLES),
      }));
      groups.push({
        tempId: generateId(),
        name: `${faker.company.buzzNoun()} ${faker.word.adjective()}`.slice(0, 100),
        description: faker.lorem.sentence({ min: 4, max: 14 }).slice(0, 500),
        createdBy: owner.userId,
        createdByLabel: `${owner.firstName} ${owner.lastName} (@${owner.username})`,
        members,
      });
    }
    return groups;
  }

  regenerateGroup(existing = {}, pool = [], options = {}) {
    const [fresh] = this.generateGroups(pool, 1, options);
    if (!fresh) return existing;
    return { ...fresh, tempId: existing.tempId || fresh.tempId };
  }

  /**
   * Generate messages for existing conversations or invent private pairs.
   * @param {Array} userPool
   * @param {Array} conversationPool - optional {conversationId, participantIds[]}
   */
  generateMessages(userPool = [], conversationPool = [], count = 20, options = {}) {
    const n = Math.min(Math.max(parseInt(count, 10) || 20, 1), 500);
    const messages = [];
    if (!userPool || userPool.length < 2) return [];

    for (let i = 0; i < n; i += 1) {
      let conversationId = null;
      let senderId = null;
      let receiverId = null;
      let conversationLabel = "";

      if (conversationPool.length) {
        const conv = faker.helpers.arrayElement(conversationPool);
        conversationId = conv.conversationId;
        const parts = conv.participantIds || [];
        senderId = faker.helpers.arrayElement(parts.length ? parts : userPool.map((u) => u.userId));
        conversationLabel = conv.label || conversationId;
      } else {
        const a = faker.helpers.arrayElement(userPool);
        let b = faker.helpers.arrayElement(userPool);
        let guard = 0;
        while (b.userId === a.userId && guard < 10) {
          b = faker.helpers.arrayElement(userPool);
          guard += 1;
        }
        senderId = a.userId;
        receiverId = b.userId;
        conversationLabel = `${a.username} ↔ ${b.username}`;
      }

      const sender = userPool.find((u) => u.userId === senderId) || userPool[0];
      messages.push({
        tempId: generateId(),
        conversationId,
        senderId,
        receiverId,
        senderLabel: sender
          ? `${sender.firstName} ${sender.lastName} (@${sender.username})`
          : senderId,
        conversationLabel,
        content: faker.lorem.sentences({ min: 1, max: 3 }).slice(0, 1000),
        messageType: options.messageType || "text",
      });
    }
    return messages;
  }

  regenerateMessage(existing = {}, userPool = [], conversationPool = [], options = {}) {
    const [fresh] = this.generateMessages(userPool, conversationPool, 1, options);
    if (!fresh) return existing;
    return { ...fresh, tempId: existing.tempId || fresh.tempId };
  }
}

module.exports = new FakerEngine();
