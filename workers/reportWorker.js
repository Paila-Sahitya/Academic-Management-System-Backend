const { Worker } = require("bullmq");
const PDFDocument = require("pdfkit");
const fs          = require("fs");
const path        = require("path");
const logger      = require("../config/logger");
const pool        = require("../db/index");
const { redisConnection } = require("../queues/index");

// Ensure reports directory exists
const reportsDir = path.join(process.cwd(), "reports");
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}


// Processor - attendance report PDF 
async function processAttendanceReport(job) {
    const { courseId, facultyId } = job.data;

    logger.info({
        message:  "Processing attendance_report job",
        jobId:    job.id,
        courseId,
        facultyId,
    });

    // update job progress
    await job.updateProgress(10);

    // fetch course details
    const courseResult = await pool.query(
        `SELECT
            c.course_name,
            c.course_code,
            c.total_classes,
            c.start_date,
            c.end_date,
            u.name AS instructor_name
         FROM courses c
         JOIN users u ON c.instructor = u.id
         WHERE c.id = $1`,
        [courseId]
    );

    if (courseResult.rows.length === 0) {
        throw new Error(`Course ${courseId} not found`);
    }

    const course = courseResult.rows[0];
    await job.updateProgress(30);

    // fetch all enrollments with student details
    const enrollmentResult = await pool.query(
        `SELECT
            u.name            AS student_name,
            u.email           AS student_email,
            e.attended_classes,
            e.status,
            e.is_eligible,
            e.marks,
            CASE
                WHEN c.total_classes > 0
                THEN ROUND(
                    (e.attended_classes::DECIMAL / c.total_classes) * 100,
                    2
                )
                ELSE 0
            END AS attendance_percentage
         FROM enrollments e
         JOIN users u    ON e.student_id  = u.id
         JOIN courses c  ON e.course_id   = c.id
         WHERE e.course_id = $1
         AND   e.status NOT IN ('waitlisted', 'dropped')
         ORDER BY u.name ASC`,
        [courseId]
    );

    const enrollments = enrollmentResult.rows;
    await job.updateProgress(60);

    // Generate PDF 
    const fileName  = `attendance_${courseId}_${Date.now()}.pdf`;
    const filePath  = path.join(reportsDir, fileName);

    await new Promise((resolve, reject) => {
        const doc  = new PDFDocument({ margin: 40 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Header 
        doc
            .fontSize(20)
            .font("Helvetica-Bold")
            .text("Academic Management System", { align: "center" });

        doc
            .fontSize(14)
            .font("Helvetica")
            .text("Attendance Report", { align: "center" });

        doc.moveDown();

        //  Course Info 
        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .text("Course Details", { underline: true });

        doc.font("Helvetica").fontSize(10);
        doc.text(`Course Name  : ${course.course_name}`);
        doc.text(`Course Code  : ${course.course_code}`);
        doc.text(`Instructor   : ${course.instructor_name}`);
        doc.text(`Total Classes: ${course.total_classes || "N/A"}`);
        doc.text(`Start Date   : ${course.start_date
            ? new Date(course.start_date).toDateString() : "N/A"}`);
        doc.text(`End Date     : ${course.end_date
            ? new Date(course.end_date).toDateString()   : "N/A"}`);
        doc.text(`Generated At : ${new Date().toDateString()}`);

        doc.moveDown();

        // Summary 
        const eligible    = enrollments.filter(e => e.is_eligible).length;
        const notEligible = enrollments.length - eligible;

        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .text("Summary", { underline: true });

        doc.font("Helvetica").fontSize(10);
        doc.text(`Total Students  : ${enrollments.length}`);
        doc.text(`Eligible        : ${eligible}`);
        doc.text(`Not Eligible    : ${notEligible}`);

        doc.moveDown();

        // Table Header 
        doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .text("Student Attendance", { underline: true });

        doc.moveDown(0.5);

        // column positions
        const col = {
            name:       40,
            email:      180,
            attended:   350,
            percentage: 410,
            eligible:   470,
            status:     510,
        };

        // table header row
        doc
            .fontSize(9)
            .font("Helvetica-Bold")
            .text("Name",        col.name,       doc.y, { continued: true })
            .text("Email",       col.email,      doc.y, { continued: true })
            .text("Attended",    col.attended,   doc.y, { continued: true })
            .text("%",           col.percentage, doc.y, { continued: true })
            .text("Eligible",    col.eligible,   doc.y, { continued: true })
            .text("Status",      col.status,     doc.y);

        doc
            .moveTo(40, doc.y + 2)
            .lineTo(560, doc.y + 2)
            .stroke();

        doc.moveDown(0.3);

        // Table Rows
        doc.font("Helvetica").fontSize(8);

        enrollments.forEach((e, index) => {
            // alternate row background
            if (index % 2 === 0) {
                doc
                    .rect(40, doc.y - 2, 520, 14)
                    .fill("#f5f5f5")
                    .fillColor("black");
            }

            const y = doc.y;

            doc
                .text(
                    e.student_name.substring(0, 18),
                    col.name, y, { continued: true }
                )
                .text(
                    e.student_email.substring(0, 22),
                    col.email, y, { continued: true }
                )
                .text(
                    String(e.attended_classes),
                    col.attended, y, { continued: true }
                )
                .text(
                    `${e.attendance_percentage}%`,
                    col.percentage, y, { continued: true }
                )
                .text(
                    e.is_eligible ? "Yes" : "No",
                    col.eligible, y, { continued: true }
                )
                .text(
                    e.status,
                    col.status, y
                );

            // new page if needed
            if (doc.y > 700) doc.addPage();
        });

        //  Footer 
        doc.moveDown(2);
        doc
            .fontSize(8)
            .fillColor("grey")
            .text(
                `Generated by AMS — ${new Date().toISOString()}`,
                { align: "center" }
            );

        doc.end();

        stream.on("finish", resolve);
        stream.on("error",  reject);
    });

    await job.updateProgress(100);

    logger.info({
        message:  "Attendance report PDF generated",
        jobId:    job.id,
        courseId,
        fileName,
        filePath,
    });

    return {
        fileName,
        filePath,
        totalStudents: enrollments.length,
        generatedAt:   new Date().toISOString(),
    };
}


// Worker 
const reportWorker = new Worker(
    "reportQueue",

    async (job) => {
        logger.info({
            message: "reportWorker picked up job",
            jobId:   job.id,
            jobName: job.name,
            attempt: job.attemptsMade + 1,
        });

        switch (job.name) {
            case "attendance_report":
                return await processAttendanceReport(job);

            default:
                throw new Error(`Unknown report job type: ${job.name}`);
        }
    },

    {
        connection:  redisConnection,
        concurrency: 2,     // PDFs are CPU intensive - keep low
    }
);


// Worker lifecycle events 
reportWorker.on("completed", (job, result) => {
    logger.info({
        message:  "reportWorker job completed",
        jobId:    job.id,
        jobName:  job.name,
        fileName: result.fileName,
    });
});

reportWorker.on("failed", (job, err) => {
    logger.error({
        message:   "reportWorker job failed",
        jobId:     job.id,
        jobName:   job.name,
        attempt:   job.attemptsMade,
        error:     err.message,
        willRetry: job.attemptsMade < job.opts.attempts,
    });
});

reportWorker.on("progress", (job, progress) => {
    logger.info({
        message:  "reportWorker job progress",
        jobId:    job.id,
        progress: `${progress}%`,
    });
});

reportWorker.on("error", (err) => {
    logger.error({
        message: "reportWorker error",
        error:   err.message,
    });
});

logger.info("reportWorker started — listening for jobs");

module.exports = reportWorker;