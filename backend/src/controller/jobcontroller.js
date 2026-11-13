
import pool from "../db/db.js";
import { mergeSort } from "../utils/mergesort.js";

// CREATE JOB
export const createjob = async (req, res) => {
    try {
        let {
            roleName,
            techStack,
            location,
            experience,
            salary,
            salaryType,
            jobType,
            postDate,
            category,
            openings,
            overview,
            responsibilities,
            jobCriteria,
            education,
            status
        } = req.body;

        // Convert FormData JSON strings into arrays
        const parseArray = (value) => {
            if (!value) return [];

            if (typeof value === "string") {
                return JSON.parse(value);
            }

            return value;
        };

        techStack = parseArray(techStack);
        responsibilities = parseArray(responsibilities);
        jobCriteria = parseArray(jobCriteria);
        education = parseArray(education);

        // Validate required field
        if (!roleName) {
            return res.status(400).json({
                success: false,
                message: "Job role is required"
            });
        }

        // Find company profile of logged-in user
        const companyResult = await pool.query(
            `SELECT company_id, name, logo
             FROM companies
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company profile not found"
            });
        }

        const company = companyResult.rows[0];

        // Get uploaded logo filename
        const companyLogo = req.file
            ? req.file.filename
            : company.logo;

        // Validate and format post date
        let postDateValue;

        if (postDate && /^\d{4}-\d{2}-\d{2}$/.test(postDate)) {
            postDateValue = postDate;
        } else if (postDate) {
            const parsedDate = new Date(postDate);

            postDateValue = isNaN(parsedDate.getTime())
                ? new Date().toISOString().split("T")[0]
                : parsedDate.toISOString().split("T")[0];
        } else {
            postDateValue = new Date().toISOString().split("T")[0];
        }

        // Validate salary, openings and category
        const salaryValue =
            salary !== undefined && salary !== ""
                ? Number(salary)
                : null;

        const openingsValue =
            openings !== undefined && openings !== ""
                ? Number(openings)
                : 1;

        const categoryValue =
            category ? Number(category) : null;

        if (salaryValue !== null &&
            (!Number.isFinite(salaryValue) || salaryValue < 0)) {
            return res.status(400).json({
                success: false,
                message: "Invalid salary"
            });
        }

        if (!Number.isInteger(openingsValue) || openingsValue <= 0) {
            return res.status(400).json({
                success: false,
                message: "Openings must be a positive integer"
            });
        }

        if (categoryValue !== null &&
            (!Number.isInteger(categoryValue) || categoryValue <= 0)) {
            return res.status(400).json({
                success: false,
                message: "Invalid category ID"
            });
        }

        // Validate job status
        if (status && !["active", "closed"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job status"
            });
        }

        // Insert job into PostgreSQL
        const result = await pool.query(`INSERT INTO jobs (
        company_id, role_name, company_name, tech_stack,location, experience,salary, salary_type, job_type, post_date, category_id,
         openings,  overview,  responsibilities, job_criteria, education, status, company_logo) VALUES ($1, $2, $3, $4, $5,
          $6, $7, $8, $9,$10, $11, $12, $13, $14, $15, $16, $17, $18)RETURNING *`,
            [
                company.company_id,
                roleName,
                company.name,
                techStack,
                location || null,
                experience || null,
                salaryValue,
                salaryType || "/month",
                jobType || null,
                postDateValue,
                categoryValue,
                openingsValue,
                overview || null,
                responsibilities,
                jobCriteria,
                education,
                status || "active",
                companyLogo || null
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Job posted successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Error creating job:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
};


// GET ALL JOBS
export const getAllJobs = async (req, res) => {
    try {
        const {roleName,companyName,location,category,jobType,experience,minSalary, maxSalary, search} = req.query;

        // Get active jobs
        let query = `
            SELECT *
            FROM jobs
            WHERE status = 'active'
        `;

        const values = [];

        // Search by role, company, or tech stack
        if (search) {
            values.push(`%${search}%`);

            query += `
                AND (
                    role_name ILIKE $${values.length}
                    OR company_name ILIKE $${values.length}
                    OR array_to_string(tech_stack, ',') ILIKE $${values.length}
                )
            `;
        }

        // Filter by role name
        if (roleName) {
            values.push(`%${roleName}%`);
            query += ` AND role_name ILIKE $${values.length}`;
        }

        // Filter by company name
        if (companyName) {
            values.push(`%${companyName}%`);
            query += ` AND company_name ILIKE $${values.length}`;
        }

        // Filter by location
        if (location) {
            values.push(`%${location}%`);
            query += ` AND location ILIKE $${values.length}`;
        }

        // Filter by experience
        if (experience) {
            values.push(`%${experience}%`);
            query += ` AND experience ILIKE $${values.length}`;
        }

        // Filter by category IDs
        if (category) {
            const categories = String(category)
                .split(",")
                .map(Number);

            if (categories.some(id => !Number.isInteger(id) || id <= 0)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid category ID"
                });
            }

            values.push(categories);
            query += ` AND category_id = ANY($${values.length}::INTEGER[])`;
        }

        // Filter by job types
        if (jobType) {
            const types = String(jobType)
                .split(",")
                .map(type => type.trim().toLowerCase())
                .filter(Boolean);

            if (types.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid job type"
                });
            }

            values.push(types);
            query += ` AND LOWER(job_type) = ANY($${values.length}::TEXT[])`;
        }

        // Filter by minimum salary
        if (minSalary !== undefined && minSalary !== "") {
            const min = Number(minSalary);

            if (!Number.isFinite(min) || min < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid minimum salary"
                });
            }

            values.push(min);
            query += ` AND salary >= $${values.length}`;
        }

        // Filter by maximum salary
        if (maxSalary !== undefined && maxSalary !== "") {
            const max = Number(maxSalary);

            if (!Number.isFinite(max) || max < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid maximum salary"
                });
            }

            values.push(max);
            query += ` AND salary <= $${values.length}`;
        }

        // Get filtered jobs from database
        const result = await pool.query(query, values);

        let jobs = result.rows;

        // Validate sorting options
        const { sortBy, order = "desc" } = req.query;

        const allowedFields = ["salary", "post_date"];

        if (sortBy && !allowedFields.includes(sortBy)) {
            return res.status(400).json({
                success: false,
                message: "Invalid sorting field"
            });
        }

        if (order !== "asc" && order !== "desc") {
            return res.status(400).json({
                success: false,
                message: "Order must be asc or desc"
            });
        }

        // Apply Merge Sort
        jobs = mergeSort(
            jobs,
            sortBy || "post_date",
            order
        );

        return res.status(200).json({
            success: true,
            count: jobs.length,
            jobs
        });

    } catch (error) {
        console.error("Error fetching jobs:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
};
//get the dashboard statss
export  const getDashboardStats=async (req,res)=>{
    try{
        const adminId=req.user.id;
      // Count all jobs
        const totalJobs = await pool.query(
            "SELECT COUNT(*) FROM jobs"
        );

        // Count closed jobs
        const closedJobs = await pool.query(
            "SELECT COUNT(*) FROM jobs WHERE status = 'closed'"
        );

        // Count active jobs
        const activeJobs = await pool.query(
            "SELECT COUNT(*) FROM jobs WHERE status = 'active'"
        );
// Count total applications
const totalApplicationsResult = await pool.query(
    "SELECT COUNT(*) FROM applications"
);

const totalApplications = Number(totalApplicationsResult.rows[0].count);

// Count distinct companies that have active jobs
const companiesResult = await pool.query(
    "SELECT COUNT(DISTINCT company_name) FROM jobs WHERE status = 'active'"
);

const totalCompanies = Number(companiesResult.rows[0].count);
return res.status(200).json({
    success: true,
    stats: {
        totalJobs: Number(totalJobs.rows[0].count),
        closedJobs: Number(closedJobs.rows[0].count),
        activeJobs: Number(activeJobs.rows[0].count),
        totalApplications,
        totalCompanies
    }
});
    }
    catch(error){
   console.error("Error fetching dashboards:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Server error"
        });
    }
}
//get all job by posted by company 
export const getJobsByAdmin = async (req, res) => {
    try {
        const jobsResult = await pool.query(`SELECTj.*,c.email AS company_emailFROM jobs jJOIN companies cON j.company_id = c.company_idWHERE j.approval_status = 'pending'ORDER BY j.created_at DESC `);

        return res.status(200).json({
            success: true,
            count: jobsResult.rows.length,
            jobs: jobsResult.rows
        });

    } catch (error) {
        console.error("Error fetching pending jobs:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
//approve or reject posted job by admin
export const reviewJob = async (req, res) => {
    try {
        const { jobId } = req.params;
        const { approvalStatus } = req.body;

        if (!["approved", "rejected"].includes(approvalStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid approval status"
            });
        }

        const result = await pool.query(`UPDATE jobsSET approval_status = $1 WHERE job_id = $2RETURNING *`,
        [approvalStatus, jobId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: `Job ${approvalStatus} successfully`,
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Error reviewing job:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
//get job by id
export const getJobById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT *
             FROM jobs
             WHERE job_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Error fetching job:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
// update a job
export const updateJob = async (req, res) => {
    try {
        const { id } = req.params;

        const { roleName,  techStack, location, experience, salary, salaryType,jobType,category,openings, overview, responsibilities, jobCriteria, education
        } = req.body;

        // Find company
        const company = await pool.query(
            "SELECT company_id FROM companies WHERE user_id = $1",
            [req.user.id]
        );

        if (company.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Update job if it belongs to this company
        const result = await pool.query(`UPDATE jobs SET role_name = $1,tech_stack = $2,location = $3,experience = $4, salary = $5, salary_type = $6, job_type = $7, category_id = $8,  openings = $9,  overview = $10, responsibilities = $11, job_criteria = $12, education = $13, company_logo = COALESCE($14, company_logo), approval_status = 'pending', rejection_reason = NULL WHERE job_id = $15 AND company_id = $16 RETURNING *`,
            [
                roleName,
                techStack ? JSON.parse(techStack) : [],
                location,
                experience,
                salary ? Number(salary) : null,
                salaryType,
                jobType,
                category ? Number(category) : null,
                openings ? Number(openings) : 1,
                overview,
                responsibilities ? JSON.parse(responsibilities) : [],
                jobCriteria ? JSON.parse(jobCriteria) : [],
                education ? JSON.parse(education) : [],
                req.file ? req.file.filename : null,
                id,
                company.rows[0].company_id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job updated and sent for admin approval",
            job: result.rows[0]
        });

    } catch (error) {
        console.error("Update job error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
// delete job
export const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;

        // Find company of logged-in user
        const company = await pool.query(
            "SELECT company_id FROM companies WHERE user_id = $1",
            [req.user.id]
        );

        if (company.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Delete only the company's own job
        const result = await pool.query(
            `DELETE FROM jobs
             WHERE job_id = $1 AND company_id = $2
             RETURNING *`,
            [id, company.rows[0].company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job deleted successfully"
        });

    } catch (error) {
        console.error("Delete job error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
//close a job opening
export const closeJob = async (req, res) => {
    try {
        const { id } = req.params;

        const company = await pool.query(
            "SELECT company_id FROM companies WHERE user_id = $1",
            [req.user.id]
        );

        if (company.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        const result = await pool.query(
            `UPDATE jobs
             SET status = 'closed'
             WHERE job_id = $1 AND company_id = $2
             RETURNING *`,
            [id, company.rows[0].company_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Job not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Job opening closed successfully",
            job: result.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
