
import pool from "../db/db.js";

// Get all companies
export const getCompanies = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM companies"
        );
        res.status(200).json({
            success: true,
            companies: result.rows
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
// Add a company
export const addCompany = async (req, res) => {
    try {
        const { name, email, website } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: "Company name and email are required"
            });
        }

        const logo = req.file ? req.file.filename : null;

        const result = await pool.query(
            `INSERT INTO companies (name, email, logo, website, user_id)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, email, logo, website || null, req.user.id]
        );

        res.status(201).json({
            success: true,
            message: "Company added successfully!",
            company: result.rows[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
//delete company
export const deleteCompany = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if company exists
        const company = await pool.query(
            "SELECT * FROM companies WHERE id = $1",
            [id]
        );

        if (company.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }
        await pool.query(
            "DELETE FROM companies WHERE id = $1",
            [id]
        );

        return res.status(200).json({
            success: true,
            message: "Company deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
