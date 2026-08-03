"use strict";

/**
 * Knex configuration for MySQL schema/procedure migrations.
 *
 * Migrations live in src/database/mysql/knex_migrations and are named
 * <YYYYMMDDHHMMSS>_<script_name>.js so they run in a deterministic order.
 * Each migration delegates to the shared SQL-file runner, which executes the
 * corresponding .sql file (DELIMITER-aware) as the single source of truth.
 *
 * Usage:
 *   npm run db:migrate        # apply all pending migrations (migrate:latest)
 *   npm run db:migrate:rollback
 *   npm run db:migrate:status
 */

require("dotenv").config();

const connection = {
  host: process.env.MYSQL_HOST || "localhost",
  port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
  database: process.env.MYSQL_DATABASE || "chat_system",
  user: process.env.MYSQL_USERNAME || "root",
  password: process.env.MYSQL_PASSWORD || "",
  // Required so stored-procedure bodies (which contain multiple ';') and the
  // runner's statement batches execute correctly.
  multipleStatements: true,
  dateStrings: true,
  timezone: "+00:00",
};

const base = {
  client: "mysql2",
  connection,
  migrations: {
    directory: "./src/database/mysql/knex_migrations",
    tableName: "knex_migrations",
    // Filenames are already timestamp-prefixed; keep extension for clarity.
    loadExtensions: [".js"],
  },
  seeds: {
    directory: "./src/database/mysql/knex_seeds",
  },
  pool: { min: 1, max: 5 },
};

module.exports = {
  development: base,
  production: base,
};
