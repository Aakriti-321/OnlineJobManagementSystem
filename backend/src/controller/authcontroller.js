
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db/db.js";

// REGISTER
export const register = async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });
        }

    
        const allowedRoles = ["user", "company"];
        const userRole = role || "user";

        if (!allowedRoles.includes(userRole)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Use user or company."
            });
        }

        const userExists = await pool.query(
            `SELECT id FROM users
             WHERE email = $1 OR username = $2`,
            [email, username]
        );

        if (userExists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email or username already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users
             (username, email, password, role)
             VALUES ($1, $2, $3, $4)
             RETURNING id, username, email, role`,
            [username, email, hashedPassword, userRole]
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful.",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("Register error:", error);

        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Email or username already exists."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};


// LOGIN
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const result = await pool.query(
            `SELECT id, username, email, password, role
             FROM users
             WHERE email = $1`,
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const user = result.rows[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
};
