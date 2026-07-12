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
      const settings = req.body;
      await settingsRepository.upsertBulk(req.user.userId, settings);
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
      const { value } = req.body;
      await settingsRepository.upsertSetting(req.user.userId, key, value);
      return sendSuccess(res, 200, "Setting updated");
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
