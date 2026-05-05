-- ACADEMIC MANAGEMENT SYSTEM — DATABASE SCHEMA

-- USERS

CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'student'
                CHECK (role IN ('admin', 'faculty', 'student', 'department_admin')),
    department  VARCHAR(20)  DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);


-- DEPARTMENTS

CREATE TABLE departments (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);


-- COURSES


CREATE TABLE courses (
    id            SERIAL PRIMARY KEY,
    course_name   VARCHAR(150) NOT NULL,
    course_code   VARCHAR(20)  NOT NULL UNIQUE,
    instructor    INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    department    VARCHAR(20)  DEFAULT NULL,
    max_students  INTEGER      NOT NULL DEFAULT 60,
    current_count INTEGER      NOT NULL DEFAULT 0,
    start_date    DATE         DEFAULT NULL,
    end_date      DATE         DEFAULT NULL,
    total_classes INTEGER      DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT NOW()
);


-- ENROLLMENTS


CREATE TABLE enrollments (
    id                  SERIAL PRIMARY KEY,
    student_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id           INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status              VARCHAR(20) NOT NULL DEFAULT 'enrolled'
                        CHECK (status IN (
                            'enrolled', 'waitlisted', 'dropped',
                            'disqualified', 'failed', 'completed'
                        )),
    waitlist_position   INTEGER  DEFAULT NULL,
    marks               INTEGER  DEFAULT NULL,
    attended_classes    INTEGER  NOT NULL DEFAULT 0,
    is_eligible         BOOLEAN  NOT NULL DEFAULT true,
    is_retake_eligible  BOOLEAN  NOT NULL DEFAULT false,
    created_at          TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_enrollment UNIQUE (student_id, course_id)
);


-- APPEALS


CREATE TABLE appeals (
    id                   SERIAL PRIMARY KEY,
    student_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_id        INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    course_id            INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    reason               TEXT NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note           TEXT DEFAULT NULL,
    resolved_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    override_eligibility BOOLEAN  DEFAULT false,
    override_marks       INTEGER  DEFAULT NULL,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);




-- INDEXES

-- users
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_users_role           ON users(role);

-- courses
CREATE INDEX idx_courses_code         ON courses(course_code);
CREATE INDEX idx_courses_department   ON courses(department);

-- enrollments
CREATE INDEX idx_enrollments_student  ON enrollments(student_id);
CREATE INDEX idx_enrollments_course   ON enrollments(course_id);
CREATE INDEX idx_enrollments_status   ON enrollments(status);
CREATE INDEX idx_enrollments_waitlist ON enrollments(course_id, waitlist_position);

-- appeals
CREATE INDEX idx_appeals_student      ON appeals(student_id);
CREATE INDEX idx_appeals_status       ON appeals(status);
