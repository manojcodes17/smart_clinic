const express = require("express");
const router = express.Router();

const db = require("../db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

function validatePatientInput({ name, dob, gender, phone, email }) {
    if (typeof name !== "string" || !name.trim()) {
        return "Patient name is required";
    }
    if (!dob || !gender || !phone || !email) {
        return "Date of birth, gender, phone and email are required";
    }
    const parsedDob = /^\d{4}-\d{2}-\d{2}$/.test(dob) ? new Date(`${dob}T00:00:00Z`) : null;
    if (!parsedDob || Number.isNaN(parsedDob.getTime()) || parsedDob.toISOString().slice(0, 10) !== dob || dob > new Date().toISOString().slice(0, 10)) {
        return "Enter a valid date of birth that is not in the future";
    }
    if (!["Male", "Female", "Other"].includes(gender)) {
        return "Select a valid gender";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return "Enter a valid email address";
    }
    if (!/^[0-9+() -]{7,20}$/.test(phone) || phone.replace(/\D/g, "").length < 7) {
        return "Enter a valid phone number";
    }
    return null;
}


// =====================================================
// CREATE PATIENT
// POST /api/patients
// Allowed: ADMIN, RECEPTIONIST
// =====================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "receptionist"),
    async (req, res) => {

        try {

            const {
                name,
                dob,
                gender,
                phone,
                email,
                address
            } = req.body;


            const validationError = validatePatientInput({ name, dob, gender, phone, email });
            if (validationError) {

                return res.status(400).json({
                    message: validationError
                });

            }


            // Insert patient
            const [result] = await db.query(
                `INSERT INTO patients
                (
                    name,
                    dob,
                    gender,
                    phone,
                    email,
                    address
                )
                VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    name.trim(),
                    dob || null,
                    gender || null,
                    phone || null,
                    email || null,
                    address || null
                ]
            );


            res.status(201).json({

                message: "Patient registered successfully",

                patient_id: result.insertId

            });

        }

        catch (error) {

            console.error("CREATE PATIENT ERROR:", error);

            res.status(500).json({

                message: "Failed to register patient",

                error: error.message

            });

        }

    }
);



// =====================================================
// GET ALL PATIENTS
// GET /api/patients
// Allowed: ADMIN, DOCTOR
// =====================================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "doctor", "receptionist"),
    async (req, res) => {

        try {
            const doctorScope = req.user.role === "doctor"
                ? `WHERE EXISTS (
                       SELECT 1 FROM appointments a
                       WHERE a.patient_id = p.patient_id AND a.doctor_id = ?
                   ) OR EXISTS (
                       SELECT 1 FROM medical_records mr
                       WHERE mr.patient_id = p.patient_id AND mr.doctor_id = ?
                   )`
                : "";
            const parameters = req.user.role === "doctor"
                ? [req.user.doctor_id, req.user.doctor_id]
                : [];
            const [patients] = await db.query(

                `SELECT p.*
                 FROM patients p
                 ${doctorScope}
                 ORDER BY p.patient_id DESC`,
                parameters

            );


            res.json({

                count: patients.length,

                patients: patients

            });

        }

        catch (error) {

            console.error("GET PATIENTS ERROR:", error);

            res.status(500).json({

                message: "Failed to fetch patients",

                error: error.message

            });

        }

    }
);



// =====================================================
// GET PATIENT BY ID
// GET /api/patients/:id
// Allowed: ADMIN, DOCTOR
// =====================================================

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "doctor", "receptionist"),
    async (req, res) => {

        try {

            const patientId = req.params.id;


            const doctorScope = req.user.role === "doctor"
                ? `AND (
                       EXISTS (
                           SELECT 1 FROM appointments a
                           WHERE a.patient_id = p.patient_id AND a.doctor_id = ?
                       ) OR EXISTS (
                           SELECT 1 FROM medical_records mr
                           WHERE mr.patient_id = p.patient_id AND mr.doctor_id = ?
                       )
                   )`
                : "";
            const parameters = req.user.role === "doctor"
                ? [patientId, req.user.doctor_id, req.user.doctor_id]
                : [patientId];
            const [patients] = await db.query(

                `SELECT p.*
                 FROM patients p
                 WHERE p.patient_id = ? ${doctorScope}`,
                parameters

            );


            if (patients.length === 0) {

                return res.status(404).json({

                    message: "Patient not found"

                });

            }


            res.json(patients[0]);

        }

        catch (error) {

            console.error("GET PATIENT ERROR:", error);

            res.status(500).json({

                message: "Failed to fetch patient",

                error: error.message

            });

        }

    }
);



// =====================================================
// UPDATE PATIENT
// PUT /api/patients/:id
// Allowed: ADMIN, RECEPTIONIST
// =====================================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "receptionist"),
    async (req, res) => {

        try {

            const patientId = req.params.id;


            const {
                name,
                dob,
                gender,
                phone,
                email,
                address
            } = req.body;


            const validationError = validatePatientInput({ name, dob, gender, phone, email });
            if (validationError) {

                return res.status(400).json({

                    message: validationError

                });

            }


            const [result] = await db.query(

                `UPDATE patients
                 SET
                    name = ?,
                    dob = ?,
                    gender = ?,
                    phone = ?,
                    email = ?,
                    address = ?
                 WHERE patient_id = ?`,

                [
                    name.trim(),
                    dob || null,
                    gender || null,
                    phone || null,
                    email || null,
                    address || null,
                    patientId
                ]

            );


            if (result.affectedRows === 0) {

                return res.status(404).json({

                    message: "Patient not found"

                });

            }


            res.json({

                message: "Patient updated successfully"

            });

        }

        catch (error) {

            console.error("UPDATE PATIENT ERROR:", error);

            res.status(500).json({

                message: "Failed to update patient",

                error: error.message

            });

        }

    }
);



// =====================================================
// DELETE PATIENT
// DELETE /api/patients/:id
// Allowed: ADMIN ONLY
// =====================================================

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    async (req, res) => {

        try {

            const patientId = req.params.id;


            const [result] = await db.query(

                `DELETE FROM patients
                 WHERE patient_id = ?`,

                [patientId]

            );


            if (result.affectedRows === 0) {

                return res.status(404).json({

                    message: "Patient not found"

                });

            }


            res.json({

                message: "Patient deleted successfully"

            });

        }

        catch (error) {

            console.error("DELETE PATIENT ERROR:", error);

            if (["ER_ROW_IS_REFERENCED", "ER_ROW_IS_REFERENCED_2"].includes(error.code)) {
                return res.status(409).json({
                    message: "Patient has linked appointments or medical records and cannot be deleted"
                });
            }

            res.status(500).json({

                message: "Failed to delete patient",

                error: error.message

            });

        }

    }
);



// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;