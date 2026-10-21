const {
    authenticateToken,
    authorizeRoles
} = require("./middleware/auth");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const patientRoutes = require("./routes/patients");
const doctorRoutes = require("./routes/doctors");
const appointmentRoutes = require("./routes/appointments");
const authRoutes = require("./routes/auth");
const medicalRecordRoutes = require("./routes/medicalRecords");



const app = express();

app.use(cors());
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

        res.status(500).json({
            message: "Database connection failed",
            error: error.message
        });

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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log("--------------------------------");
    console.log("SMART CLINIC BACKEND");
    console.log("--------------------------------");
    console.log(`Server running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);

});