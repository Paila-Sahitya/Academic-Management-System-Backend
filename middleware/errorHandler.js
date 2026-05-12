const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {

    // log full error with stack trace to file
    logger.error({
        message:  err.message,
        stack:    err.stack,
        method:   req.method,
        path:     req.path,
        userId:   req.user ? req.user.id : null,
        body:     req.body,
    });

    // determine status code
    const status = err.status || err.statusCode || 500;

    // never send stack trace to client
    // in production, hide internal error details
    const message = status === 500
        ? "Internal server error"
        : err.message;

    res.status(status).json({ message });
};

module.exports = errorHandler;