const pool   = require("../db/index");
const cache  = require("../helpers/cache");
const logger = require("../config/logger");

// HELPER — derive course status from dates
function getCourseStatus(startDate, endDate) {
    if (!startDate || !endDate) return "upcoming";
    const today = new Date();
    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (today < start) return "upcoming";
    if (today > end)   return "completed";
    return "ongoing";
}


//  CREATE COURSE
exports.createCourse = async (req, res, next) => {
    try {
        const {
            courseName,
            courseCode,
            instructor,
            department,
            maxStudents,
            startDate,
            endDate,
            totalClasses
        } = req.body;

        // dept admin can only create in their own department
        if (req.user.role === "department_admin") {
            if (!department) {
                return res.status(400).json({
                    message: "Department is required"
                });
            }
            if (department.toUpperCase() !== req.user.department) {
                return res.status(403).json({
                    message: "Cannot create course outside your department"
                });
            }
        }

        // verify department exists if provided
        if (department) {
            const dept = await pool.query(
                "SELECT id FROM departments WHERE code = $1",
                [department.toUpperCase()]
            );
            if (dept.rows.length === 0) {
                return res.status(400).json({
                    message: "Department not found"
                });
            }
        }

        // verify instructor exists and is faculty
        const instructorCheck = await pool.query(
            "SELECT id, role FROM users WHERE id = $1",
            [instructor]
        );
        if (instructorCheck.rows.length === 0) {
            return res.status(400).json({
                message: "Instructor not found"
            });
        }
        if (instructorCheck.rows[0].role !== "faculty") {
            return res.status(400).json({
                message: "Instructor must be a faculty member"
            });
        }

        const result = await pool.query(
            `INSERT INTO courses
                (course_name, course_code, instructor, department,
                 max_students, start_date, end_date, total_classes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                courseName,
                courseCode,
                instructor,
                department ? department.toUpperCase() : null,
                maxStudents  || 60,
                startDate    || null,
                endDate      || null,
                totalClasses || null
            ]
        );

        const course = result.rows[0];
        course.status = getCourseStatus(course.start_date, course.end_date);

        //  invalidate course cache
        await cache.delPattern("courses:*");

        res.status(201).json(course);

    } catch (error) {
        if (error.code === "23505") {
            return res.status(400).json({
                message: "Course code already exists"
            });
        }
        next(error);
    }
};


// GET ALL COURSES
exports.getCourses = async (req, res, next) => {
    try {
        const { department } = req.query;

        // build cache key based on filter
        const cacheKey = department
            ? `courses:dept:${department.toUpperCase()}`
            : "courses:all";

        //  check cache first 
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        //  cache miss — query DB
        let query = `
            SELECT
                c.id,
                c.course_name,
                c.course_code,
                c.department,
                c.max_students,
                c.current_count,
                c.start_date,
                c.end_date,
                c.total_classes,
                c.created_at,
                u.id    AS instructor_id,
                u.name  AS instructor_name,
                u.email AS instructor_email
            FROM courses c
            JOIN users u ON c.instructor = u.id
        `;
        const params = [];

        if (department) {
            query += " WHERE c.department = $1";
            params.push(department.toUpperCase());
        }

        query += " ORDER BY c.created_at DESC";

        const result = await pool.query(query, params);

        // derive status for each course
        const courses = result.rows.map(c => ({
            ...c,
            status: getCourseStatus(c.start_date, c.end_date)
        }));

        //  store in cache (10 min TTL) 
        await cache.set(cacheKey, courses, 600);

        res.json(courses);

    } catch (error) {
        next(error);
    }
};


//  UPDATE COURSE 
exports.updateCourse = async (req, res, next) => {
    try {
        const { id }  = req.params;
        const {
            maxStudents,
            startDate,
            endDate,
            totalClasses
        } = req.body;

        // fetch course first
        const existing = await pool.query(
            "SELECT * FROM courses WHERE id = $1", [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        const course = existing.rows[0];

        // dept admin can only update own dept
        if (req.user.role === "department_admin") {
            if (course.department !== req.user.department) {
                return res.status(403).json({
                    message: "Not your department"
                });
            }
        }

        const result = await pool.query(
            `UPDATE courses
             SET
                max_students  = COALESCE($1, max_students),
                start_date    = COALESCE($2, start_date),
                end_date      = COALESCE($3, end_date),
                total_classes = COALESCE($4, total_classes)
             WHERE id = $5
             RETURNING *`,
            [maxStudents, startDate, endDate, totalClasses, id]
        );

        const updated = result.rows[0];
        updated.status = getCourseStatus(updated.start_date, updated.end_date);

        //  invalidate course cache 
        await cache.delPattern("courses:*");

        res.json(updated);

    } catch (error) {
        next(error);
    }
};


//  DELETE COURSE 
exports.deleteCourse = async (req, res, next) => {
    try {
        const { id } = req.params;

        // fetch course first
        const existing = await pool.query(
            "SELECT * FROM courses WHERE id = $1", [id]
        );

        if (existing.rows.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        // dept admin can only delete own dept
        if (req.user.role === "department_admin") {
            if (existing.rows[0].department !== req.user.department) {
                return res.status(403).json({
                    message: "Not your department"
                });
            }
        }

        await pool.query("DELETE FROM courses WHERE id = $1", [id]);

        //  invalidate course cache 
        await cache.delPattern("courses:*");

        res.json({ message: "Course deleted successfully" });

    } catch (error) {
        next(error);
    }
};