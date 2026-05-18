# 🎓 Academic Management System — Backend API
**v5.0** | Node.js · Express · PostgreSQL · Redis · Docker · JWT

A production-grade academic backend API with role-based access control, full enrollment lifecycle management, Redis caching, structured logging, rate limiting, input validation, and idempotency.

---

## 📌 Version History

| Version | Tag | What Was Built | Status |
|---|---|---|---|
| v1.0 | `v1.0` | MongoDB + Mongoose baseline | Archived |
| v2.0 | `v2.0` | PostgreSQL migration | Stable |
| v3.0 | `v3.0` | Roles, waitlist, attendance, appeals | Stable |
| v4.0 | `v4.0` | Observability + API hardening | Stable |
| **v5.0** | `v5.0` | **Redis caching + idempotency** | **Current** |

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 18 | Server runtime |
| Framework | Express.js 5 | HTTP server + routing |
| Database | PostgreSQL 15 | Primary data store |
| Cache | Redis 7 | Response caching + idempotency |
| Auth | JWT | Stateless authentication |
| Password | bcryptjs | Password hashing |
| Validation | Zod | Input validation + transformation |
| Logging | Winston + Morgan | Structured JSON logging |
| Rate Limiting | express-rate-limit | Abuse prevention |
| Containerisation | Docker + Compose | Local dev environment |

---

## 👥 Role System

| Role | Created By | Can Do |
|---|---|---|
| `admin` | Auto-seeded | Everything — departments, dept admins, system-wide |
| `department_admin` | Main admin | Courses + appeals in their department only |
| `faculty` | Self-register | Attendance + marks for their assigned courses only |
| `student` | Self-register | Own enrollments, own performance |

---

## 🗄️ Database Schema — 5 Tables

```
users          → all roles (admin, department_admin, faculty, student)
departments    → department lookup (code, name, created_by)
courses        → catalog with capacity, dates, status
enrollments    → student-course relationship + attendance + marks + lifecycle
appeals        → exception handling with full audit trail
```

### Enrollment Lifecycle — 6 States

```
(none) ──enrollCourse()──► enrolled ──dropCourse()──► dropped
(none) ──course full──────► waitlisted ──promoted──►  enrolled
enrolled ──course ends──► attendance checked
    < 50% ──► disqualified ──appeal──► enrolled (override)
    ≥ 50% ──► marks entered
        < 30%  ──► failed    (retake allowed)
        ≥ 30%  ──► completed (cannot re-enroll)
```

---

## 🔌 API Reference — 19 Endpoints

### Auth
```
POST /api/auth/register    No auth    Register user
POST /api/auth/login       No auth    Login → JWT
```

### Admin
```
POST /api/admin/department     admin         Create department
POST /api/admin/dept-admin     admin         Create dept admin
GET  /api/admin/departments    any           List departments  ⚡ cached 1hr
GET  /api/admin/users          admin         List all users
```

### Courses
```
POST   /api/course/        admin|dept_admin  Create course
GET    /api/course/        any              List courses  ⚡ cached 10min
PUT    /api/course/:id     admin|dept_admin  Update course
DELETE /api/course/:id     admin|dept_admin  Delete course
```

### Enrollments
```
POST   /api/enrollments/                student   Enroll (waitlist if full)  🔑 idempotent
DELETE /api/enrollments/:id/drop        student   Drop course
POST   /api/enrollments/attendance/:id  faculty   Mark attendance (present/absent)
PUT    /api/enrollments/marks/:id       faculty   Enter marks  🔑 idempotent
GET    /api/enrollments/my              student   My enrollments
```

### Appeals
```
POST /api/appeals/              student           Submit appeal
PUT  /api/appeals/:id/resolve   admin|dept_admin  Resolve (approve/reject)
GET  /api/appeals/my            student           My appeals
GET  /api/appeals/dept          dept_admin        Dept appeals
```

### Performance
```
GET /api/performance/    student    Summary + per-course breakdown  ⚡ cached 5min
```

### Health (no auth)
```
GET /health        Liveness  — is process alive?
GET /health/ready  Readiness — DB + Redis connected?
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## 🛠️ Setup — One Command After Clone

### 1 — Clone + install

```bash
git clone https://github.com/Paila-Sahitya/Academic-Management-System-Backend.git
cd Academic-Management-System-Backend
npm install
```

### 2 — Create `.env`

```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
LOG_LEVEL=info

DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ams_db
DB_USER=ams_user
DB_PASSWORD=ams1234

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 3 — Start services

```bash
docker-compose up -d
```

Starts PostgreSQL 15 (port 5433) + Redis 7 (port 6379).
Schema applied automatically via `db/init.sql` on first run.

### 4 — Start server

```bash
npm run dev
```

Expected:
```
Admin user created
Redis connected
Redis ready to accept commands
Server running on port 5000
```

### 5 — Verify

```bash
curl http://localhost:5000/health/ready
```

Expected:
```json
{
  "status": "ready",
  "checks": {
    "database": { "status": "ok", "responseTime": "4ms" },
    "redis":    { "status": "ok", "responseTime": "1ms" }
  }
}
```

**Default admin:** `admin@system.com` / `admin123`

---

## ⚡ Caching — Redis Cache-Aside Pattern

| Endpoint | Cache Key | TTL | Invalidated By |
|---|---|---|---|
| `GET /api/course` | `courses:all` | 10 min | create, update, delete course |
| `GET /api/course?department=CSE` | `courses:dept:CSE` | 10 min | create, update, delete course |
| `GET /api/performance` | `performance:student:{id}` | 5 min | marks, attendance, appeal resolve |
| `GET /api/admin/departments` | `departments:all` | 1 hour | createDepartment |

Graceful degradation — if Redis unavailable, requests fall through to PostgreSQL transparently. No 500 errors.

---

## 🛡️ Security & Hardening

### Rate Limits
```
All /api/ routes          100 req / 15 min
POST /api/auth/login       10 req / 15 min  (brute force protection)
POST /api/enrollments      20 req / 15 min
PUT  /enrollments/marks    30 req / 15 min
```

### Idempotency (🔑)
```
Header: X-Idempotency-Key: <UUID v4>
```
Supported on enrollment and marks endpoints. Same key on retry → original response returned, no duplicate processing. Stored in Redis with 24-hour TTL.

### Input Validation — Zod
All POST/PUT bodies validated before hitting controllers:
```json
{ "message": "Validation failed", "errors": [{ "field": "marks", "message": "Cannot exceed 100" }] }
```

### Other
- bcrypt password hashing (10 salt rounds)
- Parameterized SQL — no SQL injection
- Two-layer RBAC (role + resource ownership)
- Global error handler — stack traces never reach client
- UNIQUE constraint at DB level — duplicate enrollments impossible

---

## 📊 Observability

**Every request logged:**
```json
{ "level": "info", "method": "POST", "path": "/api/enrollments",
  "status": 201, "duration": "43ms", "userId": "5",
  "timestamp": "2025-01-15 09:23:11" }
```

**Log files:**
```
logs/combined.log  → all logs
logs/error.log     → errors only (with stack traces)
```

---

## 🐳 Docker Commands

```bash
docker-compose up -d           # start PostgreSQL + Redis
docker-compose down            # stop
docker-compose down -v         # stop + wipe data (fresh start)
docker ps                      # check status

# PostgreSQL
docker exec -it ams_postgres psql -U ams_user -d ams_db -c "\dt"

# Redis — inspect cache
docker exec -it ams_redis redis-cli
  KEYS *          # all cached keys
  TTL courses:all # time remaining
  FLUSHALL        # clear cache (testing)
```

---

## 🧪 Tests

```bash
# v3 features — 58 tests
NODE_ENV=test node tests/run-tests-v3.js

# v4 hardening — 48 tests
NODE_ENV=test node tests/run-tests-phase4.js

# v5 Redis — caching tests
NODE_ENV=test node tests/run-tests-phase5.js
```

> `NODE_ENV=test` disables rate limiting during test runs.

---

## 🗂️ Project Structure

```
server/
├── config/
│   ├── createAdmin.js       → seeds default admin on startup
│   ├── logger.js            → Winston structured logger
│   └── redis.js             → ioredis connection + retry + events
├── controllers/             → business logic + SQL queries
├── db/
│   ├── index.js             → pg connection pool
│   └── init.sql             → 5-table schema + indexes
├── helpers/
│   └── cache.js             → get/set/del/delPattern + graceful degradation
├── logs/
│   ├── combined.log
│   └── error.log
├── middleware/
│   ├── authMiddleware.js    → JWT verify + role check
│   ├── errorHandler.js      → global error handler
│   ├── idempotency.js       → UUID key + Redis storage
│   ├── rateLimiter.js       → per-endpoint limits
│   ├── requestLogger.js     → Morgan + Winston
│   └── validate.js          → Zod wrapper
├── routes/                  → URL → middleware → controller
├── schemas/                 → Zod schemas (auth, course, enrollment, appeal, admin)
├── tests/                   → automated test scripts
├── .env
├── docker-compose.yml       → PostgreSQL + Redis
├── package.json
└── server.js                → entry point
```

---

## 🔑 Key Technical Decisions

**1. PostgreSQL over MongoDB**
Full ACID transactions required for waitlist promotion (5 sequential SQL operations). Foreign keys enforce referential integrity at DB level. Compound UNIQUE constraint on enrollments prevents race conditions impossible to solve cleanly in MongoDB.

**2. Cache-Aside over Write-Through**
Write-through caches data that may never be read and slows down writes. Cache-aside is lazy — only caches what's actually requested. Combined with explicit invalidation on every write, freshness is guaranteed without unnecessary cache population.

**3. Per-Student Performance Cache Keys**
`performance:student:{id}` means each student only sees their own data and invalidation is surgical — only the affected student's cache is deleted on marks change. Shared key would be a security risk and cause unnecessary invalidation.

**4. TTL as Safety Net**
TTLs are set long (10 min courses, 1 hour departments) because explicit invalidation handles freshness. TTL is fallback only — prevents permanently stale data if invalidation has a bug.

**5. Graceful Degradation**
Every cache operation has try/catch returning null on failure. Redis down = cache misses, not 500 errors. Cache is optimisation, not dependency.

**6. Idempotency Keys on Enrollment + Marks**
Network failures cause client retries. UUID-keyed responses in Redis with 24-hour TTL allow safe retries — same pattern as Stripe payment idempotency.

**7. Two-Layer RBAC**
Role-level (middleware) determines action types allowed. Resource-level (controllers) determines ownership — faculty marks attendance only for their courses, students drop only their own enrollments.

---

## 📈 Upcoming

| Version | Focus |
|---|---|
| v6.0 | BullMQ async jobs — emails, PDF reports, cron |
| v7.0 | Multi-stage Dockerfile + GitHub Actions CI/CD |

---

## 👩‍💻 Developed By

**Sahitya** — Backend Developer Intern

---

## 📄 Changelog

### v5.0 — Redis Caching
Added Redis 7 to Docker Compose. Cache-aside pattern on courses, performance, departments. Explicit cache invalidation on every write. Graceful degradation. Idempotency fully wired. /health/ready checks Redis. ioredis with exponential backoff retry.

### v4.0 — Observability + API Hardening
Winston structured JSON logging + Morgan request middleware. Global error handler. Liveness/readiness health endpoints. Rate limiting (global + per-endpoint). Zod validation on all POST/PUT. Idempotency middleware.

### v3.0 — Roles + Features
Department Admin role. Department model. Course capacity + automatic waitlist promotion. Course duration + status. Daily attendance tracking. Attendance-gated marks entry. Student appeals with admin override. 6-state enrollment state machine. Re-enrollment rules.

### v2.0 — PostgreSQL Migration
Full migration from MongoDB. 5-table normalized schema. Foreign keys (RESTRICT, CASCADE, SET NULL). Compound UNIQUE on enrollments. ACID transactions. Docker Compose. Typo bug fix in performance grading.

### v1.0 — MongoDB Baseline
MongoDB + Mongoose. JWT auth + RBAC. Basic course, enrollment, performance. 3 roles, 9 endpoints.