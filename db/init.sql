-- ACADEMIC MANAGEMENT SYSTEM — DATABASE SCHEMA

-- USERS

CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'student'
                CHECK (role IN ('admin', 'faculty', 'student')),
    created_at  TIMESTAMP DEFAULT NOW()
);


-- COURSES


CREATE TABLE courses (
    id           SERIAL PRIMARY KEY,
    course_name  VARCHAR(150) NOT NULL,
    course_code  VARCHAR(20)  NOT NULL UNIQUE,
    instructor   INTEGER      NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at   TIMESTAMP DEFAULT NOW()
);



-- ENROLLMENTS


CREATE TABLE enrollments (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    marks       INTEGER DEFAULT 0,
    attendance  INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_enrollment UNIQUE (student_id, course_id)
);


-- INDEXES

CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course  ON enrollments(course_id);
CREATE INDEX idx_courses_code        ON courses(course_code);
CREATE INDEX idx_users_email         ON users(email);
