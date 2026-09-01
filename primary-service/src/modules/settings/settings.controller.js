"use strict";

const settingsRepository = require("./settings.repository");
const { sendSuccess } = require("../../utils/response");

class SettingsController {
  async getSettings(req, res, next) {
    try {
      const settings = await settingsRepository.getUserSettings(
        req.user.userId
      );
      return sendSuccess(res, 200, "Settings retrieved", settings);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req, res, next) {
    try {
      const body = req.body || {};
      // Accept either flat map { key: value } or { settings: { ... } }
      const settings =
        body.settings && typeof body.settings === "object"
          ? body.settings
          : body;

      if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: "Settings body must be an object of key/value pairs",
        });
      }

      // Strip non-setting metadata keys if client wraps payload
      const cleaned = { ...settings };
      delete cleaned.settings;

      await settingsRepository.upsertBulk(req.user.userId, cleaned);
      const updated = await settingsRepository.getUserSettings(
        req.user.userId
      );
      return sendSuccess(res, 200, "Settings updated", updated);
    } catch (error) {
      next(error);
    }
  }

  async updateSetting(req, res, next) {
    try {
      const { key } = req.params;
      if (!key) {
        return res.status(400).json({
          success: false,
          message: "Setting key is required",
        });
      }
      // Accept { value } or raw body value field alternatives
      const value =
        req.body && Object.prototype.hasOwnProperty.call(req.body, "value")
          ? req.body.value
          : req.body;
      await settingsRepository.upsertSetting(req.user.userId, key, value);
      return sendSuccess(res, 200, "Setting updated", { key, value });
    } catch (error) {
      next(error);
    }
  }

  async deleteSetting(req, res, next) {
    try {
      const { key } = req.params;
      await settingsRepository.deleteSetting(req.user.userId, key);
      return sendSuccess(res, 200, "Setting deleted");
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();
