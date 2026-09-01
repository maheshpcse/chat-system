"use strict";

const { callProcedure } = require("../../config/database");

class SettingsRepository {
  async getUserSettings(userId) {
    const result = await callProcedure("spGetUserSettings", [userId]);
    const settings = {};
    const rows = Array.isArray(result)
      ? Array.isArray(result[0])
        ? result[0]
        : result
      : [];

    rows.forEach((row) => {
      if (!row) {
        return;
      }
      const key = row.settingKey != null ? row.settingKey : row.setting_key;
      const raw =
        row.settingValue != null ? row.settingValue : row.setting_value;
      if (key == null) {
        return;
      }
      if (raw == null) {
        settings[key] = null;
        return;
      }
      if (typeof raw === "string") {
        try {
          settings[key] = JSON.parse(raw);
        } catch (e) {
          settings[key] = raw;
        }
      } else {
        settings[key] = raw;
      }
    });
    return settings;
  }

  async upsertSetting(userId, key, value) {
    let stringValue;
    if (value === null || value === undefined) {
      stringValue = "";
    } else if (typeof value === "object") {
      stringValue = JSON.stringify(value);
    } else if (typeof value === "boolean" || typeof value === "number") {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }
    await callProcedure("spUpsertUserSetting", [userId, key, stringValue]);
  }

  async upsertBulk(userId, settings) {
    if (!settings || typeof settings !== "object") {
      return;
    }
    const entries = Object.entries(settings).filter(
      ([k]) => k != null && String(k).trim() !== ""
    );
    for (const [key, value] of entries) {
      await this.upsertSetting(userId, key, value);
    }
  }

  async deleteSetting(userId, key) {
    await callProcedure("spDeleteUserSetting", [userId, key]);
  }
}

module.exports = new SettingsRepository();
