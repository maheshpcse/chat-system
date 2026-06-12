# Chat System - Production-Ready Node.js Application

## Architecture Overview

A microservice-based real-time chat application built with Node.js 18, Express, MySQL, MongoDB, Redis, and Socket.IO.

---

## Project Structure

```
Chat System/
├── primary-service/              # Microservice 1 - Core Chat (MySQL)
│   ├── src/
│   │   ├── config/              # Environment, DB, Redis, Socket configs
│   │   │   ├── environment.js
│   │   │   ├── database.js      # MySQL connection pool
│   │   │   ├── redis.js         # Redis client (pub/sub + cache)
│   │   │   ├── socket.js        # Socket.IO initialization
│   │   │   └── index.js
│   │   ├── middleware/          # Reusable Express middleware
│   │   │   ├── authentication.js
│   │   │   ├── authorization.js
│   │   │   ├── validation.js
│   │   │   ├── errorHandler.js
│   │   │   ├── requestTracker.js
│   │   │   ├── rateLimiter.js
│   │   │   ├── fileUpload.js
│   │   │   └── index.js
│   │   ├── modules/             # Feature modules (MVC per module)
│   │   │   ├── authentication/
│   │   │   │   ├── authentication.controller.js
│   │   │   │   ├── authentication.service.js
│   │   │   │   ├── authentication.repository.js
│   │   │   │   ├── authentication.validation.js
│   │   │   │   ├── authentication.routes.js
│   │   │   │   └── index.js
│   │   │   ├── user/
│   │   │   │   ├── user.controller.js
│   │   │   │   ├── user.service.js
│   │   │   │   ├── user.repository.js
│   │   │   │   ├── user.validation.js
│   │   │   │   ├── user.routes.js
│   │   │   │   └── index.js
│   │   │   ├── conversation/
│   │   │   ├── message/
│   │   │   ├── group/
│   │   │   ├── upload/
│   │   │   ├── notification/
│   │   │   ├── cache/
│   │   │   ├── audit/
│   │   │   └── analytics/
│   │   ├── services/            # External service integrations
│   │   │   └── aws/
│   │   │       ├── s3.service.js
│   │   │       ├── secretsManager.service.js
│   │   │       ├── parameterStore.service.js
│   │   │       ├── sns.service.js
│   │   │       ├── sqs.service.js
│   │   │       └── index.js
│   │   ├── socket/              # WebSocket event handlers
│   │   │   └── socketHandler.js
│   │   ├── workers/             # Worker threads for CPU tasks
│   │   │   ├── workerManager.js
│   │   │   ├── fileProcessor.worker.js
│   │   │   ├── chatExport.worker.js
│   │   │   └── analytics.worker.js
│   │   ├── utils/               # Shared utilities
│   │   │   ├── logger.js
│   │   │   ├── response.js
│   │   │   ├── errors.js
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   ├── patterns.js     # Currying, Closures, HOF examples
│   │   │   └── index.js
│   │   ├── routes/              # Central route registry
│   │   │   └── index.js
│   │   ├── database/            # Database scripts
│   │   │   └── mysql/
│   │   │       ├── schema/
│   │   │       │   └── 001_create_tables.sql
│   │   │       └── procedures/
│   │   │           ├── 001_auth_user_procedures.sql
│   │   │           ├── 002_chat_message_procedures.sql
│   │   │           └── 003_group_procedures.sql
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Bootstrap & start
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   └── package.json
│
└── analytics-service/            # Microservice 2 - Analytics (MongoDB)
    ├── src/
    │   ├── models/
    │   │   └── index.js         # Mongoose schemas
    │   └── server.js
    └── package.json
```

---

## Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 18.13.0 | JavaScript runtime |
| Framework | Express | 4.18.x | HTTP framework |
| WebSocket | Socket.IO | 4.6.x | Real-time communication |
| Primary DB | MySQL | 8.x | Transactional data |
| Analytics DB | MongoDB | 6.x | Archival & search |
| Cache | Redis (ioredis) | 5.x | Caching & pub/sub |
| Auth | JWT + bcrypt | 9.x + 5.x | Authentication |
| Validation | Joi | 17.x | Schema validation |
| AWS | @aws-sdk v3 | 3.450+ | Cloud services |
| Logging | Winston | 3.x | Structured logging |

---

## API Endpoints

### Authentication (`/api/v1/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /register | Create new account |
| POST | /login | Authenticate user |
| POST | /refresh-token | Refresh access token |
| POST | /logout | Revoke refresh token |
| POST | /change-password | Update password |

### Users (`/api/v1/users`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /me | Get own profile |
| GET | /search | Search users |
| GET | /:userId | Get user profile |
| PUT | /me | Update own profile |

### Conversations (`/api/v1/conversations`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Create conversation |
| GET | / | List conversations |
| GET | /:conversationId | Get conversation |

### Messages (`/api/v1/messages`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Send message |
| GET | /unread | Get unread count |
| GET | /:conversationId | Get messages |
| PUT | /:conversationId/read | Mark as read |
| DELETE | /:messageId | Delete message |

### Groups (`/api/v1/groups`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | / | Create group |
| GET | / | List user groups |
| GET | /:groupId | Get group details |
| PUT | /:groupId | Update group |
| POST | /:groupId/members | Add member |
| DELETE | /:groupId/members/:userId | Remove member |

### Uploads (`/api/v1/uploads`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /local | Upload to local storage |
| POST | /s3 | Upload to S3 |
| GET | /download | Get download URL |

---

## Key Design Patterns Demonstrated

### 1. Currying (src/utils/patterns.js, src/middleware/authorization.js)
- Permission validation: `checkPermission("group")("read")(user)`
- Query building: `buildMessageFilter(convId)(type)(dateRange)`
- Cache wrapper: `cacheService.createCacheWrapper(prefix, ttl)`

### 2. Closures (src/utils/patterns.js, src/modules/notification/)
- Message throttling with private state
- Audit logger with captured module context
- Notification sender with enclosed channel config

### 3. Higher Order Functions (src/middleware/, src/utils/patterns.js)
- `authorize(...roles)` → returns middleware
- `validate(schema)` → returns middleware
- `withRetry(fn, retries, delay)` → returns enhanced function
- `createMessagePipeline(...transformers)` → returns pipeline

### 4. Event Emitters (src/modules/notification/, src/middleware/requestTracker.js)
- Chat event bus for decoupled side effects
- Request audit emitter for async logging
- Notification emitter for multi-channel delivery

### 5. Promises & Async/Await (throughout)
- Parallel data loading with `Promise.all`
- Batch processing with `Promise.allSettled`
- Graceful shutdown with async cleanup

---

## Redis Cache Strategy

### What We Cache
| Data | Key Pattern | TTL | Invalidation |
|------|-------------|-----|-------------|
| User Profile | `user:profile:{userId}` | 1h | On profile update |
| Online Status | `user:online:{userId}` | 5m | On connect/disconnect |
| Conversations | `conversation:{id}` | 30m | On new message |
| Recent Messages | `messages:recent:{convId}` | 15m | On send/delete |
| Typing Indicator | `typing:{convId}:{userId}` | 10s | Auto-expire |

### Invalidation Strategy
1. **TTL-based**: All cached data has automatic expiration
2. **Write-through**: Cache invalidated immediately on write operations
3. **Event-driven**: Domain events trigger targeted invalidation
4. **Pattern-based**: `SCAN` + `DEL` for bulk invalidation (never `KEYS *`)

---

## Worker Threads

### Why Worker Threads?
Node.js is single-threaded. CPU-intensive operations block the event loop, making the server unresponsive. Worker threads run parallel JavaScript threads.

### Workers in This Project
| Worker | Purpose | Trigger |
|--------|---------|---------|
| fileProcessor | Checksums, metadata, compression | File upload |
| chatExport | CSV/JSON/TXT export of messages | User request |
| analytics | Message stats, peak hours, activity | Scheduled/on-demand |

---

## Development Roadmap

### Phase 1: Setup ✅
- [x] Project structure
- [x] Configuration management
- [x] Environment variables

### Phase 2: Database ✅
- [x] MySQL schema with indexes and FKs
- [x] All stored procedures
- [x] MongoDB collections with indexes

### Phase 3: Core Infrastructure ✅
- [x] Middleware stack
- [x] Error handling
- [x] Logger
- [x] Response utilities

### Phase 4: Authentication ✅
- [x] Registration / Login
- [x] JWT access + refresh tokens
- [x] Password hashing (bcrypt)
- [x] Role-based authorization

### Phase 5: Chat Features ✅
- [x] Conversations (private)
- [x] Messages (send, get, delete)
- [x] Groups (create, manage, members)
- [x] Read receipts
- [x] File uploads

### Phase 6: Real-time ✅
- [x] Socket.IO handlers
- [x] Online/offline status
- [x] Typing indicators
- [x] Real-time message delivery

### Phase 7: Caching & Performance ✅
- [x] Redis cache layer
- [x] Cache invalidation strategy
- [x] Worker threads

### Phase 8: AWS Integration ✅
- [x] S3 (upload/download/presigned URLs)
- [x] Secrets Manager
- [x] Parameter Store (SSM)
- [x] SNS (notifications skeleton)
- [x] SQS (queue processing skeleton)

### Phase 9: Next Steps (TODO)
- [ ] Unit & integration tests
- [ ] Docker & docker-compose
- [ ] CI/CD pipeline
- [ ] API documentation (Swagger)
- [ ] WebSocket authentication refresh
- [ ] Message encryption (end-to-end)
- [ ] Push notifications (FCM)
- [ ] Admin dashboard APIs

---

## Getting Started

```bash
# 1. Clone and install
cd primary-service
npm install

# 2. Setup MySQL database
mysql -u root -p < src/database/mysql/schema/001_create_tables.sql
mysql -u root -p < src/database/mysql/procedures/001_auth_user_procedures.sql
mysql -u root -p < src/database/mysql/procedures/002_chat_message_procedures.sql
mysql -u root -p < src/database/mysql/procedures/003_group_procedures.sql

# 3. Setup Redis (must be running)
# redis-server

# 4. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 5. Start the server
npm run dev

# 6. Start analytics service
cd ../analytics-service
npm install
npm run dev
```

---

## Production Best Practices Applied

1. **Security**: Helmet, CORS, HPP, rate limiting, JWT rotation, bcrypt
2. **Error Handling**: Centralized error handler, custom error classes, operational vs programming errors
3. **Logging**: Structured JSON logging, log rotation, request correlation IDs
4. **Performance**: Connection pooling, Redis caching, compression, worker threads
5. **Reliability**: Graceful shutdown, unhandled rejection handling, retry logic
6. **Scalability**: Stateless design, Redis pub/sub for multi-instance, modular architecture
7. **Maintainability**: MVC per module, service/repository separation, consistent naming
8. **Database**: Stored procedures (SQL injection prevention), proper indexing, foreign keys
