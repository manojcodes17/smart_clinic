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
    throw new Error(data.message || "API request failed");
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

// ==========================================
// DOCTORS
// ==========================================

export const getDoctors = async () => {
  return apiFetch("/doctors");
};

// ==========================================
// APPOINTMENTS
// ==========================================

export const getAppointments = async () => {
  return apiFetch("/appointments");
};

// ==========================================
// MEDICAL RECORDS
// ==========================================

export const getMedicalRecords = async () => {
  return apiFetch("/medical-records");
};

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