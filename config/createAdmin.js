const pool = require("../db/index");
const bcrypt = require("bcryptjs");

const createAdmin = async () => {
    try {
        // check if admin already exists
        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            ["admin@system.com"]
        );

        if (existing.rows.length > 0) {
            console.log("Admin already exists");
            return;
        }

        // hash password
        const hashedPassword = await bcrypt.hash("admin123", 10);

        // insert admin
        await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1, $2, $3, $4)`,
            ["System Admin", "admin@system.com", hashedPassword, "admin"]
        );

        console.log("Admin user created");

    } catch (error) {
        console.error("Admin creation failed:", error.message);
    }
};

module.exports = createAdmin;