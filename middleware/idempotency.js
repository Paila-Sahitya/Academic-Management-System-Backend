const logger = require("../config/logger");

let redis;
try {
    redis = require("../config/redis");
} catch {
    redis = null;
}

const IDEMPOTENCY_TTL = 86400; // 24 hours in seconds

const idempotency = async (req, res, next) => {
    const key = req.headers["x-idempotency-key"];

    // no key provided - skip idempotency (not mandatory)
    if (!key) return next();

    // validate key is a proper UUID
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(key)) {
        return res.status(400).json({
            message: "X-Idempotency-Key must be a valid UUID v4"
        });
    }

    // if Redis not available - skip (graceful degradation)
    if (!redis) {
        logger.warn("Idempotency middleware skipped — Redis unavailable");
        return next();
    }

    const redisKey = `idempotency:${key}`;

    try {
        // check if this key was already processed
        const cached = await redis.get(redisKey);

        if (cached) {
            const { status, body } = JSON.parse(cached);

            logger.info({
                message:        "Idempotent request — returning cached response",
                idempotencyKey: key,
                path:           req.path,
                cachedStatus:   status,
            });

            return res.status(status).json(body);
        }

        // intercept res.json to capture and store the response
        const originalJson = res.json.bind(res);

        res.json = async (body) => {
            try {
                // store response with 24hr TTL
                await redis.setex(
                    redisKey,
                    IDEMPOTENCY_TTL,
                    JSON.stringify({
                        status: res.statusCode,
                        body
                    })
                );

                logger.info({
                    message:        "Idempotency key stored",
                    idempotencyKey: key,
                    status:         res.statusCode,
                });
            } catch (err) {
                // if storing fails - log but don't crash
                logger.warn(`Failed to store idempotency key: ${err.message}`);
            }

            // call original res.json to send the response
            return originalJson(body);
        };

        next();

    } catch (err) {
        // Redis error - skip idempotency, don't fail request
        logger.warn(`Idempotency middleware error: ${err.message}`);
        next();
    }
};

module.exports = idempotency;