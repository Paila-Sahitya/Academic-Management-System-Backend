const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            // format Zod errors into clean readable array
            const errors = result.error.issues.map((e) => ({
                field:   e.path.join(".") || "body",
                message: e.message,
            }));

            return res.status(400).json({
                message: "Validation failed",
                errors,
            });
        }

        // replace req.body with Zod's parsed + coerced data
        req.body = result.data;
        next();
    };
};

module.exports = validate;