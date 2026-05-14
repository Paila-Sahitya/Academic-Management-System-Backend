const rateLimit = require("express-rate-limit");
const logger    = require("../config/logger");

//HELPER — builds consistent rate limit config 
const createLimiter = (windowMinutes, max, name) => {
    return rateLimit({
        windowMs:        windowMinutes * 60 * 1000,
        max,
        standardHeaders: true,   // sends RateLimit-* headers
        legacyHeaders:   false,  // disables X-RateLimit-* headers

        // log when someone hits the limit
        handler: (req, res) => {
            logger.warn({
                message:  "Rate limit exceeded",
                limiter:  name,
                ip:       req.ip,
                path:     req.path,
                userId:   req.user ? req.user.id : "guest",
            });

            res.status(429).json({
                message: `Too many requests — limit is ${max} per ${windowMinutes} minutes. Try again later.`
            });
        },

        // skip rate limiting in test environment
        skip: () => process.env.NODE_ENV === "test",
    });
};


// imiters

// global — applied to all /api/ routes
const globalLimiter = createLimiter(15, 100, "global");

// strict — login endpoint (brute force protection)
const authLimiter = createLimiter(15, 10, "auth");

// enrollment — prevent spam enrollment attempts
const enrollLimiter = createLimiter(15, 20, "enroll");

// marks — faculty updating marks
const marksLimiter = createLimiter(15, 30, "marks");

// attendance — faculty marking attendance daily
const attendanceLimiter = createLimiter(15, 60, "attendance");


module.exports = {
    globalLimiter,
    authLimiter,
    enrollLimiter,
    marksLimiter,
    attendanceLimiter,
};