const pool = require("../db/index");

// create course
exports.createCourse = async (req, res) => {
    try {
        const { courseName, courseCode, instructor } = req.body;

        const result = await pool.query(
            `INSERT INTO courses (course_name, course_code, instructor)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [courseName, courseCode, instructor]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        // unique violation — duplicate course code
        if (error.code === "23505") {
            return res.status(400).json({
                message: "Course code already exists"
            });
        }
        res.status(400).json({
            message: error.message
        });
    }
};

// get all courses
exports.getCourses = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                c.id,
                c.course_name,
                c.course_code,
                c.created_at,
                u.id   AS instructor_id,
                u.name AS instructor_name,
                u.email AS instructor_email
             FROM courses c
             JOIN users u ON c.instructor = u.id
             ORDER BY c.created_at DESC`
        );

        res.json(result.rows);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

// delete course
exports.deleteCourse = async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM courses
             WHERE id = $1
             RETURNING *`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Course not found"
            });
        }

        res.json({
            message: "Course deleted successfully"
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};