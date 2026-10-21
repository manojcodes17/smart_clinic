const express = require("express");
const router = express.Router();

const db = require("../db");

const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");


// =====================================================
// CREATE PATIENT
// POST /api/patients
// Allowed: ADMIN, DOCTOR
// =====================================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "doctor"),
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


            // Validate name
            if (!name || name.trim() === "") {

                return res.status(400).json({
                    message: "Patient name is required"
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
    authorizeRoles("admin", "doctor"),
    async (req, res) => {

        try {

            const [patients] = await db.query(

                `SELECT *
                 FROM patients
                 ORDER BY patient_id DESC`

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
    authorizeRoles("admin", "doctor"),
    async (req, res) => {

        try {

            const patientId = req.params.id;


            const [patients] = await db.query(

                `SELECT *
                 FROM patients
                 WHERE patient_id = ?`,

                [patientId]

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
// Allowed: ADMIN, DOCTOR
// =====================================================

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "doctor"),
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


            // Validate name
            if (!name || name.trim() === "") {

                return res.status(400).json({

                    message: "Patient name is required"

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