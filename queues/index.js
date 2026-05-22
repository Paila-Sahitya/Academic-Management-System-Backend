const { Queue } = require("bullmq");
const logger    = require("../config/logger");

// Shared Redis connection config for BullMQ
// BullMQ needs its own connection config object
// (separate from ioredis instance used for caching)
const redisConnection = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
};

// Default job options - applied to all jobs
const defaultJobOptions = {
    attempts: 3,
    backoff: {
        type:  "exponential",
        delay: 1000,         // 1s -> 2s -> 4s
    },
    removeOnComplete: {
        age:   3600,         // keep completed jobs for 1 hour
        count: 100,          // keep last 100 completed jobs
    },
    removeOnFail: {
        age: 86400,          // keep failed jobs for 24 hours
    },
};

// Queues

// email queue - welcome emails, attendance warnings, weekly digest
const emailQueue = new Queue("emailQueue", {
    connection:         redisConnection,
    defaultJobOptions,
});

// report queue - PDF generation jobs
const reportQueue = new Queue("reportQueue", {
    connection:         redisConnection,
    defaultJobOptions,
});

// Log queue events
emailQueue.on("error", (err) => {
    logger.error({ message: "emailQueue error", error: err.message });
});

reportQueue.on("error", (err) => {
    logger.error({ message: "reportQueue error", error: err.message });
});

logger.info("BullMQ queues initialised");

module.exports = { emailQueue, reportQueue, redisConnection };