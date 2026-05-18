const pool   = require("../db/index");
const bcrypt = require("bcryptjs");
const cache  = require("../helpers/cache");

// Create Department
exports.createDepartment = async (req, res, next) => {
    try {
        const { name, code } = req.body;

        // check duplicate code
        const existing = await pool.query(
            "SELECT id FROM departments WHERE code = $1",
            [code.toUpperCase()]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "Department code already exists"
            });
        }

        const result = await pool.query(
            `INSERT INTO departments (name, code, created_by)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [name, code.toUpperCase(), req.user.id]
        );

        // invalidate departments cache
        await cache.del("departments:all");

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
};


// Create Department Admin
exports.createDepartmentAdmin = async (req, res, next) => {
    try {
        const { name, email, password, department } = req.body;

        // check department exists
        const dept = await pool.query(
            "SELECT id FROM departments WHERE code = $1",
            [department.toUpperCase()]
        );

        if (dept.rows.length === 0) {
            return res.status(400).json({
                message: "Department not found"
            });
        }

        // check email not already in use
        const existing = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({
                message: "Email already in use"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role, department)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, name, email, role, department, created_at`,
            [
                name,
                email,
                hashedPassword,
                "department_admin",
                department.toUpperCase()
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        next(error);
    }
};


// Get all Departments
exports.getAllDepartments = async (req, res, next) => {
    try {
        const cacheKey = "departments:all";

        // check cache first
        const cached = await cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // cache miss - query DB 
        const result = await pool.query(
            `SELECT
                d.id,
                d.name,
                d.code,
                d.created_at,
                u.name AS created_by_name
             FROM departments d
             LEFT JOIN users u ON d.created_by = u.id
             ORDER BY d.name ASC`
        );

        const departments = result.rows;

        // cache for 1 hour
        await cache.set(cacheKey, departments, 3600);

        res.json(departments);

    } catch (error) {
        next(error);
    }
};


// Get all Users
exports.getAllUsers = async (req, res, next) => {
    try {
        const { role } = req.query;

        // not cached - admin data changes frequently
        // and is only accessed by admin (low traffic)
        let query = `
            SELECT id, name, email, role, department, created_at
            FROM users
        `;
        const params = [];

        if (role) {
            query += " WHERE role = $1";
            params.push(role);
        }

        query += " ORDER BY created_at DESC";

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        next(error);
    }
};