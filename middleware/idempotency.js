const logger = require("../config/logger");
const redis  = require("../config/redis");

const IDEMPOTENCY_TTL = 86400; // 24 hours

const idempotency = async (req, res, next) => {
    const key = req.headers["x-idempotency-key"];

    // no key - skip
    if (!key) return next();

    // validate UUID format
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(key)) {
        return res.status(400).json({
            message: "X-Idempotency-Key must be a valid UUID v4"
        });
    }

    const redisKey = `idempotency:${key}`;

    try {
        // check Redis for existing response
        const cached = await redis.get(redisKey);

        if (cached) {
            const { status, body } = JSON.parse(cached);

            logger.info({
                message:        "Idempotent request - returning cached response",
                idempotencyKey: key,
                path:           req.path,
                cachedStatus:   status,
            });

            return res.status(status).json(body);
        }

        // intercept res.json to capture and store response
        const originalJson = res.json.bind(res);

        res.json = async (body) => {
            try {
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
                    path:           req.path,
                });
            } catch (err) {
                logger.warn({
                    message: "Failed to store idempotency key",
                    error:   err.message,
                    key,
                });
            }

            return originalJson(body);
        };

        next();

    } catch (err) {
        // Redis down - skip idempotency, don't fail request
        logger.warn({
            message: "Idempotency middleware skipped - Redis error",
            error:   err.message,
        });
        next();
    }
};

module.exports = idempotency;