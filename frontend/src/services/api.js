const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// ==========================================
// GET TOKEN
// ==========================================

const getToken = () => {
  return localStorage.getItem("token");
};

// ==========================================
// COMMON API FUNCTION
// ==========================================

const apiFetch = async (endpoint, options = {}) => {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),

      ...(options.headers || {}),
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.message || "API request failed");
    error.status = response.status;
    throw error;
  }

  return data;
};

// ==========================================
// PATIENTS
// ==========================================

export const getPatients = async () => {
  return apiFetch("/patients");
};

export const createPatient = async (patient) => {
  return apiFetch("/patients", {
    method: "POST",
    body: JSON.stringify(patient),
  });
};

export const updatePatient = (id, patient) =>
  apiFetch(`/patients/${id}`, {
    method: "PUT",
    body: JSON.stringify(patient),
  });

export const deletePatient = (id) =>
  apiFetch(`/patients/${id}`, { method: "DELETE" });

// ==========================================
// DOCTORS
// ==========================================

export const getDoctors = async () => {
  return apiFetch("/doctors");
};

export const createDoctor = (doctor) =>
  apiFetch("/doctors", {
    method: "POST",
    body: JSON.stringify(doctor),
  });

export const updateDoctor = (id, doctor) =>
  apiFetch(`/doctors/${id}`, {
    method: "PUT",
    body: JSON.stringify(doctor),
  });

export const deleteDoctor = (id) =>
  apiFetch(`/doctors/${id}`, { method: "DELETE" });

// ==========================================
// APPOINTMENTS
// ==========================================

export const getAppointments = async () => {
  return apiFetch("/appointments");
};

export const createAppointment = (appointment) =>
  apiFetch("/appointments", {
    method: "POST",
    body: JSON.stringify(appointment),
  });

export const updateAppointment = (id, appointment) =>
  apiFetch(`/appointments/${id}`, {
    method: "PUT",
    body: JSON.stringify(appointment),
  });

export const deleteAppointment = (id) =>
  apiFetch(`/appointments/${id}`, { method: "DELETE" });

// ==========================================
// MEDICAL RECORDS
// ==========================================

export const getMedicalRecords = async () => {
  return apiFetch("/medical-records");
};

export const createMedicalRecord = (record) =>
  apiFetch("/medical-records", {
    method: "POST",
    body: JSON.stringify(record),
  });

export const updateMedicalRecord = (id, record) =>
  apiFetch(`/medical-records/${id}`, {
    method: "PUT",
    body: JSON.stringify(record),
  });

export const deleteMedicalRecord = (id) =>
  apiFetch(`/medical-records/${id}`, { method: "DELETE" });

// ==========================================
// LOGIN
// ==========================================

export const login = async (username, password) => {
  const data = await apiFetch("/auth/login", {
    method: "POST",

    body: JSON.stringify({
      username,
      password,
    }),
  });

  localStorage.setItem("token", data.token);

  localStorage.setItem(
    "user",
    JSON.stringify(data.user)
  );

  return data;
};

// ==========================================
// LOGOUT
// ==========================================

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getCurrentUser = () => {
  const user = localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
};