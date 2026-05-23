# 🎓 Academic Management System — Backend API
**v6.0** | Node.js · Express · PostgreSQL · Redis · BullMQ · Docker · JWT

A production-grade academic backend API with role-based access control, full enrollment lifecycle management, Redis caching, async background job processing, structured logging, rate limiting, input validation, and idempotency.

---

## 📌 Version History

| Version | Tag | What Was Built | Status |
|---|---|---|---|
| v1.0 | `v1.0` | MongoDB + Mongoose baseline | Archived |
| v2.0 | `v2.0` | PostgreSQL migration | Stable |
| v3.0 | `v3.0` | Roles, waitlist, attendance, appeals | Stable |
| v4.0 | `v4.0` | Observability + API hardening | Stable |
| v5.0 | `v5.0` | Redis caching + idempotency | Stable |
| **v6.0** | `v6.0` | **BullMQ async jobs + PDF reports** | **Current** |

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js 18 | Server runtime |
| Framework | Express.js 5 | HTTP server + routing |
| Database | PostgreSQL 15 | Primary data store |
| Cache / Queue | Redis 7 | Response caching + job queue |
| Job Queue | BullMQ | Async background job processing |
| Email | Nodemailer + Ethereal | Mock SMTP for development |
| PDF | pdfkit | Server-side PDF generation |
| Auth | JWT | Stateless authentication |
| Password | bcryptjs | Password hashing (10 salt rounds) |
| Validation | Zod | Input validation + transformation |
| Logging | Winston + Morgan | Structured JSON logging |
| Rate Limiting | express-rate-limit | Abuse prevention |
| Containerisation | Docker + Compose | Local dev environment |

---

## 👥 Role System

| Role | Created By | Scope |
|---|---|---|
| `admin` | Auto-seeded on startup | Everything — departments, dept admins, system-wide |
| `department_admin` | Main admin | Courses + appeals in their department only |
| `faculty` | Self-register | Attendance + marks for assigned courses only |
| `student` | Self-register | Own enrollments, performance |

---

## 🗄️ Database Schema — 5 Tables

```
users          → all roles with department linkage
departments    → department lookup (code, name, created_by)
courses        → catalog with capacity, dates, status
enrollments    → student-course lifecycle (6 states)
appeals        → exception handling with full audit trail
```

### Enrollment Lifecycle — 6 States

```
                  enrollCourse()
(none) ─────────────────────────► enrolled ──dropCourse()──► dropped
(none) ── course full ──────────► waitlisted ── promoted ──► enrolled
                                      ↓
                               course ends
                                      ↓
                         attendance checked
                         < 50%  ──► disqualified ──appeal──► enrolled
                         ≥ 50%  ──► eligible for marks
                                      ↓
                              marks entered
                              < 30%  ──► failed    (retake allowed)
                              ≥ 30%  ──► completed (cannot re-enroll)
```

---

## 🔌 API Reference — 21 Endpoints

### Auth — `/api/auth`
```
POST /api/auth/register    No auth    Register user → triggers welcome email job
POST /api/auth/login       No auth    Login → JWT
```

### Admin — `/api/admin`
```
POST /api/admin/department      admin         Create department
POST /api/admin/dept-admin      admin         Create dept admin
GET  /api/admin/departments     any           List departments  ⚡ cached 1hr
GET  /api/admin/users           admin         List all users
```

### Courses — `/api/course`
```
POST   /api/course/        admin|dept_admin   Create course
GET    /api/course/        any               List courses  ⚡ cached 10min
PUT    /api/course/:id     admin|dept_admin   Update course
DELETE /api/course/:id     admin|dept_admin   Delete course
```

### Enrollments — `/api/enrollments`
```
POST   /api/enrollments/                student   Enroll (waitlist if full)  🔑 idempotent
DELETE /api/enrollments/:id/drop        student   Drop course
POST   /api/enrollments/attendance/:id  faculty   Mark attendance → warning email if < 60%
PUT    /api/enrollments/marks/:id       faculty   Enter marks  🔑 idempotent
GET    /api/enrollments/my              student   My enrollments
```

### Appeals — `/api/appeals`
```
POST /api/appeals/              student           Submit appeal
PUT  /api/appeals/:id/resolve   admin|dept_admin  Resolve (approve/reject)
GET  /api/appeals/my            student           My appeals
GET  /api/appeals/dept          dept_admin        Department appeals
```

### Performance — `/api/performance`
```
GET /api/performance/    student    Summary + per-course breakdown  ⚡ cached 5min
```

### Jobs — `/api/jobs`
```
POST /api/jobs/reports/attendance    faculty    Queue PDF report generation → returns 202 + jobId
GET  /api/jobs/:id/status            any auth   Poll job status + progress + result
```

### Health — No Auth Required
```
GET /health        Liveness  — process alive?
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
Schema applied automatically on first run via `db/init.sql`.

Verify:
```bash
docker ps
# ams_postgres   Up
# ams_redis      Up

docker exec -it ams_redis redis-cli ping
# PONG
```

### 4 — Start server

```bash
npm run dev
```

Expected:
```
Admin user created
Redis connected
Redis ready to accept commands
BullMQ queues initialised
emailWorker started — listening for jobs
reportWorker started — listening for jobs
weekly_digest job scheduled
Server running on port 5000
```

### 5 — Verify everything

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

## ⚡ Background Jobs — BullMQ

### How It Works

```
Your API (Producer)       Redis Queue (Broker)       Worker (Consumer)
─────────────────         ──────────────────         ─────────────────
controller.js             [job1, job2, ...]           emailWorker.js
queue.add(job) ─────────►  stored in Redis  ◄──────── picks up jobs
returns jobId                                          processes async
(< 5ms)                                               marks complete
```

### Jobs

| Job | Trigger | Queue | Result |
|---|---|---|---|
| `welcome_email` | User registers | emailQueue | Welcome email in Ethereal inbox |
| `attendance_warning` | Attendance < 60% | emailQueue | Warning email (deduplicated) |
| `weekly_digest` | Every Monday 9am (cron) | emailQueue | Stats email to admin |
| `attendance_report` | POST /api/jobs/reports/attendance | reportQueue | PDF in `reports/` folder |

### Retry Logic

All jobs retry with exponential backoff:
```
Attempt 1 fails → wait 1s → retry
Attempt 2 fails → wait 2s → retry
Attempt 3 fails → wait 4s → retry
All 3 fail → job marked "failed" (kept 24hrs in Redis)
```
Welcome emails use 5 attempts (more critical).

### Job Deduplication

Attendance warnings use custom job IDs (`warning:{email}:{course}`) — if a student receives multiple absences quickly, only one warning email is queued. Prevents spam.

### Viewing Emails (Development)

```
Registration or attendance warning → check server logs for previewUrl
→ "https://ethereal.email/message/..."
→ click URL → see rendered email in browser
```

### Polling Async Job Status

```bash
# 1. trigger report
POST /api/jobs/reports/attendance
Auth: FACULTY_TOKEN
Body: { "courseId": 1 }
→ 202 { "jobId": "5", "statusUrl": "/api/jobs/5/status" }

# 2. poll until complete
GET /api/jobs/5/status
→ { "status": "active",    "progress": 30 }
→ { "status": "active",    "progress": 60 }
→ { "status": "completed", "result": { "fileName": "attendance_1_123.pdf" } }
```

---

## ⚡ Caching — Redis Cache-Aside Pattern

| Endpoint | Cache Key | TTL | Invalidated By |
|---|---|---|---|
| `GET /api/course` | `courses:all` | 10 min | Any course write |
| `GET /api/course?department=CSE` | `courses:dept:CSE` | 10 min | Any course write |
| `GET /api/performance` | `performance:student:{id}` | 5 min | Marks, attendance, appeal |
| `GET /api/admin/departments` | `departments:all` | 1 hour | createDepartment |

Graceful degradation — Redis down → requests fall through to PostgreSQL transparently.

---

## 🛡️ Security & Hardening

### Rate Limits
```
All /api/ routes          100 req / 15 min
POST /api/auth/login       10 req / 15 min  ← brute force protection
POST /api/enrollments      20 req / 15 min
PUT  /enrollments/marks    30 req / 15 min
```

### Idempotency Keys (🔑)
```
Header: X-Idempotency-Key: <UUID v4>
```
Supported on enrollment and marks endpoints. Retry with same key → original response, no duplicate. Stored in Redis (24hr TTL).

### Input Validation
All POST/PUT bodies validated with Zod before hitting controllers:
```json
{ "message": "Validation failed", "errors": [{ "field": "marks", "message": "Cannot exceed 100" }] }
```

### Other
- bcrypt password hashing (10 salt rounds)
- Parameterized SQL — zero SQL injection surface
- Two-layer RBAC: role-level (middleware) + resource-level (controllers)
- Global error handler — stack traces never reach clients
- UNIQUE constraint at DB level — duplicate enrollments impossible regardless of race conditions

---

## 📊 Observability

### Structured Request Logs (every request)
```json
{
  "level": "info",
  "message": "Request handled",
  "method": "POST",
  "path": "/api/enrollments",
  "status": 201,
  "duration": "43ms",
  "userId": "5",
  "timestamp": "2025-01-15 09:23:11"
}
```

### Job Logs
```json
{ "message": "welcome_email job added",        "jobId": "1", "email": "student@test.com" }
{ "message": "emailWorker picked up job",       "jobId": "1", "jobName": "welcome_email" }
{ "message": "Welcome email sent",              "previewUrl": "https://ethereal.email/..." }
{ "message": "emailWorker job completed",       "jobId": "1" }
```

### Log Files
```
logs/combined.log  → all logs (requests, jobs, cache, info)
logs/error.log     → errors only with full stack traces
```

### Health Endpoints
```
GET /health        → { status: "ok", uptime: 3600, pid: 12345 }
GET /health/ready  → { status: "ready", checks: { database: "ok", redis: "ok" } }
```

---

## 🐳 Docker Commands

```bash
docker-compose up -d           # start PostgreSQL + Redis
docker-compose down            # stop containers
docker-compose down -v         # stop + wipe all data (fresh start)
docker ps                      # check status

# PostgreSQL
docker exec -it ams_postgres psql -U ams_user -d ams_db -c "\dt"

# Redis — inspect all keys
docker exec -it ams_redis redis-cli
  KEYS *                       # all keys (cache + jobs)
  KEYS bull:*                  # BullMQ job keys
  KEYS courses:*               # course cache keys
  TTL courses:all              # time remaining
  FLUSHALL                     # clear everything (testing only)
```

---

## 🧪 Running Tests

```bash
# v3 — all features (58 tests)
NODE_ENV=test node tests/run-tests-v3.js

# v4 — observability + hardening (48 tests)
NODE_ENV=test node tests/run-tests-phase4.js

# v5 — Redis caching (46 tests)
NODE_ENV=test node tests/run-tests-phase5.js

# v6 — BullMQ jobs (coming)
NODE_ENV=test node tests/run-tests-phase6.js
```

> `NODE_ENV=test` disables rate limiting during runs.

---

## 🗂️ Project Structure

```
server/
├── config/
│   ├── createAdmin.js         → seeds default admin
│   ├── logger.js              → Winston structured logger
│   └── redis.js               → ioredis connection + retry
├── controllers/               → business logic + SQL queries
├── db/
│   ├── index.js               → pg connection pool
│   └── init.sql               → 5-table schema + indexes
├── helpers/
│   └── cache.js               → Redis cache-aside helper
├── jobs/
│   ├── welcomeEmail.js        → add welcome_email job
│   ├── attendanceWarning.js   → add warning job (deduplicated)
│   └── weeklyDigest.js        → schedule Monday cron
├── logs/
│   ├── combined.log
│   └── error.log
├── middleware/
│   ├── authMiddleware.js      → JWT verify + role check
│   ├── errorHandler.js        → global error handler
│   ├── idempotency.js         → UUID key + Redis storage
│   ├── rateLimiter.js         → per-endpoint rate limits
│   ├── requestLogger.js       → Morgan + Winston
│   └── validate.js            → Zod validation wrapper
├── queues/
│   └── index.js               → emailQueue + reportQueue definitions
├── reports/                   → generated PDF files
├── routes/
│   ├── authRoutes.js
│   ├── adminRoutes.js
│   ├── courseRoutes.js
│   ├── enrollmentRoutes.js
│   ├── appealRoutes.js
│   ├── performanceRoutes.js
│   ├── healthRoutes.js        → /health + /health/ready
│   └── jobRoutes.js           → /api/jobs/:id/status + /api/jobs/reports/attendance
├── schemas/                   → Zod schemas
├── tests/                     → automated test scripts
├── workers/
│   ├── emailWorker.js         → welcome, warning, weekly digest
│   └── reportWorker.js        → PDF generation
├── .env
├── docker-compose.yml         → PostgreSQL + Redis
├── package.json
└── server.js                  → entry point + worker startup
```

---

## 🔑 Key Technical Decisions

**1. PostgreSQL over MongoDB**
ACID transactions required for atomic waitlist promotion (5 sequential SQL operations). Foreign keys enforce referential integrity at DB level. Compound UNIQUE on enrollments eliminates race conditions.

**2. Cache-Aside over Write-Through**
Lazy caching — only caches what's actually requested. Explicit invalidation on writes guarantees freshness. TTL is the fallback, not the primary consistency mechanism.

**3. Two Queues — emailQueue + reportQueue**
Email jobs are I/O bound (fast, high concurrency). PDF jobs are CPU bound (slow, low concurrency). Separate queues prevent slow PDF generation from blocking email delivery.

**4. Job Deduplication on Attendance Warnings**
Custom `jobId: warning:{email}:{course}` prevents multiple identical warnings when faculty marks several absences quickly. Student gets one warning, not spam.

**5. 202 Accepted for Async Operations**
PDF generation returns 202 (accepted, not yet done) with a `statusUrl` for polling. 201 would imply the resource exists immediately. 202 is the correct HTTP semantics for async operations.

**6. Idempotency Keys — Same Pattern as Stripe**
UUID keys stored in Redis (24hr TTL) allow clients to safely retry enrollment and marks entry on network failure without creating duplicates.

**7. Two-Layer RBAC**
Role-level (middleware) for action types. Resource-level (controllers) for ownership — faculty only marks their courses, students only drop their enrollments, dept admins only manage their department.

**8. Graceful Degradation Everywhere**
Redis down → cache misses (PostgreSQL serves), idempotency skipped, jobs persist (BullMQ stores in Redis). No component failure causes 500 errors — the system degrades gracefully.

---

## 📈 Upcoming

| Version | Focus |
|---|---|
| v7.0 | Multi-stage Dockerfile + GitHub Actions CI/CD + Swagger docs |

---

## 👩‍💻 Developed By

**Sahitya** — Backend Developer Intern

---

## 📄 Changelog

### v6.0 — BullMQ Background Jobs
Added BullMQ job queue using Redis. emailWorker processes welcome emails (nodemailer + Ethereal mock SMTP), attendance warnings with deduplication, and weekly Monday cron digest. reportWorker generates PDF attendance reports using pdfkit with real-time progress tracking. Job status polling endpoint returns state, progress, result. Async operations return 202 Accepted.

### v5.0 — Redis Caching
Cache-aside pattern on courses (10min), performance (5min), departments (1hr). Explicit cache invalidation on every write. Graceful degradation. Idempotency fully wired. /health/ready checks Redis. ioredis with exponential backoff retry.

### v4.0 — Observability + API Hardening
Winston structured JSON logging + Morgan request middleware. Global error handler. Liveness/readiness health endpoints. Rate limiting (global + per-endpoint). Zod validation on all POST/PUT. Idempotency key middleware.

### v3.0 — Roles + Features
Department Admin role. Department model. Course capacity + automatic waitlist promotion. Course duration + status. Daily attendance tracking. Attendance-gated marks entry (50% threshold). Student appeals with admin override. 6-state enrollment state machine.

### v2.0 — PostgreSQL Migration
Full migration from MongoDB. Normalized 5-table schema. Foreign keys (RESTRICT, CASCADE, SET NULL). Compound UNIQUE on enrollments. ACID transactions. Docker Compose. Typo bug fix.

### v1.0 — MongoDB Baseline
MongoDB + Mongoose. JWT auth + RBAC. 3 roles, 9 endpoints.