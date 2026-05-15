const { z } = require("zod");

const registerSchema = z.object({
    name:     z.string({ required_error: "Name is required" })
               .min(2, "Name must be at least 2 characters")
               .max(100, "Name cannot exceed 100 characters")
               .trim(),

    email:    z.string({ required_error: "Email is required" })
               .email("Invalid email format")
               .toLowerCase(),

    password: z.string({ required_error: "Password is required" })
               .min(6, "Password must be at least 6 characters")
               .max(100, "Password cannot exceed 100 characters"),

    role:     z.enum(
                  ["admin", "faculty", "student", "department_admin"],
                  { errorMap: () => ({ message: "Invalid role" }) }
              )
              .optional()
              .default("student"),
});

const loginSchema = z.object({
    email:    z.string({ required_error: "Email is required" })
               .email("Invalid email format"),

    password: z.string({ required_error: "Password is required" })
               .min(1, "Password is required"),
});

module.exports = { registerSchema, loginSchema };