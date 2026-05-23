const { emailQueue } = require("../queues/index");
const logger         = require("../config/logger");
const pool           = require("../db/index");

const scheduleWeeklyDigest = async () => {
    try {
        // fetch system stats for the digest
        const [users, courses, enrollments, appeals] = await Promise.all([
            pool.query("SELECT COUNT(*) FROM users"),
            pool.query("SELECT COUNT(*) FROM courses"),
            pool.query("SELECT COUNT(*) FROM enrollments"),
            pool.query("SELECT COUNT(*) FROM appeals WHERE status = 'pending'"),
        ]);

        const stats = {
            totalUsers:       parseInt(users.rows[0].count),
            totalCourses:     parseInt(courses.rows[0].count),
            totalEnrollments: parseInt(enrollments.rows[0].count),
            pendingAppeals:   parseInt(appeals.rows[0].count),
        };

        const job = await emailQueue.add(
            "weekly_digest",
            {
                adminEmail: "admin@system.com",
                stats,
            },
            {
                // repeat every Monday at 9am
                repeat: {
                    pattern: "0 9 * * 1",
                },
                // unique job id prevents duplicate schedules
                jobId: "weekly_digest_cron",
            }
        );

        logger.info({
            message: "weekly_digest job scheduled",
            jobId:   job.id,
            stats,
        });

        return job.id;

    } catch (err) {
        logger.error({
            message: "Failed to schedule weekly_digest",
            error:   err.message,
        });
        return null;
    }
};

module.exports = scheduleWeeklyDigest;