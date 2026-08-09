# =============================================================================
# Monorepo-root image for Railway / platforms that build from repo root.
# Context: Chat System/  (NOT primary-service/)
#   docker build -t chat-primary-service -f Dockerfile .
# Prefer Root Directory = primary-service when the platform supports it.
# =============================================================================

FROM node:18-alpine AS deps
WORKDIR /app

# native modules (bcrypt) need build tools on alpine
RUN apk add --no-cache python3 make g++

COPY primary-service/package.json primary-service/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- runtime ----
FROM node:18-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    APP_ENV=production \
    APP_PORT=3000 \
    HOST=0.0.0.0

RUN apk add --no-cache tini curl \
  && addgroup -S app && adduser -S app -G app

COPY --from=deps /app/node_modules ./node_modules
COPY primary-service/package.json ./
COPY primary-service/knexfile.js ./
COPY primary-service/src ./src

RUN mkdir -p uploads logs \
  && chown -R app:app /app

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-${APP_PORT:-3000}}/api/v1/health/live" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
