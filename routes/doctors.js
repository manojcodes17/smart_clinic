const express = require("express");
const router = express.Router();

const db = require("../db");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

// ==========================================
// CREATE DOCTOR
// POST /api/doctors
// ==========================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    async (req, res) => {
    try {
        const {
            name,
            specialization,
            phone,
            email,
            availability
        } = req.body;

        if (!name || !specialization) {
            return res.status(400).json({
                message: "Doctor name and specialization are required"
            });
        }

        const [result] = await db.query(
            `INSERT INTO doctors
            (name, specialization, phone, email, availability)
            VALUES (?, ?, ?, ?, ?)`,
            [
                name,
                specialization,
                phone || null,
                email || null,
                availability || null
            ]
        );

        res.status(201).json({
            message: "Doctor registered successfully",
            doctor_id: result.insertId
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to register doctor",
            error: error.message
        });
    }
});


// ==========================================
// GET ALL DOCTORS
// GET /api/doctors
// ==========================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "doctor", "patient"),
    async (req, res) => {
    try {
        const [doctors] = await db.query(
            "SELECT * FROM doctors ORDER BY doctor_id DESC"
        );

        res.json({
            count: doctors.length,
            doctors: doctors
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctors",
            error: error.message
        });
    }
});


// ==========================================
// GET DOCTOR BY ID
// GET /api/doctors/:id
// ==========================================

router.get("/:id", async (req, res) => {
    try {
        const [doctors] = await db.query(
            "SELECT * FROM doctors WHERE doctor_id = ?",
            [req.params.id]
        );

        if (doctors.length === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json(doctors[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch doctor",
            error: error.message
        });
    }
});


// ==========================================
// UPDATE DOCTOR
// PUT /api/doctors/:id
// ==========================================

router.put("/:id", async (req, res) => {
    try {
        const {
            name,
            specialization,
            phone,
            email,
            availability
        } = req.body;

        const [result] = await db.query(
            `UPDATE doctors
             SET name = ?,
                 specialization = ?,
                 phone = ?,
                 email = ?,
                 availability = ?
             WHERE doctor_id = ?`,
            [
                name,
                specialization,
                phone || null,
                email || null,
                availability || null,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json({
            message: "Doctor updated successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update doctor",
            error: error.message
        });
    }
});


// ==========================================
// DELETE DOCTOR
// DELETE /api/doctors/:id
// ==========================================

router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.query(
            "DELETE FROM doctors WHERE doctor_id = ?",
            [req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.json({
            message: "Doctor deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete doctor",
            error: error.message
        });
    }
});


module.exports = router;