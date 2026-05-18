const express = require("express");
const pool    = require("../db/index");
const logger  = require("../config/logger");
const redis   = require("../config/redis");
const router  = express.Router();

// Liveliness - is the process alive
router.get("/health", (req, res) => {
    res.json({
        status:    "ok",
        uptime:    Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        pid:       process.pid,
    });
});


// Readiness- are all dependencies ready
router.get("/health/ready", async (req, res) => {
    const checks = {};
    let   allOk  = true;

    // check PostgreSQL
    try {
        const start = Date.now();
        await pool.query("SELECT 1");
        checks.database = {
            status:       "ok",
            responseTime: `${Date.now() - start}ms`
        };
    } catch (err) {
        logger.error(`Health check — DB unreachable: ${err.message}`);
        checks.database = { status: "unreachable" };
        allOk = false;
    }

    // check Redis
    try {
        const start = Date.now();
        await redis.ping();
        checks.redis = {
            status:       "ok",
            responseTime: `${Date.now() - start}ms`
        };
    } catch (err) {
        logger.error(`Health check — Redis unreachable: ${err.message}`);
        checks.redis = { status: "unreachable" };
        allOk = false;
    }

    const httpStatus = allOk ? 200 : 503;

    res.status(httpStatus).json({
        status:    allOk ? "ready" : "not ready",
        checks,
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;