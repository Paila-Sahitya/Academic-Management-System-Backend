const { z } = require("zod");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createCourseSchema = z.object({
    courseName:   z.string({ required_error: "Course name is required" })
                   .min(2, "Course name must be at least 2 characters")
                   .max(150, "Course name cannot exceed 150 characters")
                   .trim(),

    courseCode:   z.string({ required_error: "Course code is required" })
                   .min(2, "Course code must be at least 2 characters")
                   .max(20, "Course code cannot exceed 20 characters")
                   .toUpperCase(),

    instructor:   z.number({ required_error: "Instructor ID is required" })
                   .int("Instructor ID must be an integer")
                   .positive("Instructor ID must be positive"),

    department:   z.string()
                   .min(2)
                   .max(20)
                   .toUpperCase()
                   .optional(),

    maxStudents:  z.number()
                   .int("maxStudents must be an integer")
                   .min(1, "maxStudents must be at least 1")
                   .max(1000, "maxStudents cannot exceed 1000")
                   .optional(),

    startDate:    z.string()
                   .regex(dateRegex, "startDate must be in YYYY-MM-DD format")
                   .optional(),

    endDate:      z.string()
                   .regex(dateRegex, "endDate must be in YYYY-MM-DD format")
                   .optional(),

    totalClasses: z.number()
                   .int("totalClasses must be an integer")
                   .min(1, "totalClasses must be at least 1")
                   .optional(),

}).refine(
    (data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) < new Date(data.endDate);
        }
        return true;
    },
    {
        message: "startDate must be before endDate",
        path:    ["startDate"],
    }
);

const updateCourseSchema = z.object({
    maxStudents:  z.number()
                   .int()
                   .min(1)
                   .max(1000)
                   .optional(),

    startDate:    z.string()
                   .regex(dateRegex, "startDate must be in YYYY-MM-DD format")
                   .optional(),

    endDate:      z.string()
                   .regex(dateRegex, "endDate must be in YYYY-MM-DD format")
                   .optional(),

    totalClasses: z.number()
                   .int()
                   .min(1)
                   .optional(),

}).refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided to update" }
).refine(
    (data) => {
        if (data.startDate && data.endDate) {
            return new Date(data.startDate) < new Date(data.endDate);
        }
        return true;
    },
    {
        message: "startDate must be before endDate",
        path:    ["startDate"],
    }
);

module.exports = { createCourseSchema, updateCourseSchema };