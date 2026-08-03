"use strict";

/**
 * DELIMITER-aware SQL file runner for knex migrations.
 *
 * The .sql files under schema/ and procedures/ are the single source of truth.
 * They use client `DELIMITER` directives (needed for stored-procedure bodies)
 * which knex.raw cannot parse, so this helper:
 *   - tracks DELIMITER changes,
 *   - splits the file into individual statements on the active delimiter,
 *   - strips `USE <db>;` lines (knex already connects to the target DB),
 *   - executes each statement via knex.raw.
 *
 * Usage inside a migration:
 *   const { runSqlFile } = require("../_sqlFileRunner");
 *   exports.up = (knex) => runSqlFile(knex, "schema/006_message_status.sql");
 */

const fs = require("fs");
const path = require("path");

const MYSQL_DIR = __dirname; // src/database/mysql

/**
 * Splits a SQL script into executable statements, honoring DELIMITER changes.
 * @param {string} sql
 * @returns {string[]}
 */
function splitSqlStatements(sql) {
  const lines = sql.split(/\r?\n/);
  const statements = [];
  let delimiter = ";";
  let buffer = "";

  const flush = () => {
    const stmt = buffer.trim();
    if (stmt) statements.push(stmt);
    buffer = "";
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // DELIMITER directive: flush pending, switch delimiter, skip the line.
    const delimMatch = /^DELIMITER\s+(\S+)\s*$/i.exec(trimmed);
    if (delimMatch) {
      flush();
      delimiter = delimMatch[1];
      continue;
    }

    // Skip standalone USE statements (connection already targets the DB).
    if (/^USE\s+[^;]+;?\s*$/i.test(trimmed)) continue;

    buffer += line + "\n";

    if (trimmed.endsWith(delimiter)) {
      // Drop the trailing delimiter token from the accumulated statement.
      const withoutDelim = buffer.trim();
      buffer = withoutDelim.slice(0, withoutDelim.length - delimiter.length);
      flush();
    }
  }
  flush();

  // Drop empty / comment-only statements.
  return statements.filter((s) => {
    const meaningful = s
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .trim();
    return meaningful.length > 0;
  });
}

/**
 * Reads and executes a .sql file relative to src/database/mysql.
 * @param {import("knex").Knex} knex
 * @param {string} relPath e.g. "schema/006_message_status.sql"
 */
async function runSqlFile(knex, relPath) {
  const fullPath = path.join(MYSQL_DIR, relPath);
  const sql = fs.readFileSync(fullPath, "utf8");
  const statements = splitSqlStatements(sql);
  for (const statement of statements) {
    // Make procedure creation idempotent even for legacy files that use a
    // bare `CREATE PROCEDURE` (no DROP / IF NOT EXISTS): drop it first so the
    // migration chain is safe to run on an existing database.
    const head = statement.replace(/^(?:\s*--[^\n]*\n|\s*\n)+/, "").trim();
    const procMatch = /^CREATE\s+PROCEDURE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/i.exec(head);
    if (procMatch) {
      await knex.raw("DROP PROCEDURE IF EXISTS `" + procMatch[1] + "`");
    }
    await knex.raw(statement);
  }
}

module.exports = { runSqlFile, splitSqlStatements };
