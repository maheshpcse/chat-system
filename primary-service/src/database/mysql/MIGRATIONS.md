# MySQL Migrations (knex)

Migrations are managed with **knex** and run in deterministic order by their
`<YYYYMMDDHHMMSS>_<script_name>.js` filename prefix.

## Layout
- `schema/*.sql`, `procedures/*.sql` — the actual DDL (single source of truth).
- `procedures/000_common_ddl_helpers.sql` — idempotent DDL helper procedures
  (`spAlterTableColumn`, `spAddIndexIfNotExists`, `spAddForeignKeyIfNotExists`).
  All column ALTERs go through these to emulate `IF NOT EXISTS`.
- `_sqlFileRunner.js` — DELIMITER-aware runner. Splits a `.sql` file into
  statements and executes them via `knex.raw`. Auto-drops each procedure
  before `CREATE PROCEDURE`, so the chain is safe to re-run.
- `knex_migrations/*.js` — thin wrappers; each calls `runSqlFile(...)`.

## Commands (run from `primary-service/`)
```bash
npm install               # first time: pulls knex
npm run db:migrate        # apply all pending migrations (migrate:latest)
npm run db:migrate:status # show applied vs pending
npm run db:migrate:rollback
npm run db:migrate:make my_change   # scaffold a new migration
```
Connection comes from `.env` (`MYSQL_HOST/PORT/DATABASE/USERNAME/PASSWORD`)
via `knexfile.js`.

## Adding a new change
1. Add or edit a `.sql` file under `schema/` or `procedures/`.
   - For column changes, `CALL spAlterTableColumn('ADD'|'DROP'|'MODIFY', ...)`.
   - Tables: `CREATE TABLE IF NOT EXISTS`. Procedures: plain `CREATE PROCEDURE`
     (the runner drops-then-creates).
2. Create a migration wrapper:
   `npm run db:migrate:make 011_my_change` then point its `up` at the sql file:
   ```js
   const { runSqlFile } = require("../_sqlFileRunner");
   exports.up = (knex) => runSqlFile(knex, "procedures/011_my_change.sql");
   exports.down = () => Promise.resolve();
   ```
3. `npm run db:migrate`.

## Seeds
Knex seeds live in `knex_seeds/*.js` and delegate to the same runner:
```bash
npm run db:seed        # runs knex seed:run
```
`knex_seeds/001_sample_seed_data.js` executes `seed/sample_seed_data.sql`
(raw SQL kept as the source of truth). Add more seed data to that `.sql`
file, or add another `knex_seeds/00N_*.js` wrapper. Run seeds AFTER migrations.

## Idempotency / existing databases
Every migration is safe to run against an already-populated database:
- tables use `IF NOT EXISTS`;
- columns/indexes/FKs go through the existence-checking helper procedures;
- procedures are dropped before being (re)created.

So running `db:migrate` on an existing DB records the baseline and applies
only what is actually missing — no "already exists" errors.
