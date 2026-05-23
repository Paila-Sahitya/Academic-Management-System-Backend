const { emailQueue } = require("../queues/index");
const logger         = require("../config/logger");

const addWelcomeEmailJob = async ({ name, email }) => {
    try {
        const job = await emailQueue.add(
            "welcome_email",
            { name, email },
            {
                // override default - welcome email tries more
                attempts: 5,
                backoff: {
                    type:  "exponential",
                    delay: 2000,
                },
            }
        );

        logger.info({
            message: "welcome_email job added",
            jobId:   job.id,
            email,
        });

        return job.id;

    } catch (err) {
        // job failure must never break registration
        logger.error({
            message: "Failed to add welcome_email job",
            error:   err.message,
            email,
        });
        return null;
    }
};

module.exports = addWelcomeEmailJob;