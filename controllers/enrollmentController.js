const pool = require("../db/index");

// enroll in course
exports.enrollCourse = async (req, res) => {
    try {
        const { courseId } = req.body;

        // check if already enrolled
        const existing = await pool.query(
            `SELECT id FROM enrollments
             WHERE student_id = $1 AND course_id = $2`,
            [req.user.id, courseId]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "Already enrolled"
            });
        }

        const result = await pool.query(
            `INSERT INTO enrollments (student_id, course_id)
             VALUES ($1, $2)
             RETURNING *`,
            [req.user.id, courseId]
        );

        res.status(201).json({
            enrollment: result.rows[0]
        });

    } catch (error) {
        // unique constraint violation at DB level
        if (error.code === "23505") {
            return res.status(400).json({
                message: "Already enrolled"
            });
        }
        res.status(400).json({
            message: error.message
        });
    }
};

// update marks
exports.updateMarks = async (req, res) => {
    try {
        const { marks } = req.body;

        const result = await pool.query(
            `UPDATE enrollments
             SET marks = $1
             WHERE id = $2
             RETURNING *`,
            [marks, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Enrollment not found"
            });
        }

        res.json({
            message: "Marks updated",
            enrollment: result.rows[0]
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// update attendance
exports.updateAttendance = async (req, res) => {
    try {
        const { attendance } = req.body;

        const result = await pool.query(
            `UPDATE enrollments
             SET attendance = $1
             WHERE id = $2
             RETURNING *`,
            [attendance, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Enrollment not found"
            });
        }

        res.status(200).json({
            message: "Attendance updated",
            enrollment: result.rows[0]
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// get my enrollments
exports.getMyEnrollments = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                e.id,
                e.marks,
                e.attendance,
                e.created_at,
                c.id         AS course_id,
                c.course_name,
                c.course_code
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = $1
             ORDER BY e.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};