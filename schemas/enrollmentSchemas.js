const { z } = require("zod");

const enrollSchema = z.object({
    courseId: z.number({ required_error: "courseId is required" })
               .int("courseId must be an integer")
               .positive("courseId must be a positive number"),
});

const marksSchema = z.object({
    marks: z.number({ required_error: "marks is required" })
            .int("marks must be an integer")
            .min(0,   "marks cannot be negative")
            .max(100, "marks cannot exceed 100"),
});

const attendanceSchema = z.object({
    present: z.boolean({
        required_error: "present field is required",
        invalid_type_error: "present must be true or false"
    }),
});

module.exports = { enrollSchema, marksSchema, attendanceSchema };