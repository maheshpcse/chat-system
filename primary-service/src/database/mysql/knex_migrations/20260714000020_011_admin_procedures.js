"use strict";

// Admin stored procedures (auth, dashboard, faker helpers)
const { runSqlFile } = require("../_sqlFileRunner");

exports.up = (knex) => runSqlFile(knex, "procedures/011_admin_procedures.sql");

exports.down = () => Promise.resolve();
