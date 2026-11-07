import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser"

import express from "express";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import jobRoutes from "./routes/jobRoutes.js"
import applicationRoutes from "./routes/applicationRoutes.js";
const app = express();
const port = process.env.PORT;

app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use('/uploads',express.static("uploads"));

// Authentication routes
app.use("/api/auth", authRoutes);
//user routes
app.use("/api/user",userRoutes);
//user routes
app.use("/api/company",companyRoutes);
//job routes
app.use("/api/jobs",jobRoutes);
//application routes
app.use("/api/application",applicationRoutes);
// Start server
app.listen(port, () => {
    console.log(`Server running at port ${port}`);
});
