const express = require("express");
const router = express.Router();

const db = require("../db");


// Create medical record
router.post("/", async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            visit_date,
            notes
        } = req.body;

        if (!patient_id || !doctor_id || !visit_date) {
            return res.status(400).json({
                message: "patient_id, doctor_id and visit_date are required"
            });
        }

        const [result] = await db.execute(
            `INSERT INTO medical_records
            (patient_id, doctor_id, visit_date, notes)
            VALUES (?, ?, ?, ?)`,
            [
                patient_id,
                doctor_id,
                visit_date,
                notes || null
            ]
        );

        res.status(201).json({
            message: "Medical record created successfully",
            record_id: result.insertId
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to create medical record"
        });
    }
});


// Get all medical records
router.get("/", async (req, res) => {
    try {

        const [records] = await db.execute(`
            SELECT *
            FROM medical_records
            ORDER BY visit_date DESC
        `);

        res.json({
            count: records.length,
            records: records
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch medical records"
        });
    }
});
// Get medical record by ID
router.get("/:id", async (req, res) => {
    try {

        const [records] = await db.execute(
            `SELECT * FROM medical_records WHERE record_id = ?`,
            [req.params.id]
        );

        if (records.length === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        res.json(records[0]);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch medical record"
        });
    }
});
// Update medical record
router.put("/:id", async (req, res) => {
    try {
        const { patient_id, doctor_id, visit_date, notes } = req.body;

        // Get existing record first
        const [existing] = await db.execute(
            "SELECT * FROM medical_records WHERE record_id = ?",
            [req.params.id]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        const record = existing[0];

        // Keep old values if they are not provided
        const updatedPatientId =
            patient_id !== undefined ? patient_id : record.patient_id;

        const updatedDoctorId =
            doctor_id !== undefined ? doctor_id : record.doctor_id;

        const updatedVisitDate =
            visit_date !== undefined ? visit_date : record.visit_date;

        const updatedNotes =
            notes !== undefined ? notes : record.notes;

        const [result] = await db.execute(
            `UPDATE medical_records
             SET patient_id = ?,
                 doctor_id = ?,
                 visit_date = ?,
                 notes = ?
             WHERE record_id = ?`,
            [
                updatedPatientId,
                updatedDoctorId,
                updatedVisitDate,
                updatedNotes,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        res.json({
            message: "Medical record updated successfully"
        });

    } catch (error) {
        console.error("Update medical record error:", error);

        res.status(500).json({
            message: "Failed to update medical record"
        });
    }
});
// Delete medical record
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.execute(
            "DELETE FROM medical_records WHERE record_id = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Medical record not found"
            });
        }

        res.json({
            message: "Medical record deleted successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to delete medical record"
        });
    }
});
module.exports = router;
