
import multer from "multer";
import path from "path";
import fs from "fs";

const logoFolder = path.resolve("uploads", "company-logos");
const resumeFolder = path.resolve("uploads", "resumes");

// Create folders if they do not exist
fs.mkdirSync(logoFolder, { recursive: true });
fs.mkdirSync(resumeFolder, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === "logo") {
            cb(null, logoFolder);
        } else if (file.fieldname === "resume") {
            cb(null, resumeFolder);
        } else {
            cb(new Error("Invalid file field"), null);
        }
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.fieldname === "logo") {
        const allowedLogos = [".jpg", ".jpeg", ".png", ".webp"];

        if (allowedLogos.includes(ext)) {
            return cb(null, true);
        }

        return cb(new Error("Logo must be JPG, JPEG, PNG, or WEBP"));
    }

    if (file.fieldname === "resume") {
        const allowedResumes = [".pdf", ".doc", ".docx"];

        if (allowedResumes.includes(ext)) {
            return cb(null, true);
        }

        return cb(new Error("Resume must be PDF, DOC, or DOCX"));
    }

    return cb(new Error("Invalid file field"));
};

export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter
});
