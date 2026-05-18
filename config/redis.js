const Redis  = require("ioredis");
const logger = require("./logger");

const redis = new Redis({
    host:          process.env.REDIS_HOST || "127.0.0.1",
    port:          Number(process.env.REDIS_PORT) || 6379,
    retryStrategy: (times) => {
        // exponential backoff — max 30 seconds between retries
        const delay = Math.min(times * 1000, 30000);
        logger.warn(`Redis retry attempt ${times} — next in ${delay}ms`);
        return delay;
    },
    lazyConnect:        true,  // don't connect until first command
    maxRetriesPerRequest: 3,   // fail fast per request if Redis is down
    enableReadyCheck:   true,
});

// Connection events
redis.on("connect", () => {
    logger.info("Redis connected");
});

redis.on("ready", () => {
    logger.info("Redis ready to accept commands");
});

redis.on("error", (err) => {
    logger.error(`Redis error: ${err.message}`);
});

redis.on("reconnecting", (ms) => {
    logger.warn(`Redis reconnecting in ${ms}ms`);
});

redis.on("close", () => {
    logger.warn("Redis connection closed");
});

module.exports = redis;