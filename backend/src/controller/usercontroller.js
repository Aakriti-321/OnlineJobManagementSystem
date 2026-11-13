
import pool from "../db/db.js";
import path from "path";
import fs from "fs/promises";

// Get user profile
export const getProfile = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, username, email, role, phone, resume
             FROM users
             WHERE id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            user: result.rows[0]
        });

    } catch (err) {
        console.error("Get profile error:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


// Update user profile
export const updateProfile = async (req, res) => {
    try {
        const { username, email, phone } = req.body;
        const updateData = {};

        if (username !== undefined) updateData.username = username;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;

        // Save resume 
        if (req.file && req.user.role === "user") {
            const extension = path.extname(req.file.originalname)
                .toLowerCase();

            const allowedExtensions = [".pdf", ".doc", ".docx"];

            if (!allowedExtensions.includes(extension)) {
                await fs.unlink(req.file.path).catch(() => {});

                return res.status(400).json({
                    success: false,
                    message: "Only PDF, DOC and DOCX resumes are allowed"
                });
            }

            // Store  generated filename 
            updateData.resume = req.file.filename;
        } else if (req.file) {
            // This controller only accepts resume uploads for job seekers
            await fs.unlink(req.file.path).catch(() => {});

            return res.status(403).json({
                success: false,
                message: "Only job seekers can upload resumes"
            });
        }

        const columnMap = {
            username: "username",
            email: "email",
            phone: "phone",
            resume: "resume"
        };

        const fields = Object.keys(updateData);

        if (fields.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update"
            });
        }

        const values = fields.map(field => updateData[field]);

        const setQuery = fields
            .map((field, index) =>
                `${columnMap[field]} = $${index + 1}`
            )
            .join(", ");

        values.push(req.user.id);

        const result = await pool.query(
            `UPDATE users
             SET ${setQuery}
             WHERE id = $${values.length}
             RETURNING id, username, email, role, phone, resume`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: result.rows[0]
        });

    } catch (err) {
        console.error("Update profile error:", err);

        if (err.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "Username or email already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};


export const getResumes = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT resume FROM users WHERE id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0 || !result.rows[0].resume) {
            return res.status(404).json({
                success: false,
                message: "Resume not found"
            });
        }

     
        const filename = path.basename(result.rows[0].resume);

        const filePath = path.resolve(
            process.cwd(),
            "uploads",
            "resumes",
            filename
        );

        return res.download(filePath, filename, (err) => {
            if (err && !res.headersSent) {
                console.error("Resume download error:", err);

                return res.status(404).json({
                    success: false,
                    message: "Resume file not found on the server"
                });
            }
        });

    } catch (err) {
        console.error("Get resume error:", err);

        return res.status(500).json({
            success: false,
            message: "Could not access resume"
        });
    }
};
