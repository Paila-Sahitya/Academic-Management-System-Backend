const { emailQueue } = require("../queues/index");
const logger         = require("../config/logger");

const addAttendanceWarningJob = async ({
    studentEmail,
    studentName,
    courseName,
    percentage,
}) => {
    try {
        const job = await emailQueue.add(
            "attendance_warning",
            { studentEmail, studentName, courseName, percentage },
            {
                // deduplicate - don't spam same student
                // same job key = skip if already queued
                jobId: `warning:${studentEmail}:${courseName}`,
            }
        );

        logger.info({
            message:     "attendance_warning job added",
            jobId:       job.id,
            studentEmail,
            percentage,
        });

        return job.id;

    } catch (err) {
        logger.error({
            message: "Failed to add attendance_warning job",
            error:   err.message,
            studentEmail,
        });
        return null;
    }
};

module.exports = addAttendanceWarningJob;