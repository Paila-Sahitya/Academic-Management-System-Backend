const pool = require("../db/index");

// helper - derive course status from dates
function getCourseStatus(startDate, endDate) {
    if (!startDate || !endDate) return "upcoming";
    const today = new Date();
    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (today < start) return "upcoming";
    if (today > end)   return "completed";
    return "ongoing";
}


// Get Performance
exports.getPerformance = async (req, res) => {
    try {
        // fetch all enrollments for student with course info
        const result = await pool.query(
            `SELECT
                e.id,
                e.status,
                e.marks,
                e.attended_classes,
                e.is_eligible,
                e.is_retake_eligible,
                c.course_name,
                c.course_code,
                c.department,
                c.start_date,
                c.end_date,
                c.total_classes,
                CASE
                    WHEN c.total_classes > 0
                    THEN ROUND(
                        (e.attended_classes::DECIMAL / c.total_classes) * 100,
                        2
                    )
                    ELSE 0
                END AS attendance_percentage
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.student_id = $1
             ORDER BY e.created_at DESC`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "No enrollments found"
            });
        }

        const allEnrollments = result.rows;

        // only count completed enrollments in averages
        const completed = allEnrollments.filter(
            e => e.status === "completed"
        );

        // per course breakdown — all enrollments
        const courses = allEnrollments.map(e => ({
            courseName:           e.course_name,
            courseCode:           e.course_code,
            department:           e.department,
            status:               e.status,
            courseStatus:         getCourseStatus(e.start_date, e.end_date),
            marks:                e.marks,
            attendedClasses:      e.attended_classes,
            totalClasses:         e.total_classes,
            attendancePercentage: parseFloat(e.attendance_percentage),
            isEligible:           e.is_eligible,
            isRetakeEligible:     e.is_retake_eligible,
        }));

        // if no completed courses yet
        if (completed.length === 0) {
            return res.json({
                message:           "No completed courses yet",
                totalEnrollments:  allEnrollments.length,
                completedCourses:  0,
                averageMarks:      null,
                averageAttendance: null,
                performanceStatus: null,
                courses,
            });
        }

        // calculate averages from completed only
        const totalMarks      = completed.reduce((sum, e) => sum + (e.marks || 0), 0);
        const totalAttendance = completed.reduce(
            (sum, e) => sum + parseFloat(e.attendance_percentage), 0
        );

        const avgMarks      = totalMarks / completed.length;
        const avgAttendance = totalAttendance / completed.length;

        // performance grade
        let performance;
        if      (avgMarks >= 85) performance = "Excellent";
        else if (avgMarks >= 70) performance = "Good";
        else if (avgMarks >= 50) performance = "Average";
        else                     performance = "Needs Improvement";

        res.json({
            totalEnrollments:  allEnrollments.length,
            completedCourses:  completed.length,
            averageMarks:      parseFloat(avgMarks.toFixed(2)),
            averageAttendance: parseFloat(avgAttendance.toFixed(2)),
            performanceStatus: performance,
            courses,
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};