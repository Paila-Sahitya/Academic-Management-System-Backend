const redis  = require("../config/redis");
const logger = require("../config/logger");

const cache = {

    // Get
    async get(key) {
        try {
            const value = await redis.get(key);
            if (value) {
                logger.info({
                    message:  "Cache HIT",
                    key,
                });
                return JSON.parse(value);
            }
            logger.info({
                message: "Cache MISS",
                key,
            });
            return null;
        } catch (err) {
            logger.warn({
                message: "Cache GET failed — falling through to DB",
                key,
                error:   err.message,
            });
            return null; // graceful degradation
        }
    },

    //Set
    async set(key, value, ttlSeconds = 600) {
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
            logger.info({
                message: "Cache SET",
                key,
                ttl:     `${ttlSeconds}s`,
            });
        } catch (err) {
            logger.warn({
                message: "Cache SET failed — continuing without cache",
                key,
                error:   err.message,
            });
        }
    },

    // DELETE single key
    async del(key) {
        try {
            await redis.del(key);
            logger.info({
                message: "Cache DEL",
                key,
            });
        } catch (err) {
            logger.warn({
                message: "Cache DEL failed",
                key,
                error:   err.message,
            });
        }
    },

    // DELETE by pattern 
    async delPattern(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length === 0) {
                logger.info({
                    message: "Cache delPattern — no keys found",
                    pattern,
                });
                return;
            }
            await redis.del(...keys);
            logger.info({
                message:      "Cache invalidated",
                pattern,
                keysDeleted:  keys.length,
                keys,
            });
        } catch (err) {
            logger.warn({
                message: "Cache delPattern failed",
                pattern,
                error:   err.message,
            });
        }
    },

    // CHECK if key exists
    async exists(key) {
        try {
            const result = await redis.exists(key);
            return result === 1;
        } catch (err) {
            logger.warn({
                message: "Cache EXISTS check failed",
                key,
                error:   err.message,
            });
            return false;
        }
    },

    //  GET remaining TTL 
    async ttl(key) {
        try {
            return await redis.ttl(key);
            // returns: seconds remaining
            // -1 = key exists but no TTL
            // -2 = key does not exist
        } catch (err) {
            logger.warn({
                message: "Cache TTL check failed",
                key,
                error:   err.message,
            });
            return -2;
        }
    },
};

module.exports = cache;