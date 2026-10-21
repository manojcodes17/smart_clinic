const {
    authenticateToken,
    authorizeRoles
} = require("../middleware/auth");
const express = require("express");
const router = express.Router();

const db = require("../db");

router.use(authenticateToken, authorizeRoles("admin", "doctor", "receptionist"));


// ==========================================
// CREATE APPOINTMENT
// POST /api/appointments
// ==========================================

router.post(
    "/",
    authorizeRoles("admin", "doctor", "receptionist"),
    async (req, res) => {

    try {

        const {
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time
        } = req.body;


        // ------------------------------------------
        // 1. Validate required fields
        // ------------------------------------------

        if (
            !patient_id ||
            !doctor_id ||
            !appointment_date ||
            !appointment_time
        ) {

            return res.status(400).json({
                message: "Patient, doctor, date and time are required"
            });

        }

        if (req.user.role === "doctor" && String(doctor_id) !== String(req.user.doctor_id)) {
            return res.status(403).json({
                message: "Doctors can only schedule visits for their own profile"
            });
        }


        // ------------------------------------------
        // 2. Check patient exists
        // ------------------------------------------

        const [patients] = await db.query(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            [patient_id]
        );

        if (patients.length === 0) {

            return res.status(404).json({
                message: "Patient not found"
            });

        }


        // ------------------------------------------
        // 3. Check doctor exists
        // ------------------------------------------

        const [doctors] = await db.query(
            "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
            [doctor_id]
        );

        if (doctors.length === 0) {

            return res.status(404).json({
                message: "Doctor not found"
            });

        }


        // ------------------------------------------
        // 4. Prevent past appointments
        // ------------------------------------------

        const appointmentDateTime = new Date(
            `${appointment_date}T${appointment_time}`
        );

        if (isNaN(appointmentDateTime.getTime())) {

            return res.status(400).json({
                message: "Invalid date or time"
            });

        }

        if (appointmentDateTime < new Date()) {

            return res.status(400).json({
                message: "Appointment cannot be scheduled in the past"
            });

        }


        // ------------------------------------------
        // 5. Check doctor availability
        // ------------------------------------------

        const [existingDoctorAppointment] = await db.query(
            `SELECT appointment_id
             FROM appointments
             WHERE doctor_id = ?
             AND appointment_date = ?
             AND appointment_time = ?
             AND status IN ('Scheduled', 'Confirmed')`,
            [
                doctor_id,
                appointment_date,
                appointment_time
            ]
        );

        if (existingDoctorAppointment.length > 0) {

            return res.status(409).json({
                message: "Doctor is already booked at this time"
            });

        }


        // ------------------------------------------
        // 6. Check patient availability
        // ------------------------------------------

        const [existingPatientAppointment] = await db.query(
            `SELECT appointment_id
             FROM appointments
             WHERE patient_id = ?
             AND appointment_date = ?
             AND appointment_time = ?
             AND status IN ('Scheduled', 'Confirmed')`,
            [
                patient_id,
                appointment_date,
                appointment_time
            ]
        );

        if (existingPatientAppointment.length > 0) {

            return res.status(409).json({
                message: "Patient already has an appointment at this time"
            });

        }


        // ------------------------------------------
        // 7. Create appointment
        // ------------------------------------------

        const [result] = await db.query(
            `INSERT INTO appointments
            (
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                status
            )
            VALUES (?, ?, ?, ?, 'Scheduled')`,
            [
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time
            ]
        );


        // ------------------------------------------
        // 8. Success response
        // ------------------------------------------

        res.status(201).json({

            message: "Appointment booked successfully",

            appointment: {
                appointment_id: result.insertId,
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                status: "Scheduled"
            }

        });


    } catch (error) {

        console.error(error);

        // MySQL duplicate-key protection
        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                message: "Doctor is already booked at this time"
            });

        }

        res.status(500).json({
            message: "Failed to create appointment",
            error: error.message
        });

    }

});


// ==========================================
// GET ALL APPOINTMENTS
// GET /api/appointments
// ==========================================

router.get("/", async (req, res) => {

    try {
        const doctorScope = req.user.role === "doctor" ? "WHERE a.doctor_id = ?" : "";
        const parameters = req.user.role === "doctor" ? [req.user.doctor_id] : [];
        const [appointments] = await db.query(

            `SELECT
                a.appointment_id,
                a.appointment_date,
                a.appointment_time,
                a.status,

                p.patient_id,
                p.name AS patient_name,

                d.doctor_id,
                d.name AS doctor_name,
                d.specialization

             FROM appointments a

             JOIN patients p
             ON a.patient_id = p.patient_id

             JOIN doctors d
             ON a.doctor_id = d.doctor_id

                 ${doctorScope}
             ORDER BY
                a.appointment_date,
                     a.appointment_time`,
                parameters

        );


        res.json({

            count: appointments.length,

            appointments: appointments

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            message: "Failed to fetch appointments",

            error: error.message

        });

    }

});
// Get appointment by ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const doctorScope = req.user.role === "doctor" ? "AND doctor_id = ?" : "";
        const parameters = req.user.role === "doctor"
            ? [id, req.user.doctor_id]
            : [id];

        const [appointments] = await db.execute(
            `SELECT 
                appointment_id,
                appointment_date,
                appointment_time,
                status,
                patient_id,
                doctor_id
             FROM appointments
             WHERE appointment_id = ? ${doctorScope}`,
            parameters
        );

        if (appointments.length === 0) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        res.json(appointments[0]);

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to fetch appointment"
        });
    }
});
// Update appointment
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const {
            patient_id,
            doctor_id,
            appointment_date,
            appointment_time,
            status
        } = req.body;

        const allowedStatuses = ["Scheduled", "Confirmed", "Completed", "Cancelled"];
        if (!patient_id || !doctor_id || !appointment_date || !appointment_time || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Patient, doctor, date, time and a valid status are required"
            });
        }
        if (req.user.role === "receptionist" && status === "Completed") {
            return res.status(403).json({
                message: "Only a doctor or admin can complete an appointment"
            });
        }

        const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
        if (Number.isNaN(appointmentDateTime.getTime())) {
            return res.status(400).json({ message: "Invalid date or time" });
        }
        if (["Scheduled", "Confirmed"].includes(status) && appointmentDateTime < new Date()) {
            return res.status(400).json({ message: "Appointment cannot be scheduled in the past" });
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

        const [existingAppointments] = await db.execute(
            "SELECT doctor_id FROM appointments WHERE appointment_id = ?",
            [id]
        );
        if (existingAppointments.length === 0 || (req.user.role === "doctor" && String(existingAppointments[0].doctor_id) !== String(req.user.doctor_id))) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        if (["Scheduled", "Confirmed"].includes(status)) {
            const [conflicts] = await db.execute(
                `SELECT appointment_id
                 FROM appointments
                 WHERE appointment_id <> ?
                   AND appointment_date = ?
                   AND appointment_time = ?
                   AND status IN ('Scheduled', 'Confirmed')
                   AND (doctor_id = ? OR patient_id = ?)` ,
                [id, appointment_date, appointment_time, doctor_id, patient_id]
            );
            if (conflicts.length > 0) {
                return res.status(409).json({
                    message: "The patient or doctor already has an appointment at this time"
                });
            }
        }

        const [result] = await db.execute(
            `UPDATE appointments
             SET patient_id = ?,
                 doctor_id = ?,
                 appointment_date = ?,
                 appointment_time = ?,
                 status = ?
             WHERE appointment_id = ?`,
            [
                patient_id,
                doctor_id,
                appointment_date,
                appointment_time,
                status,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        res.json({
            message: "Appointment updated successfully"
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Failed to update appointment"
        });
    }
});
// DELETE appointment
router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    async (req, res) => {
    try {
        const { id } = req.params;

        console.log("DELETE request received. ID:", id);
        console.log("Running DELETE query...");

        const sql = 'DELETE FROM appointments WHERE appointment_id = ?';

        const [result] = await db.query(sql, [id]);

        console.log("DELETE query completed.");
        console.log("Affected rows:", result.affectedRows);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: 'Appointment not found'
            });
        }

        res.status(200).json({
            message: 'Appointment deleted successfully'
        });

    } catch (err) {
        console.error("DELETE ERROR:", err);

        res.status(500).json({
            message: 'Error deleting appointment',
            error: err.message
        });
    }
    }
);
module.exports = router;