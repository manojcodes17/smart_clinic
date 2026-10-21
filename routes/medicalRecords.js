const express = require("express");
const router = express.Router();

const db = require("../db");
const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");

router.use(authenticateToken, authorizeRoles("admin", "doctor"));


// Create medical record
router.post("/", async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            visit_date,
            diagnosis,
            treatment,
            notes
        } = req.body;

        if (!patient_id || !doctor_id || !visit_date) {
            return res.status(400).json({
                message: "patient_id, doctor_id and visit_date are required"
            });
        }
        if (req.user.role === "doctor" && String(doctor_id) !== String(req.user.doctor_id)) {
            return res.status(403).json({ message: "Doctors can only create records for their own profile" });
        }

        const [patients] = await db.execute(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            [patient_id]
        );
        const [doctors] = await db.execute(
            "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
            [doctor_id]
        );
        if (patients.length === 0 || doctors.length === 0) {
            return res.status(404).json({ message: "Patient or doctor not found" });
        }

        const [result] = await db.execute(
            `INSERT INTO medical_records
            (patient_id, doctor_id, visit_date, diagnosis, treatment, notes)
            VALUES (?, ?, ?, ?, ?, ?)` ,
            [
                patient_id,
                doctor_id,
                visit_date,
                diagnosis || null,
                treatment || null,
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
        const doctorScope = req.user.role === "doctor" ? "WHERE mr.doctor_id = ?" : "";
        const parameters = req.user.role === "doctor" ? [req.user.doctor_id] : [];
        const [records] = await db.execute(`
            SELECT mr.*, p.name AS patient_name, d.name AS doctor_name
            FROM medical_records mr
            JOIN patients p ON mr.patient_id = p.patient_id
            JOIN doctors d ON mr.doctor_id = d.doctor_id
            ${doctorScope}
            ORDER BY mr.visit_date DESC
        `, parameters);

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
        const doctorScope = req.user.role === "doctor" ? "AND doctor_id = ?" : "";
        const parameters = req.user.role === "doctor"
            ? [req.params.id, req.user.doctor_id]
            : [req.params.id];
        const [records] = await db.execute(
            `SELECT * FROM medical_records WHERE record_id = ? ${doctorScope}`,
            parameters
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
        const {
            patient_id,
            doctor_id,
            visit_date,
            diagnosis,
            treatment,
            notes
        } = req.body;

        // Get existing record first
        const doctorScope = req.user.role === "doctor" ? "AND doctor_id = ?" : "";
        const existingParameters = req.user.role === "doctor"
            ? [req.params.id, req.user.doctor_id]
            : [req.params.id];
        const [existing] = await db.execute(
            `SELECT * FROM medical_records WHERE record_id = ? ${doctorScope}`,
            existingParameters
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

        if (req.user.role === "doctor" && String(updatedDoctorId) !== String(req.user.doctor_id)) {
            return res.status(403).json({ message: "Doctors can only update their own records" });
        }

        const updatedVisitDate =
            visit_date !== undefined ? visit_date : record.visit_date;

        const updatedDiagnosis =
            diagnosis !== undefined ? diagnosis : record.diagnosis;

        const updatedTreatment =
            treatment !== undefined ? treatment : record.treatment;

        const updatedNotes =
            notes !== undefined ? notes : record.notes;

        const [patients] = await db.execute(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            [updatedPatientId]
        );
        const [doctors] = await db.execute(
            "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
            [updatedDoctorId]
        );
        if (patients.length === 0 || doctors.length === 0) {
            return res.status(404).json({ message: "Patient or doctor not found" });
        }

        const [result] = await db.execute(
            `UPDATE medical_records
             SET patient_id = ?,
                 doctor_id = ?,
                 visit_date = ?,
                 diagnosis = ?,
                 treatment = ?,
                 notes = ?
             WHERE record_id = ?`,
            [
                updatedPatientId,
                updatedDoctorId,
                updatedVisitDate,
                updatedDiagnosis,
                updatedTreatment,
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
        const doctorScope = req.user.role === "doctor" ? "AND doctor_id = ?" : "";
        const parameters = req.user.role === "doctor"
            ? [id, req.user.doctor_id]
            : [id];

        const [result] = await db.execute(
            `DELETE FROM medical_records WHERE record_id = ? ${doctorScope}`,
            parameters
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
