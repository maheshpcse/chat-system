"use strict";

/**
 * Settings Repository
 * Data access layer for user settings key-value store via stored procedures.
 */

const { callProcedure } = require("../../config/database");

class SettingsRepository {
  async getUserSettings(userId) {
    const result = await callProcedure("sp_get_user_settings", [userId]);
    // Transform rows to key-value object
    const settings = {};
    if (result[0]) {
      result[0].forEach((row) => {
        try {
          settings[row.setting_key] = JSON.parse(row.setting_value);
        } catch {
          settings[row.setting_key] = row.setting_value;
        }
      });
    }
    return settings;
  }

  async upsertSetting(userId, key, value) {
    const stringValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);
    await callProcedure("sp_upsert_user_setting", [userId, key, stringValue]);
  }

  async upsertBulk(userId, settings) {
    const promises = Object.entries(settings).map(([key, value]) =>
      this.upsertSetting(userId, key, value)
    );
    await Promise.all(promises);
  }

  async deleteSetting(userId, key) {
    await callProcedure("sp_delete_user_setting", [userId, key]);
  }
}

module.exports = new SettingsRepository();
