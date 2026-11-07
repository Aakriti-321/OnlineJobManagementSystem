
import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    password: process.env.DB_PASSWORD,
});

pool.connect()
    .then((client) => {
        console.log("Database connected successfully!!");
        client.release();
    })
    .catch((err) => {
        console.error("Database connection failed:", err.message);
    });

export default pool;
