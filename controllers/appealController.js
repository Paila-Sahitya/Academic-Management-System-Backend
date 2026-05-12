const pool = require("../db/index");

// submit appeal
exports.submitAppeal = async (req, res) => {
    try {
        const { enrollmentId, reason } = req.body;

        if (!enrollmentId || !reason) {
            return res.status(400).json({
                message: "enrollmentId and reason are required"
            });
        }

        // verify enrollment belongs to this student
        const enrollment = await pool.query(
            `SELECT e.*, c.id AS course_id
             FROM enrollments e
             JOIN courses c ON e.course_id = c.id
             WHERE e.id = $1 AND e.student_id = $2`,
            [enrollmentId, req.user.id]
        );

        if (enrollment.rows.length === 0) {
            return res.status(403).json({
                message: "Not your enrollment"
            });
        }

        // check no pending appeal already exists
        const existing = await pool.query(
            `SELECT id FROM appeals
             WHERE enrollment_id = $1 AND status = 'pending'`,
            [enrollmentId]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "You already have a pending appeal for this enrollment"
            });
        }

        const courseId = enrollment.rows[0].course_id;

        const result = await pool.query(
            `INSERT INTO appeals
                (student_id, enrollment_id, course_id, reason)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [req.user.id, enrollmentId, courseId, reason]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
};


// resolve appeal
exports.resolveAppeal = async (req, res) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            status,
            adminNote,
            overrideEligibility,
            overrideMarks
        } = req.body;

        if (!status || !["approved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "status must be 'approved' or 'rejected'"
            });
        }

        await client.query("BEGIN");

        // fetch appeal with course info
        const appealResult = await client.query(
            `SELECT a.*, c.department
             FROM appeals a
             JOIN courses c ON a.course_id = c.id
             WHERE a.id = $1`,
            [id]
        );

        if (appealResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                message: "Appeal not found"
            });
        }

        const appeal = appealResult.rows[0];

        // guard: appeal must be pending
        if (appeal.status !== "pending") {
            await client.query("ROLLBACK");
            return res.status(400).json({
                message: "Appeal already resolved"
            });
        }

        // guard: dept admin can only resolve own dept appeals
        if (req.user.role === "department_admin") {
            if (appeal.department !== req.user.department) {
                await client.query("ROLLBACK");
                return res.status(403).json({
                    message: "Not your department"
                });
            }
        }

        // if approved — apply overrides to enrollment
        if (status === "approved") {

            if (overrideEligibility === true) {
                await client.query(
                    `UPDATE enrollments
                     SET is_eligible = true,
                         status = CASE
                             WHEN status = 'disqualified' THEN 'enrolled'
                             ELSE status
                         END
                     WHERE id = $1`,
                    [appeal.enrollment_id]
                );
            }

            if (overrideMarks !== undefined && overrideMarks !== null) {
                const finalStatus      = overrideMarks < 30 ? "failed"    : "completed";
                const retakeEligible   = overrideMarks < 30 ? true        : false;

                await client.query(
                    `UPDATE enrollments
                     SET marks              = $1,
                         status             = $2,
                         is_retake_eligible = $3
                     WHERE id = $4`,
                    [overrideMarks, finalStatus, retakeEligible,
                     appeal.enrollment_id]
                );
            }
        }

        // update appeal record
        const resolved = await client.query(
            `UPDATE appeals
             SET status               = $1,
                 admin_note           = $2,
                 resolved_by          = $3,
                 override_eligibility = $4,
                 override_marks       = $5,
                 updated_at           = NOW()
             WHERE id = $6
             RETURNING *`,
            [
                status,
                adminNote    || null,
                req.user.id,
                overrideEligibility || false,
                overrideMarks       || null,
                id
            ]
        );

        await client.query("COMMIT");

        res.json({
            message: `Appeal ${status}`,
            appeal:  resolved.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");
        next(error)
    } finally {
        client.release();
    }
};


// get my appeals
exports.getMyAppeals = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                a.id,
                a.reason,
                a.status,
                a.admin_note,
                a.override_eligibility,
                a.override_marks,
                a.created_at,
                a.updated_at,
                c.course_name,
                c.course_code
             FROM appeals a
             JOIN courses c ON a.course_id = c.id
             WHERE a.student_id = $1
             ORDER BY a.created_at DESC`,
            [req.user.id]
        );

        res.json(result.rows);

    } catch (error) {
        next(error);
    }
};


// get dept appeals
exports.getDeptAppeals = async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT
                a.id,
                a.reason,
                a.status,
                a.admin_note,
                a.created_at,
                a.updated_at,
                u.name  AS student_name,
                u.email AS student_email,
                c.course_name,
                c.course_code,
                c.department
            FROM appeals a
            JOIN courses c ON a.course_id = c.id
            JOIN users   u ON a.student_id = u.id
            WHERE c.department = $1
        `;
        const params = [req.user.department];

        if (status) {
            query += " AND a.status = $2";
            params.push(status);
        }

        query += " ORDER BY a.created_at DESC";

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        next(error);
    }
};