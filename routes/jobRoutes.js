const express             = require("express");
const { emailQueue, reportQueue } = require("../queues/index");
const { protect, authorize }      = require("../middleware/authMiddleware");
const logger              = require("../config/logger");
const pool                = require("../db/index");
const { reportQueue: rq } = require("../queues/index");
const addAttendanceReportJob = async (courseId, facultyId) => {
    return await reportQueue.add(
        "attendance_report",
        { courseId, facultyId }
    );
};

const router = express.Router();

// Get Job Status
router.get("/:id/status", protect, async (req, res, next) => {
    try {
        const { id } = req.params;

        // check both queues for the job
        let job = await emailQueue.getJob(id);
        if (!job) job = await reportQueue.getJob(id);

        if (!job) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        const state    = await job.getState();
        const progress = job.progress;

        res.json({
            id:           job.id,
            name:         job.name,
            status:       state,
            progress:     progress || 0,
            result:       job.returnvalue  || null,
            failedReason: job.failedReason || null,
            attempts:     job.attemptsMade,
            createdAt:    new Date(job.timestamp).toISOString(),
            processedAt:  job.processedOn
                ? new Date(job.processedOn).toISOString()
                : null,
            finishedAt:   job.finishedOn
                ? new Date(job.finishedOn).toISOString()
                : null,
        });

    } catch (error) {
        next(error);
    }
});


// Trigger Attendance Report
router.post(
    "/reports/attendance",
    protect,
    authorize("faculty"),
    async (req, res, next) => {
        try {
            const { courseId } = req.body;

            if (!courseId) {
                return res.status(400).json({
                    message: "courseId is required"
                });
            }

            // verify faculty is instructor of this course
            const course = await pool.query(
                "SELECT id, instructor FROM courses WHERE id = $1",
                [courseId]
            );

            if (course.rows.length === 0) {
                return res.status(404).json({
                    message: "Course not found"
                });
            }

            if (course.rows[0].instructor !== req.user.id) {
                return res.status(403).json({
                    message: "Not your course"
                });
            }

            // add PDF generation job to queue
            const job = await reportQueue.add(
                "attendance_report",
                {
                    courseId,
                    facultyId: req.user.id,
                }
            );

            logger.info({
                message:  "attendance_report job queued",
                jobId:    job.id,
                courseId,
                facultyId: req.user.id,
            });

            // return immediately - job runs in background
            res.status(202).json({
                message: "Report generation started",
                jobId:   job.id,
                statusUrl: `/api/jobs/${job.id}/status`,
            });

        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;