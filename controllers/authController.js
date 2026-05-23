const pool = require("../db/index");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const addWelcomeEmailJob = require("../jobs/welcomeEmail");

//register
exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // check if user already exists
        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // insert new user
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, role, created_at`,
            [name, email, hashedPassword, role || "student"]
        );

        const user = result.rows[0];

        // add welcome email job (non-blocking)
        const jobId = await addWelcomeEmailJob({
            name:  user.name,
            email: user.email,
        });

        logger.info({
            message: "User registered",
            userId:  user.id,
            email:   user.email,
            jobId,
        });

        res.status(201).json(user);

    } catch (error) {
        next(error);
    }
};

// login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // find user by email
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "User not found"
            });
        }

        const user = result.rows[0];

        // compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid credentials"
            });
        }

        // sign token
        const token = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({ token });

    } catch (error) {
        next(error);
    }
};