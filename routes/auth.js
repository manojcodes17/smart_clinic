const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

const router = express.Router();
const db = require("../db");


// ==========================================
// REGISTER USER
// POST /api/auth/register
// ==========================================

router.post(
    "/register",
    authenticateToken,
    authorizeRoles("admin"),
    async (req, res) => {

    try {

        const {
            username,
            password,
            role
        } = req.body;

        // Validate input
        if (!username || !password || !role) {
            return res.status(400).json({
                message: "Username, password and role are required"
            });
        }

        // Allow only these roles
        const allowedRoles = [
            "admin",
            "doctor",
            "patient"
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                message: "Invalid role"
            });
        }

        // Check existing username
        const [existingUsers] = await db.query(
            "SELECT user_id FROM users WHERE username = ?",
            [username]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: "Username already exists"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Save user
        const [result] = await db.query(
            `INSERT INTO users
            (username, password_hash, role)
            VALUES (?, ?, ?)`,
            [
                username,
                passwordHash,
                role
            ]
        );

        res.status(201).json({
            message: "User registered successfully",
            user_id: result.insertId,
            username: username,
            role: role
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });

    }

    }
);


// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================

router.post("/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        // Find user
        const [users] = await db.query(
            `SELECT
                user_id,
                username,
                password_hash,
                role
             FROM users
             WHERE username = ?`,
            [username]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = users[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        res.json({
            message: "Login successful",
            token: token,
            user: {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Login failed",
            error: error.message
        });

    }

});


module.exports = router;