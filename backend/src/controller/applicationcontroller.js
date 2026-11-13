import pool from "../db/db.js";
// User applies for a job
export const applyJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const userId = req.user.id;
    // Check job ID
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "Job ID is required",
      });
    }
    // Check whether job exists
    const job = await pool.query(
      `SELECT * FROM jobs WHERE job_id = $1 AND status = 'active' AND approval_status = 'approved'`,
      [jobId],
    );

    if (job.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Job not found or unavailable",
      });
    }
    // Check whether user profile is completed
    const userProfile = await pool.query(
      `SELECT username, email, phone, resume FROM users WHERE id = $1`,
      [userId],
    );

    if (userProfile.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }
    const profile = userProfile.rows[0];
    if (
      !profile.username ||
      !profile.email ||
      !profile.phone ||
      !profile.resume
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete your profile before applying for a job",
        profileCompleted: false,
      });
    }

    // Check whether user has already applied
    const existingApplication = await pool.query(
      `SELECT * FROM applications WHERE job_id = $1 AND user_id = $2`,
      [jobId, userId],
    );
    if (existingApplication.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "You have already applied for this job",
      });
    }

    // Insert new application
    const newApplication = await pool.query(
      `INSERT INTO applications (job_id, user_id) VALUES ($1, $2) RETURNING *`,
      [jobId, userId],
    );
    return res.status(201).json({
      success: true,
      message: "Job application submitted successfully",
      application: newApplication.rows[0],
    });
  } catch (error) {
    console.error("Apply job error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get all applicants for a job (Admin)
export const getApplicantsByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await pool.query(
      `SELECT job_id, role_name FROM jobs WHERE job_id = $1`,
      [id],
    );

    if (job.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const applicants = await pool.query(
      `SELECT a.application_id, a.job_id, a.user_id, a.status, a.applied_at, u.username, u.email, u.phone, u.resume FROM applications a JOIN users u ON a.user_id = u.id WHERE a.job_id = $1 ORDER BY a.applied_at DESC`,
      [id],
    );

    return res
      .status(200)
      .json({
        success: true,
        jobName: job.rows[0].role_name,
        count: applicants.rows.length,
        applicants: applicants.rows,
      });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get applicants for a company's own job
export const getApplicants = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await pool.query(
      `SELECT company_id FROM companies WHERE user_id = $1`,
      [req.user.id],
    );

    if (company.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Company not found" });
    }

    const job = await pool.query(
      `SELECT job_id, role_name FROM jobs WHERE job_id = $1 AND company_id = $2`,
      [id, company.rows[0].company_id],
    );

    if (job.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    const applicants = await pool.query(
      `SELECT a.application_id, a.job_id, a.user_id, a.status, a.applied_at, u.username, u.email, u.phone, u.resume FROM applications a JOIN users u ON a.user_id = u.id WHERE a.job_id = $1 ORDER BY a.applied_at DESC`,
      [id],
    );

    return res
      .status(200)
      .json({
        success: true,
        jobName: job.rows[0].role_name,
        count: applicants.rows.length,
        applicants: applicants.rows,
      });
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
// Get all jobs applied by a user
export const getAppliedJobs = async (req, res) => {
    try {
        const userId = req.user.id;
        const applications = await pool.query(`SELECT a.application_id, a.status AS application_status, a.applied_at, j.job_id, j.role_name, j.company_name, j.location, j.salary, j.salary_type, j.job_type, j.experience, j.post_date FROM applications a JOIN jobs j ON a.job_id = j.job_id WHERE a.user_id = $1 ORDER BY a.applied_at DESC`, [userId]);
        return res.status(200).json({
            success: true,
            count: applications.rows.length,
            applications: applications.rows
        });

    } catch (error) {
        console.error("Get applied jobs error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};