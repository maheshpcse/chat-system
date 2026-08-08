# Chat System (Node + Express + MySQL) — Deployment & CI/CD

**Repository:** https://github.com/maheshpcse/chat-system  
**Primary service path:** `primary-service/`  
**Stack:** Node 18 · Express · MySQL · Redis (optional) · Socket.IO · GitHub Actions · Render · Railway  
**Frontend repo:** https://github.com/maheshpcse/chat-app  

---

## 1. Project analysis (what we found)

| Item | Value |
|------|--------|
| Service name | `chat-primary-service` |
| Entry | `primary-service/src/server.js` (plain JS — **no TypeScript build**) |
| App factory | `primary-service/src/app.js` |
| API prefix | `/api/v1` |
| Health (existing) | `GET /api/v1/health` |
| Health (added) | `GET /api/v1/health/live`, `GET /api/v1/health/ready` |
| DB | MySQL via `mysql2` + Knex migrations |
| Scripts | `start`, `dev`, `test` (jest), `lint` (eslint), `db:migrate` |
| Env sample | `primary-service/.env.example` (already present) |
| Analytics | `analytics-service/` (separate; not in default Render blueprint) |

Monorepo-style **backend repo** with `primary-service` as deployable root.

---

## 2. Files added & where they go

Paths relative to **Chat System** repo root:

| File | Purpose |
|------|---------|
| [`.github/workflows/node.yml`](.github/workflows/node.yml) | CI on `primary-service/**`: cache, lint, test, Docker smoke, Render deploy hook |
| [`primary-service/Dockerfile`](primary-service/Dockerfile) | Production Node 18 Alpine image + healthcheck |
| [`primary-service/.dockerignore`](primary-service/.dockerignore) | Slim/safe image context |
| [`primary-service/ecosystem.config.js`](primary-service/ecosystem.config.js) | PM2 cluster mode (VPS alternative to Render) |
| [`primary-service/render.yaml`](primary-service/render.yaml) | Render Blueprint (optional) |
| [`primary-service/jest.config.js`](primary-service/jest.config.js) | Jest for CI |
| [`primary-service/.eslintrc.js`](primary-service/.eslintrc.js) | ESLint for `npm run lint` |
| [`primary-service/tests/health.test.js`](primary-service/tests/health.test.js) | Smoke tests for health routes |
| [`docker-compose.yml`](docker-compose.yml) | MySQL + Redis + API for local/VPS |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | This guide |
| [`primary-service/src/routes/index.js`](primary-service/src/routes/index.js) | Enhanced health/live/ready (edited) |

Existing (keep using):

| File | Purpose |
|------|---------|
| `primary-service/.env.example` | Full env template |
| `primary-service/knexfile.js` | Migrations |
| `Table-schemas.sql` / `Table-SPs.sql` | Schema reference |

---

## 3. Backend workflow explained (every step)

File: `.github/workflows/node.yml`

### Triggers
- Push/PR to `main` when `primary-service/**` (or the workflow) changes  
- Manual `workflow_dispatch`

### Job `build` (`working-directory: primary-service`)
1. **Checkout** code.  
2. **Node 18** setup.  
3. **Cache `~/.npm`** keyed by `primary-service/package-lock.json`.  
4. **`npm ci`** — install deps including devDependencies (lint/test).  
5. **`npm run lint`** — ESLint on `src/`.  
6. **`npm test`** — Jest + coverage (uses dummy JWT secrets; Redis not required).  
7. **Verify entrypoint** — `src/server.js` / `src/app.js` load check.  
8. **Docker build smoke** — `docker build -f primary-service/Dockerfile` (catches image breakage).  
9. **Upload coverage** artifact (if present).

### Job `deploy` (push `main` only)
1. **POST** `secrets.RENDER_DEPLOY_HOOK_URL` — starts Render build from connected repo.  
2. Optional poll `secrets.RENDER_SERVICE_URL/api/v1/health` until up (non-fatal warning on timeout).

### No TypeScript compile
Service is JavaScript. There is no `tsc` step. “Build” = install + validate + containerize.

### Caching strategy (backend)
- npm cache in GHA.  
- Docker layer cache on Render/local rebuilds (`package-lock` copy before source).  
- Redis app cache in runtime (optional).  
- Cancel concurrent workflow runs on same ref.

### Production optimizations
- `compression`, `helmet`, `hpp`, rate limit already in `app.js`.  
- Docker: `npm ci --omit=dev`, non-root user, `tini`, healthcheck.  
- PM2: cluster `instances: max`, memory restart, graceful kill timeout.  
- Knex migrations run as explicit release step (not blindly on every boot unless you add it).

---

## 4. Deploy target: Render (default)

### One-time Render setup
1. Create account at https://render.com  
2. **New → Web Service** → connect `maheshpcse/chat-system`  
3. Settings:  
   - **Root Directory:** `primary-service`  
   - **Runtime:** Node  
   - **Build Command:** `npm ci --omit=dev`  
   - **Start Command:** `node src/server.js`  
   - **Health Check Path:** `/api/v1/health`  
4. Add **environment variables** (see Secrets table below) in Render Dashboard.  
5. Provision MySQL (Render MySQL, PlanetScale, AWS RDS, etc.) and put host/user/pass in env.  
6. Run migrations once (Render Shell or local against prod with care):  
   ```bash
   npm run db:migrate
   npm run db:seed   # only if intended
   ```  
7. **Settings → Deploy Hook** → copy URL.  
8. In GitHub **chat-system → Settings → Secrets and variables → Actions**:  
   - `RENDER_DEPLOY_HOOK_URL` = hook URL  
   - `RENDER_SERVICE_URL` = `https://<your-service>.onrender.com` (optional health probe)

### Blueprint alternative
Use `primary-service/render.yaml` via **New → Blueprint**. Still set `sync: false` secrets in UI.

### Railway (chat-system monorepo)

**Why deploy failed (Railpack log):** Railway analyzed **repo root**. Root has no `package.json` / `start.sh` — only `primary-service/` + `analytics-service/`. Railpack could not pick a language builder.

**Code fixes in repo:**
| File | Purpose |
|------|---------|
| [`railway.toml`](railway.toml) | Root: Dockerfile builder + healthcheck |
| [`Dockerfile`](Dockerfile) | Root image builds from `primary-service/` |
| [`.dockerignore`](.dockerignore) | Slim root build context |
| [`primary-service/railway.toml`](primary-service/railway.toml) | When Root Directory = `primary-service` |
| `environment.js` / `server.js` | `PORT` + bind `0.0.0.0`; Railway MySQL/Redis env aliases |

**Railway dashboard setup (do this after push):**
1. Project → service from `maheshpcse/chat-system`.
2. **Preferred:** Settings → **Root Directory** = `primary-service`  
   - Builder: Dockerfile (uses `primary-service/Dockerfile`)  
   - Or Nixpacks/Railpack Node: build `npm ci --omit=dev`, start `npm start`.
3. **Or leave root empty** and use root [`railway.toml`](railway.toml) + root [`Dockerfile`](Dockerfile) (already wired).
4. Add **MySQL** plugin (or external DB). Map vars (app accepts both styles):
   - `MYSQL_HOST` / `MYSQLHOST`, `MYSQL_PORT` / `MYSQLPORT`, `MYSQL_DATABASE` / `MYSQLDATABASE`, `MYSQL_USERNAME` / `MYSQLUSER`, `MYSQL_PASSWORD` / `MYSQLPASSWORD`
5. Set secrets: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ADMIN_SECRET`, `JWT_ADMIN_REFRESH_SECRET`.
6. Optional Redis: set `REDIS_URL` or host/port; keep `REDIS_REQUIRED=false` until Redis is attached.
7. CORS: `CORS_ORIGIN` + `SOCKET_CORS_ORIGIN` = SPA origin (e.g. `https://maheshpcse.github.io`).
8. Do **not** set `APP_PORT` to fight Railway — app uses injected `PORT`.
9. Health: `/api/v1/health/live` (configured in `railway.toml`).
10. After first healthy deploy, run migrations (Railway shell):  
    `npm run db:migrate` (and seed only if intended).

**Public URL:** Railway assigns `https://<service>.up.railway.app` (or custom domain).

### Azure / AWS / VPS (preference switch)
| Platform | Idea |
|----------|------|
| **Azure App Service** | Container from `Dockerfile` or Node stack; set app settings from secrets; deploy via `azure/webapps-deploy` |
| **AWS ECS/Fargate** | Push image to ECR in GHA; update ECS service; ALB health = `/api/v1/health` |
| **VPS + PM2** | `git pull`, `npm ci --omit=dev`, `pm2 start ecosystem.config.js --env production` |

Default GHA workflow still uses **Render deploy hook** unless you switch the deploy job.
---

## 5. GitHub Secrets configuration (backend)

Repo: **maheshpcse/chat-system** → Settings → Secrets and variables → Actions  

| Secret | Required | Description |
|--------|----------|-------------|
| `RENDER_DEPLOY_HOOK_URL` | Optional (required to trigger deploy) | Render Deploy Hook URL |
| `RENDER_SERVICE_URL` | Optional | Public base URL for post-deploy health |

**Runtime secrets** belong on **Render (or host) env**, not necessarily GitHub:

| Variable | Notes |
|----------|--------|
| `JWT_SECRET` | Strong random; unique |
| `JWT_REFRESH_SECRET` | Strong random; unique |
| `JWT_ADMIN_SECRET` | Must differ from user JWT in production |
| `JWT_ADMIN_REFRESH_SECRET` | Strong random |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_DATABASE` / `MYSQL_USERNAME` / `MYSQL_PASSWORD` | Production DB |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | If used |
| `REDIS_REQUIRED` | `false` unless Redis is mandatory |
| `CORS_ORIGIN` | e.g. `https://maheshpcse.github.io` |
| `SOCKET_CORS_ORIGIN` | Same as SPA origin |
| `AWS_*` / `AWS_S3_BUCKET` | If uploads use S3 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed only; change default password |

Never commit `primary-service/.env`.

---

## 6. Health check endpoints

| Path | Use |
|------|-----|
| `GET /api/v1/health` | General OK + uptime (Render default) |
| `GET /api/v1/health/live` | Liveness (process up) — Docker `HEALTHCHECK` |
| `GET /api/v1/health/ready` | Readiness — MySQL ping; Redis if required |

Example:

```bash
curl -sS https://YOUR-SERVICE.onrender.com/api/v1/health
curl -sS https://YOUR-SERVICE.onrender.com/api/v1/health/ready
```

---

## 7. Commit & push deployment files

```bash
cd "path/to/Chat System"
git status
git add .github/workflows/node.yml docker-compose.yml DEPLOYMENT.md \
  primary-service/Dockerfile primary-service/.dockerignore \
  primary-service/ecosystem.config.js primary-service/render.yaml \
  primary-service/jest.config.js primary-service/.eslintrc.js \
  primary-service/tests primary-service/src/routes/index.js
git commit -m "ci: add Node CI/CD, Docker, PM2, Render blueprint, health probes"
git push origin main
```

---

## 8. How Actions start after push

1. Push to `main` on `chat-system`.  
2. Path filter matches `primary-service/**` (or workflow file).  
3. GitHub starts **Node CI/CD**.  
4. On success + main push → deploy job hits Render hook → Render pulls/builds/starts.  

If only `analytics-service` changes, this workflow **skips** (path filter).

---

## 9. Monitor logs

### GitHub Actions
1. https://github.com/maheshpcse/chat-system/actions  
2. Open **Node CI/CD** run → jobs **Lint, Test & Package** / **Deploy to Render**.  

### Render
1. Render Dashboard → **chat-primary-service** → **Logs** / **Events**.  
2. Watch build command output and runtime crashes.  

---

## 10. Troubleshoot failed deployments

| Symptom | Cause | Fix |
|---------|-------|-----|
| ESLint fails | Code style / undefined vars | Run `npm run lint` in `primary-service` |
| Jest fails | Assertion/module load | Run `npm test`; check env stubs |
| Docker smoke fails | Dockerfile/native bcrypt | Build locally: `docker build -f primary-service/Dockerfile primary-service` |
| Deploy hook 401/404 | Bad/rotated hook URL | New hook in Render; update secret |
| App crash on boot | Missing JWT/MySQL env | Fill Render env from `.env.example` |
| Health 503 ready | MySQL down/firewall | Check DB host, user, security group |
| CORS errors in browser | Origin mismatch | Set `CORS_ORIGIN` + `SOCKET_CORS_ORIGIN` to Pages URL |
| Socket fail | Wrong `socketUrl` or CORS | Align FE `environment.prod.ts` with API host |
| Free Render spin-down | Cold start | First request slow; upgrade plan for prod |
| Migrations missing | Schema not applied | Run `npm run db:migrate` against prod DB |

---

## 11. Rollback strategy (backend)

1. **Render:** Dashboard → **Events** → redeploy previous successful deploy.  
2. **Git:**  
   ```bash
   git revert HEAD
   git push origin main
   ```  
   CI redeploys last good code.  
3. **DB:** Prefer forward migrations; for emergency `npm run db:migrate:rollback` (test first).  
4. **PM2/VPS:**  
   ```bash
   git checkout <good-sha>
   npm ci --omit=dev
   pm2 reload ecosystem.config.js --env production
   ```  
5. **Docker Compose:** keep prior image tag; `docker compose up -d` with old image.  

Always backup MySQL before destructive rollback.

---

## 12. docker-compose (local / single VPS)

```bash
cp primary-service/.env.example primary-service/.env
# edit MYSQL_* passwords; set JWT secrets
docker compose up -d --build
curl -sS http://localhost:3000/api/v1/health
```

Applies `Table-schemas.sql` on first MySQL init. Still run stored procedures / seeds as your process requires (`Table-SPs.sql`).

---

## 13. PM2 (VPS)

```bash
cd primary-service
npm ci --omit=dev
# export or systemd EnvironmentFile for secrets
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
pm2 logs chat-primary-service
```

Put Nginx reverse proxy in front (TLS termination) → `http://127.0.0.1:3000`.

---

## 14. End-to-end CI/CD (full product)

```text
VS Code (frontend chat-app)
  commit/push main
       → GitHub Actions angular.yml
       → GitHub Pages (SPA)

VS Code (backend chat-system)
  commit/push main (primary-service changes)
       → GitHub Actions node.yml
       → lint + jest + docker smoke
       → Render Deploy Hook
       → Render build/start
       → Health /api/v1/health

Browser
  https://maheshpcse.github.io/chat-app/
       → HTTPS REST + Socket.IO
       → https://<render-service>.onrender.com
```

### Production cutover order
1. Create MySQL; run schema/migrations/SPs.  
2. Set Render env (JWT, DB, CORS to Pages origin).  
3. Deploy backend; verify `/api/v1/health` and `/health/ready`.  
4. Set `environment.prod.ts` API/socket URLs; push frontend.  
5. Verify login, chat socket, admin panel against prod.  
6. Enable branch protection: require green Actions on `main`.

---

## 15. Security best practices (backend)

- Unique strong JWT secrets; separate admin vs user secrets.  
- No `.env` in git; rotate secrets after leak.  
- MySQL least-privilege user (not root) in production.  
- `helmet`, rate limit, `hpp` already enabled — keep them.  
- Restrict CORS to real SPA origins (no `*` with credentials).  
- Prefer S3 for uploads; do not serve sensitive files publicly without auth.  
- Run as non-root in Docker (already).  
- TLS only at edge (Render/Nginx).  
- Turn off verbose Morgan logs in production (already gated).  
- Protect `main` with reviews + required CI.  
- Free Render services sleep — not ideal for production SLAs.

---

## 16. Local CI parity (optional)

```bash
cd primary-service
npm ci
npm run lint
npm test
docker build -t chat-primary-service:local .
```

Do not start long-running servers unless you intend to.
