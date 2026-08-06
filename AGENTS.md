# AGENTS.md — chat-system

Guidance for AI coding agents and human contributors working in this repository.

## What this repo is

Microservice-style **real-time chat backend** (Node.js 18, plain JavaScript — **no TypeScript**).

| Path | Role |
|------|------|
| `primary-service/` | Main deployable API + Socket.IO (MySQL, Redis, JWT) |
| `analytics-service/` | Secondary service (MongoDB archival / search / analytics) |
| `docker-compose.yml` | Local MySQL + Redis + primary-service |
| `.github/workflows/node.yml` | CI/CD for `primary-service` → lint, test, Docker smoke, Render deploy |
| `DEPLOYMENT.md` | Deploy / CI details (Render, Railway, PM2) |
| `README.md` | Architecture, API map, patterns |
| `Table-schemas.sql` / `Table-SPs.sql` | Schema reference snapshots (not the migration source of truth) |

**Frontend** lives in a separate repo: [maheshpcse/chat-app](https://github.com/maheshpcse/chat-app). Default CORS/Socket origins target `http://localhost:4200`.

Default agent focus: **`primary-service/`** unless the task explicitly targets analytics or root infra.

---

## Setup

### Prerequisites

- Node.js `>=18.13.0`, npm `>=8.19.3`
- MySQL 8.x (required for real runs / readiness)
- Redis 7.x (optional; set `REDIS_REQUIRED=false` for CI/dev without Redis)
- Docker (optional; compose stack)

### Primary service

```bash
cd primary-service
cp .env.example .env   # edit MySQL/JWT secrets
npm install
npm run db:migrate     # knex — applies schema + stored procedures
npm run db:seed        # optional sample + default admin
npm run dev            # nodemon → src/server.js
```

Health (after start):

- `GET /api/v1/health` — basic OK
- `GET /api/v1/health/live` — process alive
- `GET /api/v1/health/ready` — MySQL required; Redis optional unless `REDIS_REQUIRED=true`

### Analytics service

```bash
cd analytics-service
npm install
# MONGO_URI / ANALYTICS_PORT (default 3001)
npm run dev
```

### Docker (repo root)

```bash
cp primary-service/.env.example primary-service/.env
docker compose up -d --build
# http://localhost:3000/api/v1/health
```

---

## Build / lint / test

Work from **`primary-service/`** (CI `working-directory` is the same).

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint on `src/` (`.eslintrc.js`) |
| `npm test` | Jest + coverage (`jest.config.js`) |
| `npm start` | Production entry: `node src/server.js` |
| `npm run dev` | Nodemon |
| `npm run db:migrate` | Apply pending Knex migrations |
| `npm run db:migrate:status` | Migration status |
| `npm run db:migrate:rollback` | Rollback last batch |
| `npm run db:migrate:make <name>` | Scaffold migration wrapper |
| `npm run db:seed` | Run Knex seeds |

There is **no compile/build step** (CommonJS JS only). “Build” in CI = `npm ci` + lint + test + load `src/app.js` + Docker image smoke.

### CI expectations (mirror locally before PR)

From `primary-service/`:

```bash
npm ci
npm run lint
APP_ENV=test \
JWT_SECRET='ci-test-jwt-secret-min-32-chars-long!!' \
JWT_REFRESH_SECRET='ci-test-refresh-secret-min-32-chars!' \
JWT_ADMIN_SECRET='ci-test-admin-jwt-secret-min-32!!' \
JWT_ADMIN_REFRESH_SECRET='ci-test-admin-refresh-secret-32!' \
MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 \
MYSQL_DATABASE=chat_system_test MYSQL_USERNAME=root MYSQL_PASSWORD= \
REDIS_REQUIRED=false \
npm test
```

Workflow triggers on changes under `primary-service/**`, the workflow file, or (push) `docker-compose.yml`. Deploy job runs only on push to `main` via `RENDER_DEPLOY_HOOK_URL`.

### Tests

- Location: `primary-service/tests/` and optional `**/__tests__/**` or `*.test.js` / `*.spec.js` under `src/`
- Runner: Jest, `testEnvironment: node`, `forceExit: true`, 15s timeout
- Smoke tests should not require live MySQL/Redis when possible (see `tests/health.test.js`)
- Prefer `supertest` against `require("../src/app")` with env stubs set **before** requiring app/config
- Coverage collected from `src/**/*.js` except `src/server.js` and `src/workers/**`

---

## Architecture (primary-service)

```
primary-service/src/
  server.js          # bootstrap, HTTP + Socket.IO, graceful shutdown
  app.js             # Express middleware stack + /api/v1
  config/            # environment, MySQL pool, Redis, socket
  middleware/        # auth, admin auth, validation, errors, rate limit, upload, tracker
  modules/<feature>/ # MVC-ish vertical slices
  routes/index.js    # central registry under /api/v1
  services/aws/      # S3, Secrets Manager, SSM, SNS, SQS
  socket/            # Socket.IO handlers
  workers/           # worker_threads (CPU work)
  utils/             # logger, response, errors, constants, helpers, patterns
  database/mysql/    # SQL source of truth + knex wrappers
```

### Module layout (required pattern)

Each feature under `src/modules/<name>/`:

| File | Responsibility |
|------|----------------|
| `<name>.routes.js` | Express `Router`, middleware chain, path wiring |
| `<name>.controller.js` | HTTP only: call service, `sendSuccess` / `sendPaginated`, `next(error)` |
| `<name>.service.js` | Business rules, orchestration, cache invalidation |
| `<name>.repository.js` | Data access via `callProcedure(...)` (MySQL SPs) |
| `<name>.validation.js` | Joi schemas (when inputs need validation) |
| `index.js` | Re-export public pieces |

Naming: **kebab-case** folders (`scheduled-message`, `admin-auth`); files **`<folder>.<layer>.js`**.

Register new HTTP modules in `src/routes/index.js` with an explicit prefix.

### Request flow

1. Global middleware in `app.js` (helmet, hpp, cors, compression, body parsers, requestTracker, rate limit)
2. Route: optional `authenticate` / admin auth → `validate(schema)` → controller
3. Controller → service → repository (`callProcedure`)
4. Errors: throw `AppError` subclasses from `utils/errors.js`; controller `catch` → `next(error)` → `errorHandler`
5. Success: `sendSuccess` / `sendPaginated` from `utils/response.js` — never ad-hoc response shapes

### API surface

- Prefix: **`/api/v1`**
- User areas: `/auth`, `/users`, `/conversations`, `/messages`, `/groups`, `/uploads`, `/contacts`, `/presence`, `/notifications`, `/settings`, `/scheduled-messages`
- Admin areas (isolated JWT secrets + middleware): `/admin/auth`, `/admin/dashboard`, `/admin/users`, `/admin/faker`
- **Never** reuse user JWT middleware or secrets for admin routes

### Auth

- User JWT: `Authorization: ******; middleware sets `req.user`
- Admin JWT: separate secrets (`JWT_ADMIN_*`) and `adminAuthentication` middleware
- Passwords: bcrypt (`BCRYPT_SALT_ROUNDS`)
- Validation: Joi via `validate(schema)` HOF middleware

### Data layer

- **Transactional data**: MySQL 8 via `mysql2` pool (`config/database.js`)
- Prefer **stored procedures** through `callProcedure("spName", [args])` — do not scatter raw SQL in services
- **SQL source of truth**: `src/database/mysql/schema/*.sql` and `procedures/*.sql`
- **Migrations**: Knex thin JS wrappers in `knex_migrations/` calling `_sqlFileRunner.js` (DELIMITER-aware). See `src/database/mysql/MIGRATIONS.md`
- Column ALTERs: use helper procs (`spAlterTableColumn`, etc. from `000_common_ddl_helpers.sql`) for idempotency
- Tables: `CREATE TABLE IF NOT EXISTS`; procedures: runner drops then creates
- Seeds: `knex_seeds/` → often delegate to `seed/*.sql`; default admin from env `ADMIN_*`
- **Analytics / archive**: MongoDB + Mongoose in `analytics-service` (not Knex)

### Cache & realtime

- Redis (`ioredis`): cache + pub/sub; key prefix `REDIS_KEY_PREFIX` (default `chat:`)
- Invalidation: TTL + write-through; bulk delete via `SCAN` — **never `KEYS *`**
- Socket.IO: `src/socket/socketHandler.js` + `config/socket.js` (online status, typing, live messages)

### Cross-cutting utilities

- Logging: Winston (`utils/logger.js`) — structured; avoid unstructured noise in production paths
- Patterns demos: currying / closures / HOFs in `utils/patterns.js` and middleware — match existing style when extending
- Workers: heavy CPU (export, file process, analytics) goes to `src/workers/`, not the request thread

---

## Coding conventions

1. **Language**: CommonJS (`require` / `module.exports`). Start files with `"use strict";`.
2. **No TypeScript** — do not introduce `tsconfig` or `.ts` sources unless a human explicitly requests a migration.
3. **Controllers stay thin** — no SQL, no JWT crypto, no business branching beyond HTTP mapping.
4. **Services own rules** — authorization checks that are domain-level, orchestration, cache keys.
5. **Repositories only talk to DB** — map procedure result sets; no Express `req`/`res`.
6. **Errors**: use `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, etc. Do not `res.status` for domain failures inside services.
7. **Responses**: always `{ success, statusCode, message, data?, meta? }` via helpers.
8. **Validation**: Joi schemas colocated as `*.validation.js`; wire with `validate(...)`.
9. **ESLint**: `eslint:recommended`; unused args OK if prefixed with `_`; empty `catch` allowed.
10. **Env**: read through `config/environment.js` — do not sprinkle `process.env` deep in modules except boot/health edge cases already established.
11. **Security middleware stays on**: helmet, hpp, cors allowlist, rate limiters (`generalLimiter`, `authLimiter`), bcrypt cost, separate admin secrets.
12. **Secrets**: never commit `.env`; use `.env.example` as the template. Do not hardcode credentials or real JWT secrets.
13. **AWS**: use existing `services/aws/*` clients; pin/overrides already in `package.json` — avoid casual major bumps of `@aws-sdk/*`.

### Adding a new feature module (checklist)

1. Create `src/modules/<feature>/` with routes, controller, service, repository, validation (as needed), `index.js`.
2. Add/adjust SQL under `database/mysql/schema` or `procedures`.
3. Add Knex wrapper: `npm run db:migrate:make ...` → `runSqlFile(knex, "...")`.
4. Register router in `src/routes/index.js`.
5. Export from module `index.js` if other packages need the service.
6. Add tests under `tests/` or module `__tests__`.
7. Run `npm run lint` and `npm test`.

### DB change checklist

1. Edit/add `.sql` (idempotent helpers for ALTERs).
2. Knex JS wrapper only runs SQL file — keep logic in SQL.
3. `npm run db:migrate` against a throwaway DB before PR.
4. Update seeds only if demo/default data must change.
5. Do not treat root `Table-schemas.sql` as the migrate path; keep migrations authoritative.

---

## What not to do

- Do not add a frontend app into this repo (separate `chat-app`).
- Do not merge admin and user auth stacks or share JWT secrets.
- Do not use `KEYS *` on Redis.
- Do not put CPU-heavy loops on the Express event loop when a worker pattern exists.
- Do not run migrations implicitly on every app boot unless a task explicitly implements a guarded release step.
- Do not expand `analytics-service` scope into primary MySQL concerns (or the reverse) without clear boundaries.
- Do not weaken CI by deleting tests to go green; fix code or add proper stubs.
- Do not commit `node_modules/`, `coverage/`, `logs/`, `uploads/`, or real secrets.

---

## Useful references

| Doc / path | When to read |
|------------|----------------|
| `README.md` | API list, cache TTLs, design patterns |
| `DEPLOYMENT.md` | Render/Railway/PM2/Docker production |
| `primary-service/src/database/mysql/MIGRATIONS.md` | Knex + SQL workflow |
| `DB_SCHEMA_VALIDATION_REPORT.md` | Schema validation notes |
| `primary-service/.env.example` | Full env contract |
| `.github/workflows/node.yml` | Exact CI steps and secrets |
| `.github/copilot-instructions.md` | Contributor/agent communication style for this repo |

---

## Agent working agreements

- Prefer **smallest change** that completes the task; match existing module patterns over new frameworks.
- After code changes in `primary-service`, run **lint + test** when environment allows.
- For deployment or workflow edits, keep secrets in GitHub/Render secrets — only names belong in YAML/docs.
- Keep PR/commit messages normal prose; follow repo tone in chat if copilot instructions request terse style — **code and docs stay clear and complete**.
- When unsure about schema, open the relevant `procedures/*.sql` / `schema/*.sql` and existing repository callers before inventing new tables or ad-hoc queries.
