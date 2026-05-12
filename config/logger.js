const winston = require("winston");
const path    = require("path");
const fs      = require("fs");

// create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",

    format: winston.format.combine(
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),

    transports: [
        // console — readable during development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    const extra = Object.keys(meta).length
                        ? " " + JSON.stringify(meta)
                        : "";
                    return `${timestamp} [${level}]: ${message}${extra}`;
                })
            )
        }),

        // all logs - combined.log
        new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
            maxsize:  5242880,  // 5MB
            maxFiles: 5
        }),

        // errors only - error.log
        new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level:    "error",
            maxsize:  5242880,
            maxFiles: 5
        })
    ]
});

module.exports = logger;