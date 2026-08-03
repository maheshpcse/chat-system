"use strict";

/**
 * PreviewStore — admin faker preview session cache.
 * Prefer Redis when available; fall back to in-memory Map.
 */

const cacheService = require("../cache/cache.service");
const logger = require("../../utils/logger");

const memory = new Map();
const PREVIEW_TTL_SEC = 30 * 60;
const KEY_PREFIX = "admin:faker:preview:";

class PreviewStore {
  constructor() {
    this.ttlSec = PREVIEW_TTL_SEC;
  }

  _key(previewId) {
    return `${KEY_PREFIX}${previewId}`;
  }

  async set(previewId, entry) {
    const payload = {
      ...entry,
      expiresAt: Date.now() + this.ttlSec * 1000,
    };
    memory.set(previewId, payload);
    try {
      await cacheService.set(this._key(previewId), payload, this.ttlSec);
    } catch (err) {
      logger.warn("Faker preview Redis set failed; using memory only", {
        error: err.message,
      });
    }
    return payload;
  }

  async get(previewId) {
    try {
      const fromRedis = await cacheService.get(this._key(previewId));
      if (fromRedis) {
        memory.set(previewId, fromRedis);
        if (fromRedis.expiresAt && fromRedis.expiresAt < Date.now()) {
          await this.delete(previewId);
          return null;
        }
        return fromRedis;
      }
    } catch (err) {
      logger.warn("Faker preview Redis get failed; using memory", {
        error: err.message,
      });
    }

    const local = memory.get(previewId);
    if (!local) return null;
    if (local.expiresAt && local.expiresAt < Date.now()) {
      memory.delete(previewId);
      return null;
    }
    return local;
  }

  async delete(previewId) {
    memory.delete(previewId);
    try {
      await cacheService.delete(this._key(previewId));
    } catch (err) {
      logger.warn("Faker preview Redis delete failed", { error: err.message });
    }
  }
}

module.exports = new PreviewStore();
module.exports.PREVIEW_TTL_SEC = PREVIEW_TTL_SEC;
