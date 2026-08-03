"use strict";

// Auto-generated migration wrapper. Executes the source SQL file (single
// source of truth) via the DELIMITER-aware runner. Order is fixed by the
// timestamp prefix in this filename.
const { runSqlFile } = require("../_sqlFileRunner");

exports.up = (knex) => runSqlFile(knex, "schema/004_scheduled_settings_notifications.sql");

// Down is intentionally a no-op: these migrations create/alter schema and
// stored procedures idempotently; roll back manually if required.
exports.down = () => Promise.resolve();
