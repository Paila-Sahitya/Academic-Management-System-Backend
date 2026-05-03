const pool = require("../db/index");

// get performance
exports.getPerformance = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                e.id,
                e.marks,
                e.attendance,
                c.course_name
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "No enrollments found"
            });
        }

        const enrollments = result.rows;

        // calculate totals
        let totalMarks = 0;
        let totalAttendance = 0;

        enrollments.forEach(e => {
            totalMarks      += e.marks;
            totalAttendance += e.attendance;
        });

        const avgMarks      = totalMarks / enrollments.length;
        const avgAttendance = totalAttendance / enrollments.length;

        // performance grade — typo bug fixed here
        let performance;
        if      (avgMarks >= 85) performance = "Excellent";
        else if (avgMarks >= 70) performance = "Good";
        else if (avgMarks >= 50) performance = "Average";   // ← fixed: was 'performace'
        else                     performance = "Needs Improvement";

        // per course breakdown
        const courses = enrollments.map(e => ({
            courseName:  e.course_name,
            marks:       e.marks,
            attendance:  e.attendance,
        }));

        res.json({
            totalCourses:      enrollments.length,
            averageMarks:      parseFloat(avgMarks.toFixed(2)),
            averageAttendance: parseFloat(avgAttendance.toFixed(2)),
            performanceStatus: performance,
            courses,
        });

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};