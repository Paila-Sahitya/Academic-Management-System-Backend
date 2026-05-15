const { z } = require("zod");

const submitAppealSchema = z.object({
    enrollmentId: z.number({ required_error: "enrollmentId is required" })
                   .int("enrollmentId must be an integer")
                   .positive("enrollmentId must be positive"),

    reason:       z.string({ required_error: "Reason is required" })
                   .min(10, "Reason must be at least 10 characters")
                   .max(1000, "Reason cannot exceed 1000 characters")
                   .trim(),
});

const resolveAppealSchema = z.object({
    status:    z.enum(["approved", "rejected"], {
                   errorMap: () => ({
                       message: "status must be 'approved' or 'rejected'"
                   })
               }),

    adminNote: z.string()
                .min(5,  "Admin note must be at least 5 characters")
                .max(500, "Admin note cannot exceed 500 characters")
                .trim()
                .optional(),

    overrideEligibility: z.boolean().optional(),

    overrideMarks: z.number()
                    .int("overrideMarks must be an integer")
                    .min(0,   "overrideMarks cannot be negative")
                    .max(100, "overrideMarks cannot exceed 100")
                    .optional(),
});

module.exports = { submitAppealSchema, resolveAppealSchema };