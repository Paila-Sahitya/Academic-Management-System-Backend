const morgan  = require("morgan");
const logger  = require("../config/logger");

// custom token — userId from JWT (attached by protect middleware)
morgan.token("userId", (req) => {
    return req.user ? String(req.user.id) : "guest";
});

// custom token — response time in ms
morgan.token("timeTaken", (req) => {
    if (!req._startAt) return "0ms";
    const diff = process.hrtime(req._startAt);
    const ms   = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    return `${ms}ms`;
});

const requestLogger = morgan(
    (tokens, req, res) => {
        const status = parseInt(tokens.status(req, res)) || 0;

        const logData = {
            method:   tokens.method(req, res),
            path:     tokens.url(req, res),
            status,
            duration: tokens.timeTaken(req, res),
            userId:   tokens.userId(req, res),
            ip:       tokens["remote-addr"](req, res),
        };

        // log at different levels based on status code
        if (status >= 500)      logger.error({ message: "Server error",   ...logData });
        else if (status >= 400) logger.warn({  message: "Client error",   ...logData });
        else                    logger.info({  message: "Request handled", ...logData });

        return null;
    }
);

module.exports = requestLogger;