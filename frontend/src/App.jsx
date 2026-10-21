import { useCallback, useEffect, useState } from "react";
import "./App.css";

import {
  getPatients,
  getDoctors,
  getAppointments,
  getMedicalRecords,
  createPatient,
  getCurrentUser,
  login,
  logout,
} from "./services/api";

function App() {
  // =========================================================
  // STATE
  // =========================================================

  const [currentPage, setCurrentPage] = useState("dashboard");

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState(() => {
    const savedUser = getCurrentUser();
    return ["admin", "doctor"].includes(savedUser?.role)
      ? savedUser
      : null;
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // =========================================================
  // LOAD ALL CLINIC DATA
  // =========================================================

  const fetchClinicData = useCallback(async () => {
    const [
      patientsResponse,
      doctorsResponse,
      appointmentsResponse,
      recordsResponse,
    ] = await Promise.all([
      getPatients(),
      getDoctors(),
      getAppointments(),
      getMedicalRecords(),
    ]);

    return {
      patients: patientsResponse?.patients || patientsResponse || [],
      doctors: doctorsResponse?.doctors || doctorsResponse || [],
      appointments: appointmentsResponse?.appointments || appointmentsResponse || [],
      medicalRecords:
        recordsResponse?.records ||
        recordsResponse?.medicalRecords ||
        recordsResponse ||
        [],
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let active = true;

    fetchClinicData()
      .then((data) => {
        if (!active) return;
        setPatients(data.patients);
        setDoctors(data.doctors);
        setAppointments(data.appointments);
        setMedicalRecords(data.medicalRecords);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        console.error("Dashboard loading error:", err);
        setError(err.message || "Unable to load clinic data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchClinicData, user]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await login(username, password);

      if (!["admin", "doctor"].includes(result.user.role)) {
        logout();
        setError("This dashboard is available to clinic staff only.");
        return;
      }

      setUser(result.user);
      setPassword("");
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    }
  };

  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {
    logout();
    setUser(null);
    setCurrentPage("dashboard");
  };

  // =========================================================
  // NAVIGATION
  // =========================================================

  const goTo = (page) => {
    setCurrentPage(page);
  };

  // =========================================================
  // COMPLETED APPOINTMENTS
  // =========================================================

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.status?.toLowerCase() ===
        "completed"
    );

  // =========================================================
  // DASHBOARD PAGE
  // =========================================================

  const DashboardPage = () => {
    return (
      <>
        <div className="topbar">
          <div>
            <h1>Good Evening 👋</h1>
            <p>
              Here's what's happening at your clinic today.
            </p>
          </div>

          <div className="topbar-right">
            <div className="notification">
              🔔
            </div>

            <div className="profile">
              <div className="profile-avatar">
                A
              </div>

              <div>
                <strong>{user.username}</strong>
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon patient-icon">
              ♙
            </div>

            <div className="stat-content">
              <span>Total Patients</span>

              <strong>
                {loading ? "..." : patients.length}
              </strong>

              <small>Live database</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon doctor-icon">
              ⚕
            </div>

            <div className="stat-content">
              <span>Total Doctors</span>

              <strong>
                {loading ? "..." : doctors.length}
              </strong>

              <small>Live database</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon appointment-icon">
              ◷
            </div>

            <div className="stat-content">
              <span>Appointments</span>

              <strong>
                {loading ? "..." : appointments.length}
              </strong>

              <small>Total appointments</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed-icon">
              ✓
            </div>

            <div className="stat-content">
              <span>Completed</span>

              <strong>
                {loading
                  ? "..."
                  : completedAppointments.length}
              </strong>

              <small>
                {appointments.length > 0
                  ? `${Math.round(
                      (completedAppointments.length /
                        appointments.length) *
                        100
                    )}% completion`
                  : "0% completion"}
              </small>
            </div>
          </div>

        </div>

        <div className="dashboard-grid">

          <div className="panel">

            <div className="panel-header">
              <div>
                <h2>Today's Appointments</h2>

                <p>
                  Upcoming patient appointments
                </p>
              </div>

              <button
                className="view-all"
                onClick={() =>
                  goTo("appointments")
                }
              >
                View All
              </button>
            </div>

            <div className="appointment-list">

              {appointments.length === 0 ? (
                <div className="empty-state">
                  No appointments found.
                </div>
              ) : (
                appointments
                  .slice(0, 5)
                  .map((appointment, index) => (
                    <div
                      className="appointment-item"
                      key={
                        appointment.appointment_id ||
                        appointment.id ||
                        index
                      }
                    >

                      <div className="patient-avatar">
                        {(
                          appointment.patient_name ||
                          appointment.patientName ||
                          "P"
                        )
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>

                      <div className="appointment-info">
                        <strong>
                          {appointment.patient_name ||
                            appointment.patientName ||
                            "Unknown Patient"}
                        </strong>

                        <span>
                          {appointment.doctor_name ||
                            appointment.doctorName ||
                            "Doctor"}
                        </span>
                      </div>

                      <div className="appointment-time">
                        <strong>
                          {appointment.appointment_time ||
                            appointment.time ||
                            "12:00 am"}
                        </strong>

                        <span>
                          {appointment.status ||
                            "Confirmed"}
                        </span>
                      </div>

                    </div>
                  ))
              )}

            </div>
          </div>

          <div className="panel">

            <div className="panel-header">
              <div>
                <h2>Quick Actions</h2>

                <p>
                  Common clinic operations
                </p>
              </div>
            </div>

            <div className="quick-actions">

              <button
                onClick={() =>
                  goTo("patients")
                }
              >
                <span>+</span>
                Register a new patient
              </button>

              <button
                onClick={() =>
                  goTo("appointments")
                }
              >
                <span>◷</span>
                Schedule patient visit
              </button>

              <button
                onClick={() =>
                  goTo("doctors")
                }
              >
                <span>⚕</span>
                Register medical staff
              </button>

              <button
                onClick={() =>
                  goTo("records")
                }
              >
                <span>▤</span>
                Create patient record
              </button>

            </div>
          </div>

        </div>
      </>
    );
  };

  // =========================================================
  // PATIENTS PAGE
  // =========================================================

  const PatientsPage = () => {

    const [showForm, setShowForm] =
      useState(false);

    const [submitting, setSubmitting] =
      useState(false);

    const [formData, setFormData] =
      useState({
        name: "",
        dob: "",
        gender: "",
        phone: "",
        email: "",
        address: "",
      });

    // -------------------------------------------------------
    // INPUT CHANGE
    // -------------------------------------------------------

    const handleInputChange = (e) => {
      const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    };

    // -------------------------------------------------------
    // RESET FORM
    // -------------------------------------------------------

    const resetForm = () => {
      setFormData({
        name: "",
        dob: "",
        gender: "",
        phone: "",
        email: "",
        address: "",
      });

      setShowForm(false);
    };

    // -------------------------------------------------------
    // REGISTER PATIENT
    // -------------------------------------------------------

    const handleRegisterPatient = async (e) => {
      e.preventDefault();

      if (
        !formData.name ||
        !formData.dob ||
        !formData.gender ||
        !formData.phone ||
        !formData.email
      ) {
        alert(
          "Please fill all required fields."
        );
        return;
      }

      try {
        setSubmitting(true);
        await createPatient(formData);

        alert(
          "Patient registered successfully! ✅"
        );

        resetForm();

        const clinicData = await fetchClinicData();
        setPatients(clinicData.patients);
        setDoctors(clinicData.doctors);
        setAppointments(clinicData.appointments);
        setMedicalRecords(clinicData.medicalRecords);

      } catch (error) {

        console.error(
          "Patient registration error:",
          error
        );

        alert(
          error.message ||
            "Unable to register patient."
        );

      } finally {
        setSubmitting(false);
      }
    };

    return (
      <>
        {/* HEADER */}

        <div className="topbar">

          <div>
            <h1>Patients</h1>

            <p>
              Manage registered patients
            </p>
          </div>

          <div className="topbar-right">

            <div className="notification">
              🔔
            </div>

            <div className="profile">

              <div className="profile-avatar">
                A
              </div>

              <div>
                <strong>{user.username}</strong>
                <span>{user.role}</span>
              </div>

            </div>

          </div>

        </div>


        {/* PATIENT LIST */}

        <div className="panel patients-panel">

          <div className="panel-header">

            <div>
              <h2>Patient List</h2>

              <p>
                {patients.length} patients registered
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() =>
                setShowForm(true)
              }
            >
              + Register Patient
            </button>

          </div>


          {/* PATIENT TABLE */}

          {patients.length === 0 ? (

            <div className="empty-state">
              No patients found.
            </div>

          ) : (

            <div className="table-container">

              <table className="data-table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient Name</th>
                    <th>Date of Birth</th>
                    <th>Gender</th>
                    <th>Phone</th>
                    <th>Email</th>
                  </tr>
                </thead>

                <tbody>

                  {patients.map(
                    (patient, index) => (

                      <tr
                        key={
                          patient.patient_id ||
                          patient.id ||
                          index
                        }
                      >

                        <td>
                          #
                          {patient.patient_id ||
                            patient.id}
                        </td>

                        <td>

                          <div className="table-patient">

                            <div className="small-avatar">
                              {patient.name
                                ?.substring(
                                  0,
                                  2
                                )
                                .toUpperCase()}
                            </div>

                            <strong>
                              {patient.name}
                            </strong>

                          </div>

                        </td>

                        <td>
                          {patient.dob
                            ? new Date(
                                patient.dob
                              ).toLocaleDateString(
                                "en-GB"
                              )
                            : "-"}
                        </td>

                        <td>
                          {patient.gender ||
                            "-"}
                        </td>

                        <td>
                          {patient.phone ||
                            "-"}
                        </td>

                        <td>
                          {patient.email ||
                            "-"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* =================================================
            REGISTER PATIENT FORM
        ================================================= */}

        {showForm && (

          <div className="patient-form-card">

            <div className="form-header">

              <div>
                <h2>
                  Register New Patient
                </h2>

                <p>
                  Enter patient information below.
                </p>
              </div>

              <button
                type="button"
                className="close-form-button"
                onClick={resetForm}
              >
                ×
              </button>

            </div>


            <form
              className="patient-form"
              onSubmit={
                handleRegisterPatient
              }
            >

              {/* NAME */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Patient Name
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="Enter patient name"
                    required
                  />

                </div>


                {/* DOB */}

                <div className="form-group">

                  <label>
                    Date of Birth
                    <span>*</span>
                  </label>

                  <input
                    type="date"
                    name="dob"
                    value={
                      formData.dob
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                  />

                </div>

              </div>


              {/* GENDER + PHONE */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Gender
                    <span>*</span>
                  </label>

                  <select
                    name="gender"
                    value={
                      formData.gender
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                  >

                    <option value="">
                      Select Gender
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>

                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Phone
                    <span>*</span>
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      formData.phone
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="Enter phone number"
                    maxLength="10"
                    required
                  />

                </div>

              </div>


              {/* EMAIL */}

              <div className="form-group">

                <label>
                  Email
                  <span>*</span>
                </label>

                <input
                  type="email"
                  name="email"
                  value={
                    formData.email
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter email address"
                  required
                />

              </div>


              {/* ADDRESS */}

              <div className="form-group">

                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  value={
                    formData.address
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter patient address"
                  rows="4"
                />

              </div>


              {/* BUTTONS */}

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Registering..."
                    : "Register Patient"}
                </button>

              </div>

            </form>

          </div>

        )}

      </>
    );
  };


  // =========================================================
  // DOCTORS PAGE
  // =========================================================

  const DoctorsPage = () => {

    return (
      <>
        <div className="topbar">

          <div>
            <h1>Doctors</h1>

            <p>
              Manage clinic doctors and medical staff
            </p>
          </div>

        </div>


        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>Doctors</h2>

              <p>
                {doctors.length} doctors registered
              </p>
            </div>

          </div>


          {doctors.length === 0 ? (

            <div className="empty-state">
              No doctors found.
            </div>

          ) : (

            <div className="table-container">

              <table className="data-table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Specialization</th>
                    <th>Phone</th>
                    <th>Email</th>
                  </tr>
                </thead>

                <tbody>

                  {doctors.map(
                    (doctor, index) => (

                      <tr
                        key={
                          doctor.doctor_id ||
                          doctor.id ||
                          index
                        }
                      >

                        <td>
                          #
                          {doctor.doctor_id ||
                            doctor.id}
                        </td>

                        <td>
                          <strong>
                            {doctor.name ||
                              doctor.doctor_name ||
                              "-"}
                          </strong>
                        </td>

                        <td>
                          {doctor.specialization ||
                            doctor.speciality ||
                            "-"}
                        </td>

                        <td>
                          {doctor.phone ||
                            "-"}
                        </td>

                        <td>
                          {doctor.email ||
                            "-"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>
      </>
    );
  };


  // =========================================================
  // APPOINTMENTS PAGE
  // =========================================================

  const AppointmentsPage = () => {

    return (
      <>
        <div className="topbar">

          <div>
            <h1>Appointments</h1>

            <p>
              Manage patient appointments
            </p>
          </div>

        </div>


        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>Appointment List</h2>

              <p>
                {appointments.length} appointments
              </p>
            </div>

          </div>


          {appointments.length === 0 ? (

            <div className="empty-state">
              No appointments found.
            </div>

          ) : (

            <div className="table-container">

              <table className="data-table">

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>

                </thead>

                <tbody>

                  {appointments.map(
                    (appointment, index) => (

                      <tr
                        key={
                          appointment.appointment_id ||
                          appointment.id ||
                          index
                        }
                      >

                        <td>
                          #
                          {appointment.appointment_id ||
                            appointment.id}
                        </td>

                        <td>
                          <strong>
                            {appointment.patient_name ||
                              appointment.patientName ||
                              "-"}
                          </strong>
                        </td>

                        <td>
                          {appointment.doctor_name ||
                            appointment.doctorName ||
                            "-"}
                        </td>

                        <td>
                          {appointment.appointment_date ||
                            appointment.date ||
                            "-"}
                        </td>

                        <td>
                          {appointment.appointment_time ||
                            appointment.time ||
                            "-"}
                        </td>

                        <td>
                          <span className="status-badge">
                            {appointment.status ||
                              "Confirmed"}
                          </span>
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>
      </>
    );
  };


  // =========================================================
  // MEDICAL RECORDS PAGE
  // =========================================================

  const RecordsPage = () => {

    return (
      <>
        <div className="topbar">

          <div>
            <h1>Medical Records</h1>

            <p>
              Patient medical history and records
            </p>
          </div>

        </div>


        <div className="panel">

          <div className="panel-header">

            <div>
              <h2>Medical Records</h2>

              <p>
                {medicalRecords.length} records
              </p>
            </div>

          </div>


          {medicalRecords.length === 0 ? (

            <div className="empty-state">
              No medical records found.
            </div>

          ) : (

            <div className="table-container">

              <table className="data-table">

                <thead>

                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Diagnosis</th>
                    <th>Treatment</th>
                    <th>Date</th>
                  </tr>

                </thead>

                <tbody>

                  {medicalRecords.map(
                    (record, index) => (

                      <tr
                        key={
                          record.record_id ||
                          record.id ||
                          index
                        }
                      >

                        <td>
                          #
                          {record.record_id ||
                            record.id}
                        </td>

                        <td>
                          {record.patient_name ||
                            record.patientName ||
                            "-"}
                        </td>

                        <td>
                          {record.diagnosis ||
                            "-"}
                        </td>

                        <td>
                          {record.treatment ||
                            "-"}
                        </td>

                        <td>
                          {record.visit_date ||
                            record.date ||
                            "-"}
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>
      </>
    );
  };


  // =========================================================
  // ANALYTICS PAGE
  // =========================================================

  const AnalyticsPage = () => {

    const completionRate =
      appointments.length > 0
        ? Math.round(
            (completedAppointments.length /
              appointments.length) *
              100
          )
        : 0;

    return (
      <>
        <div className="topbar">

          <div>
            <h1>Analytics</h1>

            <p>
              Clinic performance overview
            </p>
          </div>

        </div>


        <div className="stats-grid">

          <div className="stat-card">

            <div className="stat-icon patient-icon">
              ♙
            </div>

            <div className="stat-content">

              <span>Total Patients</span>

              <strong>
                {patients.length}
              </strong>

              <small>
                Registered patients
              </small>

            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon doctor-icon">
              ⚕
            </div>

            <div className="stat-content">

              <span>Total Doctors</span>

              <strong>
                {doctors.length}
              </strong>

              <small>
                Medical staff
              </small>

            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon appointment-icon">
              ◷
            </div>

            <div className="stat-content">

              <span>Appointments</span>

              <strong>
                {appointments.length}
              </strong>

              <small>
                Total appointments
              </small>

            </div>

          </div>


          <div className="stat-card">

            <div className="stat-icon completed-icon">
              ✓
            </div>

            <div className="stat-content">

              <span>Completion Rate</span>

              <strong>
                {completionRate}%
              </strong>

              <small>
                Appointment completion
              </small>

            </div>

          </div>

        </div>


        <div className="panel">

          <div className="panel-header">

            <div>

              <h2>
                Clinic Overview
              </h2>

              <p>
                Current database statistics
              </p>

            </div>

          </div>


          <div className="analytics-content">

            <div className="analytics-item">
              <span>Patients</span>
              <strong>
                {patients.length}
              </strong>
            </div>

            <div className="analytics-item">
              <span>Doctors</span>
              <strong>
                {doctors.length}
              </strong>
            </div>

            <div className="analytics-item">
              <span>Appointments</span>
              <strong>
                {appointments.length}
              </strong>
            </div>

            <div className="analytics-item">
              <span>Medical Records</span>
              <strong>
                {medicalRecords.length}
              </strong>
            </div>

          </div>

        </div>
      </>
    );
  };


  // =========================================================
  // PAGE SELECTOR
  // =========================================================

  const renderPage = () => {

    switch (currentPage) {

      case "patients":
        return <PatientsPage />;

      case "doctors":
        return <DoctorsPage />;

      case "appointments":
        return <AppointmentsPage />;

      case "records":
        return <RecordsPage />;

      case "analytics":
        return <AnalyticsPage />;

      case "dashboard":
      default:
        return <DashboardPage />;
    }
  };


  if (!user) {
    return (
      <main className="login-shell">
        <form className="login-form" onSubmit={handleLogin}>
          <div className="logo-icon">+</div>
          <p className="login-eyebrow">SMART CLINIC</p>
          <h1>Staff sign in</h1>
          <p className="login-description">Sign in to manage clinic operations.</p>

          {error && <div className="error-box" role="alert">{error}</div>}

          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <button type="submit" className="submit-button">Sign in</button>
        </form>
      </main>
    );
  }


  // =========================================================
  // MAIN APP
  // =========================================================

  return (
    <div className="app">

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="sidebar">

        {/* LOGO */}

        <div className="logo">

          <div className="logo-icon">
            +
          </div>

          <div>
            <h2>
              Smart Clinic
            </h2>

            <span>
              Patient Management
            </span>
          </div>

        </div>


        {/* NAVIGATION */}

        <nav>

          <a
            className={
              currentPage === "dashboard"
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("dashboard")
            }
          >
            ▦
            <span>
              Dashboard
            </span>
          </a>


          <a
            className={
              currentPage === "patients"
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("patients")
            }
          >
            ♙
            <span>
              Patients
            </span>
          </a>


          <a
            className={
              currentPage === "doctors"
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("doctors")
            }
          >
            ⚕
            <span>
              Doctors
            </span>
          </a>


          <a
            className={
              currentPage === "appointments"
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("appointments")
            }
          >
            ◷
            <span>
              Appointments
            </span>
          </a>


          <a
            className={
              currentPage === "records"
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("records")
            }
          >
            ▤
            <span>
              Medical Records
            </span>
          </a>


          <a
            className={
              currentPage === "analytics"
                ? "active"
                : ""
            }
            onClick={() =>
              goTo("analytics")
            }
          >
            ◔
            <span>
              Analytics
            </span>
          </a>

        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">

          <a>
            ⚙
            <span>
              Settings
            </span>
          </a>

          <a
            onClick={handleLogout}
          >
            ↪
            <span>
              Logout
            </span>
          </a>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="main">

        {renderPage()}

      </main>

    </div>
  );
}

export default App;