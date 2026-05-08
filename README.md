# 🎓 Academic Management System — v3.0

A secure, role-based academic backend API built with Node.js, Express, and PostgreSQL.
Features a full business logic layer including department management, course capacity with waitlists, daily attendance tracking, eligibility-gated marks entry, and an appeals system.

---

## 📌 Versions

| Version | Branch | Database | Status |
|---|---|---|---|
| v1.0 | `v1` | MongoDB + Mongoose | Stable, archived |
| v2.0 | `v2` | PostgreSQL + pg | Stable, archived |
| v3.0 | `main` | PostgreSQL + pg | Current |

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
│   └── createAdmin.js            → seeds default admin on startup
├── controllers/
│   ├── adminController.js        → departments, dept admin creation, user listing
│   ├── appealController.js       → submit, resolve, view appeals
│   ├── authController.js         → register, login
│   ├── courseController.js       → create, list, update, delete courses
│   ├── enrollmentController.js   → enroll, drop, attendance, marks
│   └── performanceController.js  → performance summary
├── db/
│   ├── index.js                  → pg connection pool
│   └── init.sql                  → full PostgreSQL schema (v3)
├── middleware/
│   └── authMiddleware.js         → JWT protect + role authorize
├── routes/
│   ├── adminRoutes.js
│   ├── appealRoutes.js
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── enrollmentRoutes.js
│   └── performanceRoutes.js
├── .env                          → environment variables (not committed)
├── .gitignore
├── docker-compose.yml            → runs PostgreSQL locally
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
```

> **Note:** Port `5433` is used to avoid conflicts with any existing local PostgreSQL installation.

### 4 — Start PostgreSQL with Docker

```bash
docker-compose up -d
```

This starts a PostgreSQL 15 container and automatically runs `db/init.sql` to create all tables and indexes on first startup.

Verify the container is running:
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

| Method | Endpoint | Auth | Role | Body | Description |
|---|---|---|---|---|---|
| POST | `/api/enrollments/` | Yes | Student | `{ courseId }` | Enroll in course (or join waitlist) |
| DELETE | `/api/enrollments/:id/drop` | Yes | Student | — | Drop course (triggers waitlist promotion) |
| POST | `/api/enrollments/attendance/:id` | Yes | Faculty | `{ present: true/false }` | Mark attendance |
| PUT | `/api/enrollments/marks/:id` | Yes | Faculty | `{ marks }` | Enter marks (post-course, eligible students only) |
| GET | `/api/enrollments/my` | Yes | Student | — | My enrollments with attendance % |

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
- A student with `completed` status for a course cannot re-enroll
- A student with `failed` or `disqualified` status can re-enroll
- Cannot enroll in a course with status `completed` (ended)
- Enroll is atomic (transaction): capacity check + insert happen together

**Waitlist Promotion**
- When a student drops, the first waitlisted student is auto-promoted to `enrolled`
- All remaining waitlist positions shift down by 1
- `current_count` is updated throughout

**Attendance**
- Only the assigned instructor can mark attendance for their course
- Attendance can only be marked during `ongoing` courses
- Eligibility recalculated after every mark: `attended_classes / total_classes × 100`
- Below 50% → `is_eligible = false`

**Marks Entry**
- Can only be entered after course `end_date` has passed
- Blocked if student `is_eligible = false`
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

All protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <token>
```

The token is received on login and expires after 24 hours.

**Default Admin Account (auto-created on startup):**
```
Email:    admin@system.com
Password: admin123
```

---

## 🐳 Docker Commands

```bash
docker-compose up -d          # start PostgreSQL container
docker-compose down           # stop container
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

## 🔒 Security

- Passwords hashed with **bcrypt** (10 salt rounds)
- **JWT** tokens signed with secret key, expire in 24 hours
- **Parameterized queries** prevent SQL injection
- Role-based access control on every protected endpoint
- Department-scoped access control for dept admin operations
- Sensitive config in `.env` — never committed to version control
- **UNIQUE constraints** at DB level prevent duplicate enrollments
- **Foreign keys** prevent orphaned records
- **Transactions** used for enrollment and drop operations (atomic)

---

## 📄 Changelog

### v3.0 — Business Logic & Roles
- Added `department_admin` role with department-scoped permissions
- New `departments` table and admin management endpoints
- New `appeals` table and full appeals workflow
- Course upgrades: capacity, waitlist, dates, total classes
- Enrollment lifecycle: waitlist, drop, promotion, re-enrollment rules
- Daily attendance tracking with eligibility calculation
- Marks entry gated behind course completion + 50% attendance
- Failed students (< 30 marks) marked retake-eligible
- Performance controller updated: per-course breakdown, attendance % included
- 19 endpoints total (was 9 in v2)
- 58-test Postman suite covering all business logic paths

### v2.0 — PostgreSQL Migration
- Migrated data layer from MongoDB to PostgreSQL
- Replaced Mongoose ODM with node-postgres (pg) connection pool
- Added Docker + Docker Compose for local DB environment
- Normalized schema with foreign keys and compound indexes
- Database-level UNIQUE constraint on enrollments
- Fixed typo bug in performance grading logic (`performace` → `performance`)
- Added try/catch error handling to all controllers

### v1.0 — Initial Release
- MongoDB + Mongoose implementation
- JWT authentication with role-based access control
- Course, enrollment, and performance management

---

## 👩‍💻 Developed By

**Sahitya**