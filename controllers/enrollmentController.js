const pool = require("../db/index");
const cache = require("../helpers/cache");

// helper - derive cpurse status from dates
function getCourseStatus(startDate, endDate) {
    if (!startDate || !endDate) return "upcoming";
    const today = new Date();
    const start = new Date(startDate);
    const end   = new Date(endDate);
    if (today < start) return "upcoming";
    if (today > end)   return "completed";
    return "ongoing";
}


// enroll in course
exports.enrollCourse = async (req, res) => {
    const client = await pool.connect();
    try {
        const { courseId } = req.body;

        if (!courseId) {
            return res.status(400).json({
                message: "courseId is required"
            });
        }

        await client.query("BEGIN");

        // fetch course
        const courseResult = await client.query(
            "SELECT * FROM courses WHERE id = $1",
            [courseId]
        );

        if (courseResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Course not found"
            });
        }

        const course = courseResult.rows[0];
        const courseStatus = getCourseStatus(
            course.start_date, course.end_date
        );

        // guard: course must not be completed
        if (courseStatus === "completed") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Enrollment closed — course has ended"
            });
        }

        // guard: check previous enrollment history
        const historyResult = await client.query(
            `SELECT status FROM enrollments
             WHERE student_id = $1 AND course_id = $2`,
            [req.user.id, courseId]
        );

        if (historyResult.rows.length > 0) {
            const prevStatus = historyResult.rows[0].status;

            if (prevStatus === "completed") {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    message: "Already completed this course"
                });
            }

            if (prevStatus === "enrolled" || prevStatus === "waitlisted") {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    message: "Already enrolled or on waitlist"
                });
            }

            // failed / dropped / disqualified → delete old record
            // so we can create a fresh enrollment
            await client.query(
                "DELETE FROM enrollments WHERE student_id = $1 AND course_id = $2",
                [req.user.id, courseId]
            );
        }

        // check capacity
        if (course.current_count < course.max_students) {
            // seat available → enroll directly
            const result = await client.query(
                `INSERT INTO enrollments (student_id, course_id, status)
                 VALUES ($1, $2, 'enrolled')
                 RETURNING *`,
                [req.user.id, courseId]
            );

            await client.query(
                `UPDATE courses
                 SET current_count = current_count + 1
                 WHERE id = $1`,
                [courseId]
            );

            await client.query("COMMIT");

            return res.status(201).json({
                message: "Enrolled successfully",
                status: "enrolled",
                enrollment: result.rows[0]
            });

        } else {
            // course full → add to waitlist
            const waitlistCount = await client.query(
                `SELECT COUNT(*) FROM enrollments
                 WHERE course_id = $1 AND status = 'waitlisted'`,
                [courseId]
            );

            const position = parseInt(waitlistCount.rows[0].count) + 1;

            const result = await client.query(
                `INSERT INTO enrollments
                    (student_id, course_id, status, waitlist_position)
                 VALUES ($1, $2, 'waitlisted', $3)
                 RETURNING *`,
                [req.user.id, courseId, position]
            );

            await client.query("COMMIT");

            return res.status(201).json({
                message: `Course is full. Added to waitlist`,
                status: "waitlisted",
                position,
                enrollment: result.rows[0]
            });
        }

    } catch (error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") {
            return res.status(400).json({
                message: "Already enrolled or on waitlist"
            });
        }
        next(error);
    } finally {
        client.release();
    }
};


// drop course
exports.dropCourse = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        await client.query("BEGIN");

        // fetch enrollment
        const enrollResult = await client.query(
            `SELECT e.*, c.start_date, c.end_date, c.current_count
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.id = $1`,
            [id]
        );

        if (enrollResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Enrollment not found"
            });
        }

        const enrollment = enrollResult.rows[0];

        // guard: must belong to this student
        if (enrollment.student_id !== req.user.id) {
            await client.query("ROLLBACK");
            return res.status(403).json({
                message: "Not your enrollment"
            });
        }

        // guard: cannot drop completed course
        const courseStatus = getCourseStatus(
            enrollment.start_date, enrollment.end_date
        );
        if (courseStatus === "completed") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Cannot drop a completed course"
            });
        }

        const wasEnrolled = enrollment.status === "enrolled";

        // mark as dropped
        await client.query(
            "UPDATE enrollments SET status = 'dropped' WHERE id = $1",
            [id]
        );

        // only promote waitlist if student was enrolled (not waitlisted)
        if (wasEnrolled) {

            // decrement course count
            await client.query(
                `UPDATE courses
                 SET current_count = current_count - 1
                 WHERE id = $1`,
                [enrollment.course_id]
            );

            // find first waitlisted student
            const waitlisted = await client.query(
                `SELECT * FROM enrollments
                 WHERE course_id = $1 AND status = 'waitlisted'
                 ORDER BY waitlist_position ASC
                 LIMIT 1`,
                [enrollment.course_id]
            );

            if (waitlisted.rows.length > 0) {
                const promoted = waitlisted.rows[0];

                // promote to enrolled
                await client.query(
                    `UPDATE enrollments
                     SET status = 'enrolled', waitlist_position = NULL
                     WHERE id = $1`,
                    [promoted.id]
                );

                // increment course count
                await client.query(
                    `UPDATE courses
                     SET current_count = current_count + 1
                     WHERE id = $1`,
                    [enrollment.course_id]
                );

                // shift remaining waitlist positions down by 1
                await client.query(
                    `UPDATE enrollments
                     SET waitlist_position = waitlist_position - 1
                     WHERE course_id = $1
                     AND status = 'waitlisted'`,
                    [enrollment.course_id]
                );
            }
        }

        await client.query("COMMIT");

        res.json({
            message: "Course dropped successfully"
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error);
    } finally {
        client.release();
    }
};


// mark attendance
exports.markAttendance = async (req, res) => {
    try {
        const { id } = req.params;
        const { present } = req.body;

        if (present === undefined) {
            return res.status(400).json({
                message: "present field is required (true or false)"
            });
        }

        // fetch enrollment + course
        const result = await pool.query(
            `SELECT e.*, c.instructor, c.start_date,
                    c.end_date, c.total_classes
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Enrollment not found"
            });
        }

        const enrollment = result.rows[0];
        const courseStatus = getCourseStatus(
            enrollment.start_date, enrollment.end_date
        );

        // guard: faculty must be instructor of this course
        if (enrollment.instructor !== req.user.id) {
            return res.status(403).json({
                message: "Not your course"
            });
        }

        // guard: course must be ongoing
        if (courseStatus === "upcoming") {
            return res.status(400).json({
                message: "Course hasn't started yet"
            });
        }
        if (courseStatus === "completed") {
            return res.status(400).json({
                message: "Course has already ended"
            });
        }

        // increment attended_classes only if present
        let newAttended = enrollment.attended_classes;
        if (present === true) {
            newAttended += 1;
        }

        // recalculate eligibility
        let isEligible = enrollment.is_eligible;
        if (enrollment.total_classes && enrollment.total_classes > 0) {
            const percentage = (newAttended / enrollment.total_classes) * 100;
            isEligible = percentage >= 50;
        }

        const updated = await pool.query(
            `UPDATE enrollments
             SET attended_classes = $1,
                 is_eligible      = $2
             WHERE id = $3
             RETURNING *`,
            [newAttended, isEligible, id]
        );

        // invalidate performance cache
        await cache.del(`performance:student:${enrollment.student_id}`);

        const attendancePercentage = enrollment.total_classes
            ? parseFloat(
                ((newAttended / enrollment.total_classes) * 100).toFixed(2)
              )
            : null;
        res.json({
            message: present ? "Marked present" : "Marked absent",
            attendedClasses:      newAttended,
            totalClasses:         enrollment.total_classes,
            attendancePercentage,
            isEligible,
            enrollment:           updated.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// update marks
exports.updateMarks = async (req, res) => {
    try {
        const { marks } = req.body;
        const { id } = req.params;

        if (marks === undefined || marks === null) {
            return res.status(400).json({
                message: "marks is required"
            });
        }

        // fetch enrollment + course
        const result = await pool.query(
            `SELECT e.*, c.instructor, c.start_date,
                    c.end_date, c.total_classes
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Enrollment not found"
            });
        }

        const enrollment = result.rows[0];
        const courseStatus = getCourseStatus(
            enrollment.start_date, enrollment.end_date
        );

        // guard: faculty must be instructor
        if (enrollment.instructor !== req.user.id) {
            return res.status(403).json({
                message: "Not your course"
            });
        }

        // guard: course must be completed
        if (courseStatus !== "completed") {
            return res.status(400).json({
                message: "Marks can only be entered after course ends"
            });
        }

        // guard: student must be eligible
        if (!enrollment.is_eligible) {
            return res.status(403).json({
                message: "Student not eligible — attendance below 50%"
            });
        }

        // determine final enrollment status
        const finalStatus         = marks < 30 ? "failed"    : "completed";
        const isRetakeEligible    = marks < 30 ? true        : false;
        const responseMessage     = marks < 30
            ? "Marks entered — student failed, eligible for retake"
            : "Marks entered successfully";

        const updated = await pool.query(
            `UPDATE enrollments
             SET marks              = $1,
                 status             = $2,
                 is_retake_eligible = $3
             WHERE id = $4
             RETURNING *`,
            [marks, finalStatus, isRetakeEligible, id]
        );

        // invalidate this student's performance cache
        await cache.del(`performance:student:${enrollment.student_id}`);

        res.json({
            message: responseMessage,
            enrollment: updated.rows[0]
        });

    } catch (error) {
        next(error);
    }
};


// get my enrollments
exports.getMyEnrollments = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                e.id,
                e.status,
                e.marks,
                e.attended_classes,
                e.waitlist_position,
                e.is_eligible,
                e.is_retake_eligible,
                e.created_at,
                c.id            AS course_id,
                c.course_name,
                c.course_code,
                c.department,
                c.start_date,
                c.end_date,
                c.total_classes,
                c.max_students,
                c.current_count,
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

        // derive course status for each enrollment
        const enrollments = result.rows.map(e => ({
            ...e,
            course_status: getCourseStatus(e.start_date, e.end_date)
        }));

        res.json(enrollments);

    } catch (error) {
        next(error);
    }
};