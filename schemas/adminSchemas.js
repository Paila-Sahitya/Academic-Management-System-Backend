const { z } = require("zod");

const createDeptSchema = z.object({
    name: z.string({ required_error: "Department name is required" })
           .min(2,   "Name must be at least 2 characters")
           .max(100, "Name cannot exceed 100 characters")
           .trim(),

    code: z.string({ required_error: "Department code is required" })
           .min(2,  "Code must be at least 2 characters")
           .max(20, "Code cannot exceed 20 characters")
           .toUpperCase(),
});

const createDeptAdminSchema = z.object({
    name:       z.string({ required_error: "Name is required" })
                 .min(2,   "Name must be at least 2 characters")
                 .max(100, "Name cannot exceed 100 characters")
                 .trim(),

    email:      z.string({ required_error: "Email is required" })
                 .email("Invalid email format")
                 .toLowerCase(),

    password:   z.string({ required_error: "Password is required" })
                 .min(6, "Password must be at least 6 characters"),

    department: z.string({ required_error: "Department code is required" })
                 .min(2,  "Department code must be at least 2 characters")
                 .max(20, "Department code cannot exceed 20 characters")
                 .toUpperCase(),
});

module.exports = { createDeptSchema, createDeptAdminSchema };