require("dotenv").config();

const requiredEnvironment = ["DB_HOST", "DB_USER", "DB_NAME", "JWT_SECRET"];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

if (missingEnvironment.length > 0) {
    throw new Error(`Missing required environment variables: ${missingEnvironment.join(", ")}`);
}

const express = require("express");
const cors = require("cors");
const {
    authenticateToken,
    authorizeRoles
} = require("./middleware/auth");

const db = require("./db");
const patientRoutes = require("./routes/patients");
const doctorRoutes = require("./routes/doctors");
const appointmentRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");
const medicalRecordRoutes = require("./routes/medicalRecords");



const app = express();

app.use(cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173"
}));
app.use(express.json());
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/medical-records", medicalRecordRoutes);


// ==========================================
// HOME / SERVER TEST
// ==========================================

app.get("/", (req, res) => {
    res.json({
        message: "Smart Clinic API is running",
        status: "success"
    });
});


// ==========================================
// MYSQL CONNECTION TEST
// ==========================================

app.get("/api/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT DATABASE() AS database_name"
        );

        res.json({
            message: "Database connection successful",
            database: rows[0].database_name
        });

    } catch (error) {

        console.error("Database error:", error.message);

        res.status(500).json({ message: "Database connection failed" });

    }

});
app.get(
    "/api/admin-test",
    authenticateToken,
    authorizeRoles("admin"),
    (req, res) => {

        res.json({
            message: "Admin access granted",
            user: req.user
        });

    }
);


// ==========================================
// START SERVER
// ==========================================

const PORT = Number(process.env.PORT || 5000);

async function startServer() {
    try {
        const connection = await db.getConnection();
        connection.release();

        app.listen(PORT, () => {
            console.log(`Smart Clinic API running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Unable to connect to MySQL:", error.message);
        await db.end();
        process.exitCode = 1;
    }
}

startServer();