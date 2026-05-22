const { Worker } = require("bullmq");
const nodemailer  = require("nodemailer");
const logger      = require("../config/logger");
const { redisConnection } = require("../queues/index");

//  Create mock SMTP transport (Ethereal) 
// Ethereal creates a fake inbox - no real emails sent
// Every email gets a preview URL you can open in browser
let transporter;

async function getTransporter() {
    if (transporter) return transporter;

    // create one-time test account
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
        host:   "smtp.ethereal.email",
        port:   587,
        secure: false,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });

    logger.info({
        message:  "Ethereal SMTP account created",
        user:     testAccount.user,
        inboxUrl: "https://ethereal.email",
    });

    return transporter;
}


//  Job processors 

async function processWelcomeEmail(job) {
    const { name, email } = job.data;

    logger.info({
        message: "Processing welcome_email job",
        jobId:   job.id,
        email,
    });

    const transport = await getTransporter();

    const info = await transport.sendMail({
        from:    '"AMS System" <noreply@ams.com>',
        to:      email,
        subject: "Welcome to Academic Management System",
        html: `
            <h2>Welcome, ${name}!</h2>
            <p>Your account has been created successfully.</p>
            <p>You can now log in and explore your courses.</p>
            <br/>
            <p>- AMS Team</p>
        `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    logger.info({
        message:    "Welcome email sent",
        jobId:      job.id,
        email,
        messageId:  info.messageId,
        previewUrl,
    });

    return { messageId: info.messageId, previewUrl };
}


async function processAttendanceWarning(job) {
    const { studentEmail, studentName, courseName, percentage } = job.data;

    logger.info({
        message:    "Processing attendance_warning job",
        jobId:      job.id,
        studentEmail,
        percentage,
    });

    const transport = await getTransporter();

    const info = await transport.sendMail({
        from:    '"AMS System" <noreply@ams.com>',
        to:      studentEmail,
        subject: `Attendance Warning - ${courseName}`,
        html: `
            <h2>Attendance Warning</h2>
            <p>Dear ${studentName},</p>
            <p>
                Your attendance in <strong>${courseName}</strong> has dropped
                to <strong>${percentage}%</strong>.
            </p>
            <p>
                A minimum of <strong>50% attendance</strong> is required
                to be eligible for marks entry.
            </p>
            <p>Please attend classes regularly to avoid disqualification.</p>
            <br/>
            <p>- AMS Team</p>
        `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    logger.info({
        message:     "Attendance warning sent",
        jobId:       job.id,
        studentEmail,
        percentage,
        previewUrl,
    });

    return { messageId: info.messageId, previewUrl };
}


async function processWeeklyDigest(job) {
    const { adminEmail, stats } = job.data;

    logger.info({
        message: "Processing weekly_digest job",
        jobId:   job.id,
        adminEmail,
    });

    const transport = await getTransporter();

    const info = await transport.sendMail({
        from:    '"AMS System" <noreply@ams.com>',
        to:      adminEmail,
        subject: `AMS Weekly Digest - ${new Date().toDateString()}`,
        html: `
            <h2>Weekly Summary</h2>
            <table border="1" cellpadding="8" cellspacing="0">
                <tr>
                    <td><strong>Total Users</strong></td>
                    <td>${stats.totalUsers}</td>
                </tr>
                <tr>
                    <td><strong>Total Courses</strong></td>
                    <td>${stats.totalCourses}</td>
                </tr>
                <tr>
                    <td><strong>Total Enrollments</strong></td>
                    <td>${stats.totalEnrollments}</td>
                </tr>
                <tr>
                    <td><strong>Pending Appeals</strong></td>
                    <td>${stats.pendingAppeals}</td>
                </tr>
            </table>
            <br/>
            <p>- AMS Automated Report</p>
        `,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    logger.info({
        message:    "Weekly digest sent",
        jobId:      job.id,
        adminEmail,
        previewUrl,
    });

    return { messageId: info.messageId, previewUrl };
}


//  Worker - processes all email job types 
const emailWorker = new Worker(
    "emailQueue",

    // processor function - called for each job
    async (job) => {
        logger.info({
            message:  "emailWorker picked up job",
            jobId:    job.id,
            jobName:  job.name,
            attempt:  job.attemptsMade + 1,
        });

        // route to correct processor based on job name
        switch (job.name) {
            case "welcome_email":
                return await processWelcomeEmail(job);

            case "attendance_warning":
                return await processAttendanceWarning(job);

            case "weekly_digest":
                return await processWeeklyDigest(job);

            default:
                logger.warn({
                    message: "emailWorker received unknown job type",
                    jobName: job.name,
                });
                throw new Error(`Unknown job type: ${job.name}`);
        }
    },

    {
        connection:  redisConnection,
        concurrency: 5,     // process up to 5 jobs simultaneously
    }
);


//  Worker lifecycle events 
emailWorker.on("completed", (job, result) => {
    logger.info({
        message:  "emailWorker job completed",
        jobId:    job.id,
        jobName:  job.name,
        result,
    });
});

emailWorker.on("failed", (job, err) => {
    logger.error({
        message:      "emailWorker job failed",
        jobId:        job.id,
        jobName:      job.name,
        attempt:      job.attemptsMade,
        error:        err.message,
        willRetry:    job.attemptsMade < job.opts.attempts,
    });
});

emailWorker.on("error", (err) => {
    logger.error({
        message: "emailWorker error",
        error:   err.message,
    });
});

emailWorker.on("stalled", (jobId) => {
    logger.warn({
        message: "emailWorker job stalled",
        jobId,
    });
});

logger.info("emailWorker started - listening for jobs");

module.exports = emailWorker;