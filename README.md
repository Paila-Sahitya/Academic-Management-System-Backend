# 🎓 Academic Management System — v4.0

A role-based academic backend API built with Node.js, Express, and PostgreSQL.
Covers department management, course capacity with waitlists, attendance tracking, marks entry, an appeals system, request logging, health checks, rate limiting, input validation, and safe retries.

---

## 📌 Versions

| Version | Branch | Database | Status |
|---|---|---|---|
| v1.0 | `v1` | MongoDB + Mongoose | Stable, archived |
| v2.0 | `v2` | PostgreSQL + pg | Stable, archived |
| v3.0 | `v3` | PostgreSQL + pg | Stable, archived |
| v4.0 | `main` | PostgreSQL + pg | Current |

---

## 🚀 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL 15 |
| DB Client | node-postgres (pg) |
| Auth | JWT (jsonwebtoken) |
| Password Hashing | bcryptjs |
| Logging | Winston + Morgan |
| Input Validation | Zod |
| Rate Limiting | express-rate-limit |
| Idempotency Cache | Redis |
| Containerisation | Docker + Docker Compose |
| Testing | Postman |

---

## 👥 Roles & Permissions

| Feature | Admin | Dept Admin | Faculty | Student |
|---|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ | ✅ |
| Create Department | ✅ | ❌ | ❌ | ❌ |
| Create Dept Admin | ✅ | ❌ | ❌ | ❌ |
| View All Users | ✅ | ❌ | ❌ | ❌ |
| Create Course | ✅ | ✅ own dept | ❌ | ❌ |
| Edit Course | ✅ | ✅ own dept | ❌ | ❌ |
| Delete Course | ✅ | ✅ own dept | ❌ | ❌ |
| View Courses | ✅ | ✅ | ✅ | ✅ |
| Enroll in Course | ❌ | ❌ | ❌ | ✅ |
| Drop Course | ❌ | ❌ | ❌ | ✅ |
| Mark Attendance | ❌ | ❌ | ✅ own course | ❌ |
| Enter Marks | ❌ | ❌ | ✅ own course | ❌ |
| Submit Appeal | ❌ | ❌ | ❌ | ✅ |
| Resolve Appeal | ✅ | ✅ own dept | ❌ | ❌ |
| View My Enrollments | ❌ | ❌ | ❌ | ✅ |
| View Performance | ❌ | ❌ | ❌ | ✅ |

---

## 📁 Project Structure

```
server/
├── config/
│   ├── createAdmin.js            → seeds default admin on startup
│   └── logger.js                 → Winston structured logging setup
├── controllers/
│   ├── adminController.js        → departments, dept admin creation, user listing
│   ├── appealController.js       → submit, resolve, view appeals
│   ├── authController.js         → register, login
│   ├── courseController.js       → create, list, update, delete courses
│   ├── enrollmentController.js   → enroll, drop, attendance, marks
│   └── performanceController.js  → performance summary
├── db/
│   ├── index.js                  → pg connection pool
│   └── init.sql                  → full PostgreSQL schema
├── middleware/
│   ├── authMiddleware.js         → JWT protect + role authorize
│   ├── errorHandler.js           → global error handler
│   ├── idempotency.js            → idempotency key middleware (Redis)
│   ├── rateLimiter.js            → per-endpoint rate limit configs
│   ├── requestLogger.js          → Morgan + Winston request logging
│   └── validate.js               → Zod validation wrapper
├── routes/
│   ├── adminRoutes.js
│   ├── appealRoutes.js
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── enrollmentRoutes.js
│   ├── healthRoutes.js           → /health + /health/ready
│   └── performanceRoutes.js
├── schemas/
│   ├── adminSchemas.js
│   ├── appealSchemas.js
│   ├── authSchemas.js
│   ├── courseSchemas.js
│   └── enrollmentSchemas.js
├── logs/
│   ├── combined.log              → all logs (info + warn + error)
│   └── error.log                 → errors only
├── .env                          → environment variables (not committed)
├── .gitignore
├── docker-compose.yml            → runs PostgreSQL + Redis locally
├── package.json
└── server.js                     → entry point
```

---

## ⚙️ Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## 🛠️ Local Setup

### 1 — Clone the repository

```bash
git clone https://github.com/your-username/academic-management-system.git
cd academic-management-system/server
git checkout main
```

### 2 — Install dependencies

```bash
npm install
```

### 3 — Create `.env` file

```env
PORT=5000
JWT_SECRET=your_jwt_secret_here

DB_HOST=127.0.0.1
DB_PORT=5433
DB_NAME=ams_db
DB_USER=ams_user
DB_PASSWORD=ams1234

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

> **Note:** Port `5433` is used to avoid conflicts with any existing local PostgreSQL installation.

### 4 — Start PostgreSQL and Redis with Docker

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container and a Redis container. PostgreSQL automatically runs `db/init.sql` to create all tables and indexes on first startup.

Verify containers are running:
```bash
docker ps
```

Verify tables were created:
```bash
docker exec -it ams_postgres psql -U ams_user -d ams_db -c "\dt"
```

Expected output:
```
 public | appeals     | table | ams_user
 public | courses     | table | ams_user
 public | departments | table | ams_user
 public | enrollments | table | ams_user
 public | users       | table | ams_user
```

### 5 — Start the server

```bash
npm run dev
```

Expected output:
```
Admin user created
Server running on port 5000
```

> On subsequent starts: `Admin already exists` — this is expected.

---

## 🗄️ Database Schema

### users
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password | VARCHAR(255) | NOT NULL |
| role | VARCHAR(20) | NOT NULL, DEFAULT 'student', CHECK IN ('admin','department_admin','faculty','student') |
| department | VARCHAR(20) | DEFAULT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### departments
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| code | VARCHAR(20) | NOT NULL, UNIQUE |
| created_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |

### courses
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| course_name | VARCHAR(150) | NOT NULL |
| course_code | VARCHAR(20) | NOT NULL, UNIQUE |
| instructor | INTEGER | NOT NULL, REFERENCES users(id) ON DELETE RESTRICT |
| department | VARCHAR(20) | — |
| max_students | INTEGER | NOT NULL, DEFAULT 60 |
| current_count | INTEGER | NOT NULL, DEFAULT 0 |
| start_date | DATE | — |
| end_date | DATE | — |
| total_classes | INTEGER | — |
| created_at | TIMESTAMP | DEFAULT NOW() |

### enrollments
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| student_id | INTEGER | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| course_id | INTEGER | NOT NULL, REFERENCES courses(id) ON DELETE CASCADE |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'enrolled', CHECK IN ('enrolled','waitlisted','dropped','disqualified','failed','completed') |
| waitlist_position | INTEGER | DEFAULT NULL |
| marks | INTEGER | DEFAULT NULL |
| attended_classes | INTEGER | NOT NULL, DEFAULT 0 |
| is_eligible | BOOLEAN | NOT NULL, DEFAULT true |
| is_retake_eligible | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMP | DEFAULT NOW() |
| — | — | UNIQUE (student_id, course_id) |

### appeals
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| student_id | INTEGER | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| enrollment_id | INTEGER | NOT NULL, REFERENCES enrollments(id) ON DELETE CASCADE |
| course_id | INTEGER | NOT NULL, REFERENCES courses(id) ON DELETE CASCADE |
| reason | TEXT | NOT NULL |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'pending', CHECK IN ('pending','approved','rejected') |
| admin_note | TEXT | — |
| resolved_by | INTEGER | REFERENCES users(id) ON DELETE SET NULL |
| override_eligibility | BOOLEAN | DEFAULT false |
| override_marks | INTEGER | DEFAULT NULL |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | DEFAULT NOW() |

---

## 🔌 API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{ name, email, password, role }` | Register user |
| POST | `/api/auth/login` | No | `{ email, password }` | Login, receive JWT |

### Admin — `/api/admin`

| Method | Endpoint | Auth | Role | Body | Description |
|---|---|---|---|---|---|
| POST | `/api/admin/department` | Yes | Admin | `{ name, code }` | Create department |
| POST | `/api/admin/dept-admin` | Yes | Admin | `{ name, email, password, department }` | Create dept admin |
| GET | `/api/admin/departments` | Yes | Any | — | List all departments |
| GET | `/api/admin/users` | Yes | Admin | — | List all users |

### Courses — `/api/course`

| Method | Endpoint | Auth | Role | Body | Description |
|---|---|---|---|---|---|
| POST | `/api/course/` | Yes | Admin, Dept Admin | `{ courseName, courseCode, instructor, department, maxStudents, startDate, endDate, totalClasses }` | Create course |
| GET | `/api/course/` | Yes | Any | — | List all courses (with derived status) |
| PUT | `/api/course/:id` | Yes | Admin, Dept Admin | `{ maxStudents, startDate, endDate, totalClasses }` | Update course |
| DELETE | `/api/course/:id` | Yes | Admin, Dept Admin | — | Delete course |

### Enrollments — `/api/enrollments`

| Method | Endpoint | Auth | Role | Headers | Body | Description |
|---|---|---|---|---|---|---|
| POST | `/api/enrollments/` | Yes | Student | `X-Idempotency-Key: <uuid>` | `{ courseId }` | Enroll in course (or join waitlist) |
| DELETE | `/api/enrollments/:id/drop` | Yes | Student | — | — | Drop course (triggers waitlist promotion) |
| POST | `/api/enrollments/attendance/:id` | Yes | Faculty | — | `{ present: true/false }` | Mark attendance |
| PUT | `/api/enrollments/marks/:id` | Yes | Faculty | `X-Idempotency-Key: <uuid>` | `{ marks }` | Enter marks (post-course, eligible students only) |
| GET | `/api/enrollments/my` | Yes | Student | — | — | My enrollments with attendance % |

### Appeals — `/api/appeals`

| Method | Endpoint | Auth | Role | Body | Description |
|---|---|---|---|---|---|
| POST | `/api/appeals/` | Yes | Student | `{ enrollmentId, reason }` | Submit appeal |
| PUT | `/api/appeals/:id/resolve` | Yes | Admin, Dept Admin | `{ status, adminNote, overrideEligibility?, overrideMarks? }` | Resolve appeal |
| GET | `/api/appeals/my` | Yes | Student | — | My appeals |
| GET | `/api/appeals/dept` | Yes | Dept Admin | — | Department's appeals |

### Performance — `/api/performance`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/performance/` | Yes | Student | Performance summary with per-course breakdown |

### Health — `/`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Liveness check — is the process alive? |
| GET | `/health/ready` | No | Readiness check — are DB and Redis reachable? |

---

## 🔄 Enrollment Lifecycle

```
                    ┌─────────────────────────────┐
                    │         ENROLL               │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┴────────────────┐
              │ Seats available?                 │
        YES   │                             NO   │
              ▼                                  ▼
         [enrolled]                        [waitlisted]
              │                                  │
              │ Drop                     Promoted when seat opens
              ▼                                  │
         [dropped] ◄──────────────────────────────┘
              │
              │ Can re-enroll
              ▼
     Attend classes
              │
     Faculty marks attendance daily
              │
     < 50% attendance?
        YES ──► [disqualified] ──► Can re-enroll or appeal
        NO  ──► is_eligible = true
              │
     Course ends
              │
     Faculty enters marks
              │
     marks < 30?
        YES ──► [failed] ──► is_retake_eligible = true ──► Can re-enroll
        NO  ──► [completed] ──► Cannot re-enroll
```

---

## 📊 Course Status (Derived from Dates)

| Condition | Status |
|---|---|
| Today < `start_date` | `upcoming` |
| `start_date` ≤ Today ≤ `end_date` | `ongoing` |
| Today > `end_date` | `completed` |

---

## 🎯 Business Logic Rules

**Enrollment Guards**
- Students with `completed` status cannot re-enroll in that course
- Students with `failed` or `disqualified` status can re-enroll
- Cannot enroll in a course that has already ended
- Capacity check and enrollment happen in a single transaction

**Waitlist Promotion**
- When a student drops, the next waitlisted student is auto-enrolled
- Remaining waitlist positions shift down by 1

**Attendance**
- Only the assigned instructor can mark attendance
- Attendance can only be marked while the course is `ongoing`
- Below 50% attendance → `is_eligible = false`

**Marks Entry**
- Can only be entered after the course end date
- Blocked if `is_eligible = false`
- `marks < 30` → status `failed`, `is_retake_eligible = true`
- `marks >= 30` → status `completed`

**Appeals**
- One pending appeal per enrollment at a time
- Dept admin can only resolve appeals for their department
- `overrideEligibility: true` restores student eligibility
- `overrideMarks` updates marks and recalculates final status

---

## 📈 Performance Grades

| Average Marks | Grade |
|---|---|
| ≥ 85 | Excellent |
| ≥ 70 | Good |
| ≥ 50 | Average |
| < 50 | Needs Improvement |

Only `completed` enrollments are counted in averages. Dropped, waitlisted, and ongoing courses are excluded.

---

## 🔐 Authentication

All protected routes require a JWT in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens expire after 24 hours.

**Default admin account (created on first startup):**
```
Email:    admin@system.com
Password: admin123
```

---

## 🛡️ What v4.0 Added

### Logging — Winston + Morgan

Every request is logged as JSON:

```json
{
  "level": "info",
  "method": "POST",
  "path": "/api/enrollments",
  "status": 201,
  "duration": "43ms",
  "userId": "5",
  "timestamp": "2025-01-15 09:23:11"
}
```

- `logs/combined.log` — all requests
- `logs/error.log` — errors only (5xx responses)

### Health Endpoints

| Endpoint | What it checks |
|---|---|
| `GET /health` | Is the server process running? |
| `GET /health/ready` | Are the database and Redis reachable? |

No authentication required on either endpoint.

### Rate Limiting

Requests are limited per IP. Limits are disabled during tests (`NODE_ENV=test`).

| Applied To | Limit |
|---|---|
| All `/api/` routes | 100 / 15 min |
| `POST /api/auth/login` | 10 / 15 min |
| `POST /api/enrollments` | 20 / 15 min |
| `PUT /api/enrollments/marks` | 30 / 15 min |
| `POST /api/enrollments/attendance` | 60 / 15 min |

### Input Validation — Zod

All `POST` and `PUT` bodies are validated before reaching a controller. Invalid requests return `400` with all failing fields at once:

```json
{
  "message": "Validation failed",
  "errors": [
    { "field": "courseId", "message": "courseId is required" },
    { "field": "marks",    "message": "marks cannot exceed 100" }
  ]
}
```

### Error Handling

All errors are caught in one place (`errorHandler.js`). `5xx` responses always return `"Internal server error"` — the real error is written to `error.log` only. `4xx` responses return the actual message.

### Safe Retries

`POST /api/enrollments` and `PUT /api/enrollments/marks` accept an `X-Idempotency-Key` header. If a request is retried with the same key, the original response is returned from Redis instead of processing again — preventing duplicate enrollments on network failure.

```
X-Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
```

Keys expire after 24 hours. If Redis is unavailable, the header is ignored and the request proceeds normally.

---

## 🔒 Security

- Passwords hashed with bcrypt (10 salt rounds)
- JWT tokens expire after 24 hours
- Parameterized queries throughout (no SQL injection)
- Role and department-scoped access on every endpoint
- `.env` excluded from version control
- UNIQUE constraints at DB level prevent duplicate enrollments
- Transactions used for enrollment and drop operations
- Rate limiting on auth and sensitive endpoints
- All input validated before hitting the database
- Stack traces never sent to clients

---

## 🐳 Docker Commands

```bash
docker-compose up -d          # start PostgreSQL + Redis containers
docker-compose down           # stop containers
docker-compose down -v        # stop + delete all data (fresh start)
docker ps                     # check container status
docker logs ams_postgres      # view PostgreSQL logs

# Connect to database directly
docker exec -it ams_postgres psql -U ams_user -d ams_db

# Useful psql commands
\dt          # list tables
\d users     # describe users table
\q           # quit
```

---

## 📄 Changelog

### v4.0 — Logging, Validation & Reliability
- Request logging with Winston + Morgan (JSON format, written to file)
- Health endpoints: `GET /health` and `GET /health/ready`
- Global error handler with consistent response format
- Per-endpoint rate limiting
- Zod validation on all POST/PUT request bodies
- Safe retry support on enrollment and marks endpoints via idempotency keys (Redis)
- Redis added to Docker Compose

### v3.0 — Business Logic & Roles
- `department_admin` role with department-scoped permissions
- `departments` table and admin management endpoints
- `appeals` table and full appeals workflow
- Courses: capacity, waitlist, dates, total classes
- Enrollment lifecycle: waitlist, drop, promotion, re-enrollment rules
- Attendance tracking with eligibility calculation (< 50% → disqualified)
- Marks entry requires course completion + 50% attendance
- Failed students (< 30 marks) marked retake-eligible
- Performance endpoint updated: per-course breakdown with attendance %
- 19 endpoints, 58-test Postman suite

### v2.0 — PostgreSQL Migration
- Switched from MongoDB to PostgreSQL
- Replaced Mongoose with node-postgres (pg)
- Added Docker + Docker Compose
- Normalized schema with foreign keys and indexes
- Fixed typo in performance grading logic (`performace` → `performance`)

### v1.0 — Initial Release
- MongoDB + Mongoose implementation
- JWT authentication with role-based access control
- Course, enrollment, and performance management

---

## 👩‍💻 Developed By

**Sahitya**