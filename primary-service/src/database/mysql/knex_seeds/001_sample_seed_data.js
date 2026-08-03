"use strict";

// Knex seed wrapper. Executes the raw seed SQL (single source of truth) via the
// DELIMITER-aware runner. Comment-only / empty statements are skipped, so this
// is safe even while the sample file is mostly placeholder INSERTs.
const { runSqlFile } = require("../_sqlFileRunner");

exports.seed = (knex) => runSqlFile(knex, "seed/sample_seed_data.sql");
