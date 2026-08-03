"use strict";

// Admin tables: admins, admin_refresh_tokens, admin_faker_sessions
const { runSqlFile } = require("../_sqlFileRunner");

exports.up = (knex) => runSqlFile(knex, "schema/011_admin_tables.sql");

exports.down = () => Promise.resolve();
