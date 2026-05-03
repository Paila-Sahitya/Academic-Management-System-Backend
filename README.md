# 🎓 Academic Management System — v2.0

A secure, role-based academic backend API built with Node.js, Express, and PostgreSQL.
Migrated from MongoDB to PostgreSQL with full schema enforcement, foreign key constraints, and Docker-based local development.

---

## 📌 Versions

| Version | Branch | Database | Status |
|---|---|---|---|
| v1.0 | `v1` | MongoDB + Mongoose | Stable, archived |
| v2.0 | `main` | PostgreSQL + pg | Current |

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

| Feature | Admin | Faculty | Student |
|---|---|---|---|
| Register / Login | ✅ | ✅ | ✅ |
| Create Course | ✅ | ❌ | ❌ |
| View Courses | ✅ | ✅ | ✅ |
| Delete Course | ✅ | ❌ | ❌ |
| Enroll in Course | ❌ | ❌ | ✅ |
| Update Marks | ❌ | ✅ | ❌ |
| Update Attendance | ❌ | ✅ | ❌ |
| View My Enrollments | ❌ | ❌ | ✅ |
| View Performance | ❌ | ❌ | ✅ |

---

## 📁 Project Structure

```
server/
├── config/
│   └── createAdmin.js        → seeds default admin on startup
├── controllers/
│   ├── authController.js     → register, login
│   ├── courseController.js   → create, list, delete courses
│   ├── enrollmentController.js → enroll, marks, attendance
│   └── performanceController.js → performance summary
├── db/
│   ├── index.js              → pg connection pool
│   └── init.sql              → full PostgreSQL schema
├── middleware/
│   └── authMiddleware.js     → JWT protect + role authorize
├── routes/
│   ├── authRoutes.js
│   ├── courseRoutes.js
│   ├── enrollmentRoutes.js
│   └── performanceRoutes.js
├── .env                      → environment variables (not committed)
├── .gitignore
├── docker-compose.yml        → runs PostgreSQL locally
├── package.json
└── server.js                 → entry point
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
 public | courses     | table | ams_user
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
| role | VARCHAR(20) | NOT NULL, DEFAULT 'student', CHECK IN ('admin','faculty','student') |
| created_at | TIMESTAMP | DEFAULT NOW() |

### courses
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| course_name | VARCHAR(150) | NOT NULL |
| course_code | VARCHAR(20) | NOT NULL, UNIQUE |
| instructor | INTEGER | NOT NULL, REFERENCES users(id) ON DELETE RESTRICT |
| created_at | TIMESTAMP | DEFAULT NOW() |

### enrollments
| Column | Type | Constraints |
|---|---|---|
| id | SERIAL | PRIMARY KEY |
| student_id | INTEGER | NOT NULL, REFERENCES users(id) ON DELETE CASCADE |
| course_id | INTEGER | NOT NULL, REFERENCES courses(id) ON DELETE CASCADE |
| marks | INTEGER | DEFAULT 0 |
| attendance | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | DEFAULT NOW() |
| — | — | UNIQUE (student_id, course_id) |

---

## 🔌 API Reference

### Auth — `/api/auth`

| Method | Endpoint | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{ name, email, password, role }` | Register user |
| POST | `/api/auth/login` | No | `{ email, password }` | Login, receive JWT |

### Courses — `/api/course`

| Method | Endpoint | Auth | Role | Body | Description |
|---|---|---|---|---|---|
| POST | `/api/course/` | Yes | Admin | `{ courseName, courseCode, instructor }` | Create course |
| GET | `/api/course/` | Yes | Any | — | List all courses |
| DELETE | `/api/course/:id` | Yes | Admin | — | Delete course |

### Enrollments — `/api/enrollments`

| Method | Endpoint | Auth | Role | Body | Description |
|---|---|---|---|---|---|
| POST | `/api/enrollments/` | Yes | Student | `{ courseId }` | Enroll in course |
| PUT | `/api/enrollments/marks/:id` | Yes | Faculty | `{ marks }` | Update marks |
| PUT | `/api/enrollments/attendance/:id` | Yes | Faculty | `{ attendance }` | Update attendance |
| GET | `/api/enrollments/my` | Yes | Student | — | My enrollments |

### Performance — `/api/performance`

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/api/performance/` | Yes | Student | Performance summary |

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
- Sensitive config in `.env` — never committed to version control
- **UNIQUE constraints** at DB level prevent duplicate enrollments
- **Foreign keys** prevent orphaned records

---

## 🐛 Known Bug Fixed in v2.0

A typo bug existed in `performanceController.js` where `performace` (missing 'r') was used instead of `performance`. This caused students with average marks between 50–69 to receive `null` as their performance status instead of `"Average"`. Fixed in this version.

---

## 📈 Upcoming — Phase 2

- Department Admin role
- Department model
- Course capacity limits with waitlist
- Course duration (start/end dates)
- Daily incremental attendance marking
- Attendance-based eligibility (< 50% blocks marks entry)
- Marks entry only after course completion
- Re-enrollment for failed students (marks < 30%)
- Appeal system for unforeseen circumstances

---

## 👩‍💻 Developed By

**Sahitya**


---

## 📄 Changelog

### v2.0 — PostgreSQL Migration
- Migrated data layer from MongoDB to PostgreSQL
- Replaced Mongoose ODM with node-postgres (pg) connection pool
- Added Docker + Docker Compose for local DB environment
- Normalized schema with foreign keys and compound indexes
- Database-level UNIQUE constraint on enrollments
- Fixed typo bug in performance grading logic
- Added try/catch error handling to all controllers

### v1.0 — Initial Release
- MongoDB + Mongoose implementation
- JWT authentication with role-based access control
- Course, enrollment, and performance management