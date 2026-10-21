import { useEffect, useState } from "react";
import {
  Activity,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ClipboardList,
  Clock3,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  LogOut,
  Pencil,
  Plus,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import {
  createAppointment,
  createDoctor,
  createMedicalRecord,
  createPatient,
  deleteAppointment,
  deleteDoctor,
  deleteMedicalRecord,
  deletePatient,
  getAppointments,
  getCurrentUser,
  getDoctors,
  getMedicalRecords,
  getPatients,
  login,
  logout,
  updateAppointment,
  updateDoctor,
  updateMedicalRecord,
  updatePatient,
} from "./services/api";
import "./App.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const roleAccess = {
  admin: ["dashboard", "patients", "doctors", "appointments", "records", "analytics", "settings"],
  doctor: ["dashboard", "patients", "doctors", "appointments", "records", "analytics", "settings"],
  receptionist: ["dashboard", "patients", "doctors", "appointments", "settings"],
};

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "patients", label: "Patients", icon: Users },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "appointments", label: "Appointments", icon: CalendarDays },
  { id: "records", label: "Medical Records", icon: FileText },
  { id: "analytics", label: "Analytics", icon: ChartNoAxesCombined },
  { id: "settings", label: "Settings", icon: Settings },
];

const fieldDefinitions = {
  patients: [
    { name: "name", label: "Full name", required: true, placeholder: "Patient name" },
    { name: "dob", label: "Date of birth", type: "date", required: true },
    { name: "gender", label: "Gender", type: "select", required: true, options: ["Female", "Male", "Other"] },
    { name: "phone", label: "Phone", type: "tel", required: true, placeholder: "+1 555 0100" },
    { name: "email", label: "Email", type: "email", required: true, placeholder: "name@example.com" },
    { name: "address", label: "Address", type: "textarea", wide: true, placeholder: "Street, city, postal code" },
  ],
  doctors: [
    { name: "name", label: "Full name", required: true, placeholder: "Doctor name" },
    { name: "specialization", label: "Specialization", required: true, placeholder: "Family medicine" },
    { name: "phone", label: "Phone", type: "tel", placeholder: "+1 555 0100" },
    { name: "email", label: "Email", type: "email", placeholder: "name@example.com" },
    { name: "availability", label: "Availability", type: "textarea", wide: true, placeholder: "e.g. Mon-Fri, 09:00-17:00" },
  ],
  appointments: [
    { name: "patient_id", label: "Patient", type: "patient", required: true },
    { name: "doctor_id", label: "Doctor", type: "doctor", required: true },
    { name: "appointment_date", label: "Date", type: "date", required: true },
    { name: "appointment_time", label: "Time", type: "time", required: true },
    { name: "status", label: "Status", type: "select", options: ["Scheduled", "Confirmed", "Completed", "Cancelled"] },
  ],
  records: [
    { name: "patient_id", label: "Patient", type: "patient", required: true },
    { name: "doctor_id", label: "Doctor", type: "doctor", required: true },
    { name: "visit_date", label: "Visit date", type: "date", required: true },
    { name: "diagnosis", label: "Diagnosis", type: "textarea", wide: true, placeholder: "Clinical diagnosis" },
    { name: "treatment", label: "Treatment", type: "textarea", wide: true, placeholder: "Treatment plan" },
    { name: "notes", label: "Notes", type: "textarea", wide: true, placeholder: "Additional clinical notes" },
  ],
};

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const dateInputValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
};

const displayDate = (value) => {
  if (!value) return "-";
  const normalized = dateInputValue(value);
  return new Date(`${normalized}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const normalizeRows = (response, key) => response?.[key] || [];

async function fetchClinicData(role) {
  const requests = [getPatients(), getDoctors(), getAppointments()];
  if (role === "admin" || role === "doctor") requests.push(getMedicalRecords());
  const [patientResponse, doctorResponse, appointmentResponse, recordResponse] = await Promise.all(requests);
  return {
    patients: normalizeRows(patientResponse, "patients"),
    doctors: normalizeRows(doctorResponse, "doctors"),
    appointments: normalizeRows(appointmentResponse, "appointments"),
    records: normalizeRows(recordResponse, "records"),
  };
}

function emptyValues(resource, record) {
  if (!record) {
    return {
      patients: { name: "", dob: "", gender: "", phone: "", email: "", address: "" },
      doctors: { name: "", specialization: "", phone: "", email: "", availability: "" },
      appointments: { patient_id: "", doctor_id: "", appointment_date: "", appointment_time: "", status: "Scheduled" },
      records: { patient_id: "", doctor_id: "", visit_date: today(), diagnosis: "", treatment: "", notes: "" },
    }[resource];
  }

  const values = { ...record };
  for (const field of fieldDefinitions[resource]) {
    if (field.type === "date") values[field.name] = dateInputValue(values[field.name]);
    if (field.type === "time") values[field.name] = String(values[field.name] || "").slice(0, 5);
  }
  return values;
}

function FormDialog({ dialog, patients, doctors, onClose, onSave }) {
  const { resource, record } = dialog;
  const [values, setValues] = useState(() => emptyValues(resource, record));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const fields = fieldDefinitions[resource];
  const title = `${record ? "Edit" : "Add"} ${resource === "records" ? "medical record" : resource.slice(0, -1)}`;

  const setField = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (resource === "patients" && (!/^[0-9+() -]{7,20}$/.test(values.phone) || values.phone.replace(/\D/g, "").length < 7)) {
      setFormError("Enter a valid phone number with at least seven digits.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await onSave(resource, record, values);
    } catch (error) {
      setFormError(error.message || "Unable to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="form-dialog-title">
        <header className="dialog-header">
          <div>
            <span className="eyebrow">CLINIC WORKSPACE</span>
            <h2 id="form-dialog-title">{title}</h2>
          </div>
          <button type="button" className="icon-button" aria-label="Close form" onClick={onClose}><X size={18} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="dialog-fields">
            {fields.map((field) => (
              <label className={`field-group${field.wide ? " field-wide" : ""}`} key={field.name}>
                <span>{field.label}{field.required && <b> *</b>}</span>
                {field.type === "textarea" ? (
                  <textarea name={field.name} rows="3" value={values[field.name] || ""} onChange={(event) => setField(field.name, event.target.value)} placeholder={field.placeholder} />
                ) : field.type === "select" ? (
                  <select name={field.name} required={field.required} value={values[field.name] || ""} onChange={(event) => setField(field.name, event.target.value)}>
                    <option value="">{field.name === "gender" ? "Select gender" : "Select status"}</option>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === "patient" || field.type === "doctor" ? (
                  <select name={field.name} required value={values[field.name] || ""} onChange={(event) => setField(field.name, event.target.value)}>
                    <option value="">Select {field.type}</option>
                    {(field.type === "patient" ? patients : doctors).map((item) => {
                      const id = field.type === "patient" ? item.patient_id : item.doctor_id;
                      return <option key={id} value={id}>{item.name}</option>;
                    })}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.type || "text"}
                    required={field.required}
                    pattern={field.pattern}
                    placeholder={field.placeholder}
                    maxLength={field.type === "tel" ? 20 : undefined}
                    inputMode={field.type === "tel" ? "tel" : undefined}
                    value={values[field.name] || ""}
                    min={field.type === "date" && resource === "appointments" && !record ? today() : undefined}
                    max={field.type === "date" && resource === "patients" ? today() : undefined}
                    onChange={(event) => setField(field.name, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
          {formError && <p className="inline-error" role="alert">{formError}</p>}
          <footer className="dialog-actions">
            <button type="button" className="button-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="button-primary" disabled={saving}>
              {saving ? "Saving..." : record ? "Save changes" : `Create ${resource === "records" ? "record" : resource.slice(0, -1)}`}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function DetailDialog({ detail, onClose }) {
  const { resource, record } = detail;
  const details = {
    patients: [
      ["Patient ID", record.patient_id], ["Full name", record.name],
      ["Date of birth", displayDate(record.dob)], ["Gender", record.gender],
      ["Phone", record.phone], ["Email", record.email], ["Address", record.address],
    ],
    doctors: [
      ["Doctor ID", record.doctor_id], ["Full name", record.name],
      ["Specialization", record.specialization], ["Phone", record.phone],
      ["Email", record.email], ["Availability", record.availability],
    ],
    appointments: [
      ["Appointment ID", record.appointment_id], ["Patient", record.patient_name],
      ["Doctor", record.doctor_name], ["Date", displayDate(record.appointment_date)],
      ["Time", String(record.appointment_time || "").slice(0, 5)], ["Status", record.status],
    ],
    records: [
      ["Record ID", record.record_id], ["Patient", record.patient_name],
      ["Doctor", record.doctor_name], ["Visit date", displayDate(record.visit_date)],
      ["Diagnosis", record.diagnosis], ["Treatment", record.treatment], ["Notes", record.notes],
    ],
  }[resource];

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="form-dialog detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-dialog-title">
        <header className="dialog-header"><div><span className="eyebrow">RECORD DETAILS</span><h2 id="detail-dialog-title">{resource === "records" ? "Medical record" : resource.slice(0, -1)}</h2></div><button type="button" className="icon-button" aria-label="Close details" onClick={onClose}><X size={18} /></button></header>
        <dl className="detail-grid">{details.map(([label, value]) => <div key={label} className="detail-item"><dt>{label}</dt><dd>{value || "-"}</dd></div>)}</dl>
        <footer className="dialog-actions"><button type="button" className="button-secondary" onClick={onClose}>Close</button></footer>
      </section>
    </div>
  );
}

function ClinicWorkspace() {
  const [user, setUser] = useState(() => {
    const savedUser = getCurrentUser();
    return roleAccess[savedUser?.role] ? savedUser : null;
  });
  const [nowTimestamp] = useState(() => Date.now());
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState({ patients: [], doctors: [], appointments: [], records: [] });
  const [loading, setLoading] = useState(Boolean(user));
  const [pageError, setPageError] = useState("");
  const [toast, setToast] = useState("");
  const [dialog, setDialog] = useState(null);
  const [detail, setDetail] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    fetchClinicData(user.role)
      .then((nextData) => {
        if (active) {
          setData(nextData);
          setPageError("");
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401 || error.status === 403) {
          logout();
          setUser(null);
        }
        setPageError(error.message || "Unable to load clinic data.");
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const refreshData = async () => {
    const nextData = await fetchClinicData(user.role);
    setData(nextData);
    setPageError("");
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    setSearch("");
    setFilter("all");
  };

  const signIn = async (event) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const result = await login(loginName, loginPassword);
      if (!roleAccess[result.user.role]) {
        logout();
        throw new Error("This account does not have access to the staff workspace.");
      }
      setLoading(true);
      setUser(result.user);
      setLoginPassword("");
    } catch (error) {
      setLoginError(error.message || "Unable to sign in.");
    } finally {
      setLoginBusy(false);
    }
  };

  const signOut = () => {
    logout();
    setUser(null);
    setData({ patients: [], doctors: [], appointments: [], records: [] });
    setPage("dashboard");
  };

  const saveRecord = async (resource, record, values) => {
    const id = record?.[resource === "patients" ? "patient_id" : resource === "doctors" ? "doctor_id" : resource === "appointments" ? "appointment_id" : "record_id"];
    const operations = {
      patients: record ? updatePatient : createPatient,
      doctors: record ? updateDoctor : createDoctor,
      appointments: record ? updateAppointment : createAppointment,
      records: record ? updateMedicalRecord : createMedicalRecord,
    };
    if (record) await operations[resource](id, values);
    else await operations[resource](values);
    await refreshData();
    setDialog(null);
    setToast(`${resource === "records" ? "Medical record" : resource.slice(0, -1)} ${record ? "updated" : "created"}.`);
  };

  const removeRecord = async (resource, record) => {
    const labels = { patients: record.name, doctors: record.name, appointments: `appointment #${record.appointment_id}`, records: `medical record #${record.record_id}` };
    const detail = resource === "patients" || resource === "doctors"
      ? "Linked appointments or records may prevent deletion."
      : "This cannot be undone.";
    if (!window.confirm(`Delete ${labels[resource]}? ${detail}`)) return;
    const id = record[resource === "patients" ? "patient_id" : resource === "doctors" ? "doctor_id" : resource === "appointments" ? "appointment_id" : "record_id"];
    const operations = { patients: deletePatient, doctors: deleteDoctor, appointments: deleteAppointment, records: deleteMedicalRecord };
    try {
      await operations[resource](id);
      await refreshData();
      setToast("Record deleted.");
    } catch (error) {
      setPageError(error.message || "Unable to delete this record.");
    }
  };

  const cancelAppointment = async (appointment) => {
    if (!window.confirm(`Cancel the appointment for ${appointment.patient_name}?`)) return;
    try {
      await updateAppointment(appointment.appointment_id, {
        appointment_date: dateInputValue(appointment.appointment_date),
        appointment_time: String(appointment.appointment_time).slice(0, 8),
        status: "Cancelled",
      });
      await refreshData();
      setToast("Appointment cancelled.");
    } catch (error) {
      setPageError(error.message || "Unable to cancel appointment.");
    }
  };

  const openForm = (resource, record = null) => setDialog({ resource, record, key: `${resource}-${record?.patient_id || record?.doctor_id || record?.appointment_id || record?.record_id || "new"}-${Date.now()}` });
  const allowedPages = roleAccess[user?.role] || [];
  const visibleNav = navigation.filter((item) => allowedPages.includes(item.id));
  const completedCount = data.appointments.filter((item) => item.status?.toLowerCase() === "completed").length;
  const upcomingAppointments = [...data.appointments]
    .filter((item) => item.status?.toLowerCase() !== "cancelled")
    .filter((item) => new Date(`${dateInputValue(item.appointment_date)}T${item.appointment_time}`).getTime() >= nowTimestamp)
    .sort((a, b) => `${dateInputValue(a.appointment_date)}T${a.appointment_time}`.localeCompare(`${dateInputValue(b.appointment_date)}T${b.appointment_time}`))
    .slice(0, 6);

  const common = {
    data,
    user,
    loading,
    onNavigate: changePage,
    onCreate: openForm,
    onEdit: openForm,
    onDelete: removeRecord,
    onCancel: cancelAppointment,
    onView: (resource, record) => setDetail({ resource, record }),
    query: search.trim().toLowerCase(),
    setSearchQuery: (value) => setSearch(value.toLowerCase()),
    filter,
    setFilter,
  };

  const renderPage = () => {
    if (loading) return <div className="loading-state"><span className="spinner" />Loading clinic data</div>;
    if (pageError && page === "dashboard") return <div className="page-error" role="alert"><Activity size={20} /><span>{pageError}</span><button className="button-secondary" onClick={refreshData}>Try again</button></div>;
    switch (page) {
      case "patients": return <PatientsPage {...common} />;
      case "doctors": return <DoctorsPage {...common} />;
      case "appointments": return <AppointmentsPage {...common} />;
      case "records": return <RecordsPage {...common} />;
      case "analytics": return <AnalyticsPage {...common} />;
      case "settings": return <SettingsPage user={user} onLogout={signOut} />;
      default: return <DashboardPage {...common} appointments={upcomingAppointments} completedCount={completedCount} error={pageError} />;
    }
  };

  if (!user) {
    return (
      <main className="login-shell">
        <form className="login-form" onSubmit={signIn}>
          <div className="login-brand"><span className="logo-icon">+</span><span>SMART CLINIC</span></div>
          <p className="eyebrow">CLINIC OPERATIONS</p>
          <h1>Staff sign in</h1>
          <p className="login-description">Access your clinic workspace with your staff account.</p>
          {loginError && <p className="inline-error" role="alert">{loginError}</p>}
          <label className="field-group"><span>Username</span><input autoComplete="username" value={loginName} onChange={(event) => setLoginName(event.target.value)} required /></label>
          <label className="field-group"><span>Password</span><div className="password-field"><input type={showPassword ? "text" : "password"} autoComplete="current-password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required /><button type="button" className="icon-button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <button className="button-primary login-submit" type="submit" disabled={loginBusy}>{loginBusy ? <><span className="spinner spinner-small" />Signing in...</> : "Sign in"}</button>
        </form>
      </main>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo"><div className="logo-icon">+</div><div><h2>Smart Clinic</h2><span>Patient Management</span></div></div>
        <nav aria-label="Main navigation">
          {visibleNav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`sidebar-link${page === id ? " active" : ""}`} onClick={() => changePage(id)} aria-current={page === id ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-account"><div className="profile-avatar"><UserRound size={18} /></div><div className="sidebar-user"><strong>{user.username}</strong><span>{user.role}</span></div><button className="icon-button sidebar-logout" onClick={signOut} title="Log out" aria-label="Log out"><LogOut size={17} /></button></div>
      </aside>

      <main className="main">
        <header className="workspace-topbar">
          <div><p className="eyebrow">SMART CLINIC / {page.toUpperCase()}</p><h1>{navigation.find((item) => item.id === page)?.label || "Dashboard"}</h1></div>
          <div className="topbar-tools">
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label="Notifications" aria-expanded={showNotifications} onClick={() => setShowNotifications((value) => !value)}><Bell size={18} /></button>
              {showNotifications && <div className="notification-popover" role="status">No new notifications.</div>}
            </div>
            <div className="topbar-profile"><div className="profile-avatar"><UserRound size={18} /></div><div><strong>{user.username}</strong><span>{user.role}</span></div></div>
          </div>
        </header>
        {pageError && page !== "dashboard" && <div className="page-error" role="alert"><span>{pageError}</span><button className="icon-button" aria-label="Dismiss error" onClick={() => setPageError("")}><X size={16} /></button></div>}
        {renderPage()}
      </main>

      {dialog && <FormDialog key={dialog.key} dialog={dialog} patients={data.patients} doctors={data.doctors} onClose={() => setDialog(null)} onSave={saveRecord} />}
      {detail && <DetailDialog detail={detail} onClose={() => setDetail(null)} />}
      {toast && <div className="toast-message" role="status"><Check size={17} />{toast}</div>}
    </div>
  );
}

function PageHeading({ title, description, actions }) {
  return <div className="page-heading"><div><h2>{title}</h2><p>{description}</p></div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

function StatCard({ label, value, sublabel, icon: Icon, tone }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={19} /></span><div><span className="metric-label">{label}</span><strong>{value}</strong><small>{sublabel}</small></div></article>;
}

function DashboardPage({ data, loading, onNavigate, onCreate, appointments, completedCount, error }) {
  const role = getCurrentUser()?.role;
  const completion = data.appointments.length ? Math.round((completedCount / data.appointments.length) * 100) : 0;
  return <>
    <section className="welcome-row"><div><h2>Clinic overview</h2><p>Live activity across your practice.</p></div><button className="button-secondary" onClick={() => window.location.reload()} aria-label="Refresh data"><Activity size={16} />Refresh</button></section>
    {error && <div className="page-error" role="alert">{error}</div>}
    <section className="metric-grid" aria-label="Clinic statistics">
      <StatCard label="Total patients" value={loading ? "..." : data.patients.length} sublabel="Registered patients" icon={Users} tone="blue" />
      <StatCard label="Total doctors" value={loading ? "..." : data.doctors.length} sublabel="Active clinic staff" icon={Stethoscope} tone="teal" />
      <StatCard label="Appointments" value={loading ? "..." : data.appointments.length} sublabel="All recorded visits" icon={CalendarDays} tone="amber" />
      <StatCard label="Completed" value={loading ? "..." : completedCount} sublabel={`${completion}% completion rate`} icon={Check} tone="green" />
    </section>
    <section className="dashboard-columns">
      <article className="surface-panel">
        <PageHeading title="Upcoming appointments" description={`${appointments.length} scheduled or completed visits`} actions={<button className="text-button" onClick={() => onNavigate("appointments")}>View all</button>} />
        {appointments.length === 0 ? <EmptyState title="No appointments yet" description="Schedule a visit to start filling your clinic calendar." /> : (
          <div className="appointment-feed">{appointments.map((item) => <div className="feed-row" key={item.appointment_id}>
            <div className="date-tile"><strong>{dateInputValue(item.appointment_date).slice(8, 10)}</strong><span>{new Date(`${dateInputValue(item.appointment_date)}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</span></div>
            <div className="feed-main"><strong>{item.patient_name}</strong><span>Dr. {item.doctor_name} · {item.specialization || "Clinic"}</span></div>
            <div className="feed-meta"><strong><Clock3 size={14} />{String(item.appointment_time).slice(0, 5)}</strong><StatusBadge status={item.status} /></div>
          </div>)}</div>
        )}
      </article>
      <article className="surface-panel quick-panel">
        <PageHeading title="Quick actions" description="Start a common clinic task" />
        <div className="quick-grid">
          {role !== "doctor" && <button onClick={() => onCreate("patients")}><Plus size={17} /><span>Register patient</span></button>}
          <button onClick={() => onCreate("appointments")}><CalendarDays size={17} /><span>Schedule visit</span></button>
          {role === "admin" && <button onClick={() => onCreate("doctors")}><Stethoscope size={17} /><span>Add doctor</span></button>}
          {(role === "admin" || role === "doctor") && <button onClick={() => onCreate("records")}><FileText size={17} /><span>New record</span></button>}
        </div>
      </article>
    </section>
  </>;
}

function EmptyState({ title, description }) {
  return <div className="empty-state"><span className="empty-mark"><ClipboardList size={21} /></span><strong>{title}</strong><p>{description}</p></div>;
}

function Toolbar({ query, onQueryChange, placeholder, filters, filter, setFilter, actions }) {
  return <div className="table-toolbar"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>{filters && <select aria-label="Filter list" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All {filters.label}</option>{filters.options.map((option) => <option key={option} value={option}>{option}</option>)}</select>}{actions && <div className="toolbar-actions">{actions}</div>}</div>;
}

function PatientsPage({ data, user, query, setSearchQuery, filter, setFilter, onCreate, onView, onEdit, onDelete }) {
  const searchValue = query;
  const patients = data.patients.filter((patient) => {
    const matchesSearch = [patient.patient_id, patient.name, patient.phone, patient.email].some((value) => String(value || "").toLowerCase().includes(searchValue));
    return matchesSearch && (filter === "all" || patient.gender === filter);
  });
  return <>
    <PageHeading title="Patients" description="Search and manage patient registrations." actions={user.role !== "doctor" && <button className="button-primary" onClick={() => onCreate("patients")}><Plus size={17} />Register patient</button>} />
    <section className="surface-panel list-panel">
      <Toolbar query={searchValue} onQueryChange={setSearchQuery} placeholder="Search name, ID, phone, or email" filters={{ label: "genders", options: [...new Set(data.patients.map((patient) => patient.gender).filter(Boolean))] }} filter={filter} setFilter={setFilter} />
      {patients.length === 0 ? <EmptyState title="No patients found" description={searchValue || filter !== "all" ? "Try another search or filter." : "Register the first patient to begin."} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Patient</th><th>Date of birth</th><th>Gender</th><th>Phone</th><th>Email</th><th>Actions</th></tr></thead><tbody>{patients.map((patient) => <tr key={patient.patient_id}><td><div className="cell-primary"><span className="table-avatar">{patient.name?.slice(0, 1).toUpperCase()}</span><span><strong>{patient.name}</strong><small>#{patient.patient_id}</small></span></div></td><td>{displayDate(patient.dob)}</td><td>{patient.gender || "-"}</td><td>{patient.phone || "-"}</td><td>{patient.email || "-"}</td><td><div className="row-actions"><button className="icon-button" title="View patient" aria-label={`View ${patient.name}`} onClick={() => onView("patients", patient)}><Eye size={16} /></button>{user.role !== "doctor" && <button className="icon-button" title="Edit patient" aria-label={`Edit ${patient.name}`} onClick={() => onEdit("patients", patient)}><Pencil size={16} /></button>}{user.role === "admin" && <button className="icon-button danger-icon" title="Delete patient" aria-label={`Delete ${patient.name}`} onClick={() => onDelete("patients", patient)}><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table></div>}
      <TableFooter count={patients.length} total={data.patients.length} item="patients" />
    </section>
  </>;
}

function DoctorsPage({ data, user, query, setSearchQuery, filter, setFilter, onCreate, onView, onEdit, onDelete }) {
  const searchValue = query;
  const doctors = data.doctors.filter((doctor) => [doctor.name, doctor.specialization, doctor.email, doctor.phone].some((value) => String(value || "").toLowerCase().includes(searchValue)) && (filter === "all" || doctor.specialization === filter));
  return <>
    <PageHeading title="Doctors" description="Clinic directory and specialties." actions={user.role === "admin" && <button className="button-primary" onClick={() => onCreate("doctors")}><Plus size={17} />Add doctor</button>} />
    <section className="surface-panel list-panel">
      <Toolbar query={searchValue} onQueryChange={setSearchQuery} placeholder="Search doctor or specialty" filters={{ label: "specialties", options: [...new Set(data.doctors.map((doctor) => doctor.specialization).filter(Boolean))] }} filter={filter} setFilter={setFilter} />
      {doctors.length === 0 ? <EmptyState title="No doctors found" description={searchValue || filter !== "all" ? "Try another search or filter." : "No doctor profiles have been added."} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Doctor</th><th>Specialization</th><th>Phone</th><th>Email</th><th>Availability</th><th>Actions</th></tr></thead><tbody>{doctors.map((doctor) => <tr key={doctor.doctor_id}><td><div className="cell-primary"><span className="table-avatar doctor-avatar"><Stethoscope size={17} /></span><span><strong>{doctor.name}</strong><small>#{doctor.doctor_id}</small></span></div></td><td>{doctor.specialization}</td><td>{doctor.phone || "-"}</td><td>{doctor.email || "-"}</td><td>{doctor.availability || "Not provided"}</td><td><div className="row-actions"><button className="icon-button" title="View doctor" aria-label={`View ${doctor.name}`} onClick={() => onView("doctors", doctor)}><Eye size={16} /></button>{user.role === "admin" && <><button className="icon-button" title="Edit doctor" aria-label={`Edit ${doctor.name}`} onClick={() => onEdit("doctors", doctor)}><Pencil size={16} /></button><button className="icon-button danger-icon" title="Delete doctor" aria-label={`Delete ${doctor.name}`} onClick={() => onDelete("doctors", doctor)}><Trash2 size={16} /></button></>}</div></td></tr>)}</tbody></table></div>}
      <TableFooter count={doctors.length} total={data.doctors.length} item="doctors" />
    </section>
  </>;
}

function AppointmentsPage({ data, user, query, setSearchQuery, filter, setFilter, onCreate, onView, onEdit, onDelete, onCancel }) {
  const searchValue = query;
  const appointments = data.appointments.filter((appointment) => [appointment.appointment_id, appointment.patient_name, appointment.doctor_name, appointment.specialization].some((value) => String(value || "").toLowerCase().includes(searchValue)) && (filter === "all" || appointment.status === filter));
  return <>
    <PageHeading title="Appointments" description="Schedule visits and manage clinic availability." actions={<button className="button-primary" onClick={() => onCreate("appointments")}><Plus size={17} />Schedule visit</button>} />
    <section className="surface-panel list-panel">
      <Toolbar query={searchValue} onQueryChange={setSearchQuery} placeholder="Search patient, doctor, or appointment ID" filters={{ label: "statuses", options: ["Scheduled", "Confirmed", "Completed", "Cancelled"] }} filter={filter} setFilter={setFilter} />
      {appointments.length === 0 ? <EmptyState title="No appointments found" description={searchValue || filter !== "all" ? "Try another search or status." : "Schedule a visit to add it to the calendar."} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>{appointments.map((appointment) => <tr key={appointment.appointment_id}><td><div className="cell-primary"><span className="table-avatar"><UserRound size={16} /></span><span><strong>{appointment.patient_name}</strong><small>#{appointment.appointment_id}</small></span></div></td><td><strong className="table-strong">{appointment.doctor_name}</strong><small className="table-secondary">{appointment.specialization}</small></td><td>{displayDate(appointment.appointment_date)}</td><td>{String(appointment.appointment_time).slice(0, 5)}</td><td><StatusBadge status={appointment.status} /></td><td><div className="row-actions"><button className="icon-button" title="View appointment" aria-label={`View appointment ${appointment.appointment_id}`} onClick={() => onView("appointments", appointment)}><Eye size={16} /></button>{appointment.status?.toLowerCase() !== "cancelled" && <><button className="icon-button" title="Edit appointment" aria-label={`Edit appointment ${appointment.appointment_id}`} onClick={() => onEdit("appointments", appointment)}><Pencil size={16} /></button><button className="text-button cancel-action" onClick={() => onCancel(appointment)}>Cancel</button></>}{user.role === "admin" && <button className="icon-button danger-icon" title="Delete appointment" aria-label={`Delete appointment ${appointment.appointment_id}`} onClick={() => onDelete("appointments", appointment)}><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table></div>}
      <TableFooter count={appointments.length} total={data.appointments.length} item="appointments" />
    </section>
  </>;
}

function RecordsPage({ data, user, query, setSearchQuery, filter, setFilter, onCreate, onView, onEdit, onDelete }) {
  const searchValue = query;
  const records = data.records.filter((record) => [record.record_id, record.patient_name, record.doctor_name, record.diagnosis, record.treatment].some((value) => String(value || "").toLowerCase().includes(searchValue)) && (filter === "all" || dateInputValue(record.visit_date).startsWith(filter)));
  const months = [...new Set(data.records.map((record) => dateInputValue(record.visit_date).slice(0, 7)).filter(Boolean))].sort().reverse();
  return <>
    <PageHeading title="Medical records" description="Clinical notes and patient history. Access is limited to clinic admins and doctors." actions={<button className="button-primary" onClick={() => onCreate("records")}><Plus size={17} />Create record</button>} />
    <section className="surface-panel list-panel">
      <Toolbar query={searchValue} onQueryChange={setSearchQuery} placeholder="Search patient, diagnosis, or treatment" filters={{ label: "months", options: months }} filter={filter} setFilter={setFilter} />
      {records.length === 0 ? <EmptyState title="No medical records found" description={searchValue || filter !== "all" ? "Try another search or date filter." : "Create a clinical record to begin the patient history."} /> : <div className="table-scroll"><table className="data-table"><thead><tr><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Treatment</th><th>Visit date</th><th>Actions</th></tr></thead><tbody>{records.map((record) => <tr key={record.record_id}><td><div className="cell-primary"><span className="table-avatar record-avatar"><FileText size={16} /></span><span><strong>{record.patient_name}</strong><small>Record #{record.record_id}</small></span></div></td><td>{record.doctor_name || "-"}</td><td className="long-cell">{record.diagnosis || "-"}</td><td className="long-cell">{record.treatment || "-"}</td><td>{displayDate(record.visit_date)}</td><td><div className="row-actions"><button className="icon-button" title="View record" aria-label={`View record ${record.record_id}`} onClick={() => onView("records", record)}><Eye size={16} /></button><button className="icon-button" title="Edit record" aria-label={`Edit record ${record.record_id}`} onClick={() => onEdit("records", record)}><Pencil size={16} /></button>{user.role === "admin" && <button className="icon-button danger-icon" title="Delete record" aria-label={`Delete record ${record.record_id}`} onClick={() => onDelete("records", record)}><Trash2 size={16} /></button>}</div></td></tr>)}</tbody></table></div>}
      <TableFooter count={records.length} total={data.records.length} item="records" />
    </section>
  </>;
}

function TableFooter({ count, total, item }) {
  return <footer className="table-footer">Showing {count} of {total} {item}</footer>;
}

function StatusBadge({ status }) {
  const normalized = status?.toLowerCase() || "scheduled";
  return <span className={`status-pill status-${normalized}`}>{status || "Scheduled"}</span>;
}

function AnalyticsPage({ data }) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });
  const monthLabel = (month) => new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, { month: "short" });
  const appointmentsByMonth = months.map((month) => data.appointments.filter((item) => dateInputValue(item.appointment_date).startsWith(month)).length);
  const patientsByMonth = months.map((month) => data.patients.filter((item) => dateInputValue(item.created_at).startsWith(month)).length);
  const statusNames = ["Scheduled", "Confirmed", "Completed", "Cancelled"];
  const statusCounts = statusNames.map((name) => data.appointments.filter((item) => item.status?.toLowerCase() === name.toLowerCase()).length);
  const doctorNames = data.doctors.slice(0, 7).map((doctor) => doctor.name);
  const doctorWorkload = data.doctors.slice(0, 7).map((doctor) => data.appointments.filter((item) => item.doctor_id === doctor.doctor_id).length);
  const completionRate = data.appointments.length ? Math.round((statusCounts[2] / data.appointments.length) * 100) : 0;
  const axisOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { grid: { display: false } } } };
  const barData = (labels, values, color) => ({ labels, datasets: [{ data: values, backgroundColor: color, borderRadius: 4, maxBarThickness: 38 }] });
  return <>
    <PageHeading title="Clinic analytics" description="Trends calculated from records currently stored in the clinic database." />
    <section className="metric-grid analytics-metrics"><StatCard label="Patients" value={data.patients.length} sublabel="Registered" icon={Users} tone="blue" /><StatCard label="Doctors" value={data.doctors.length} sublabel="On the directory" icon={Stethoscope} tone="teal" /><StatCard label="Appointments" value={data.appointments.length} sublabel="All statuses" icon={CalendarDays} tone="amber" /><StatCard label="Completion rate" value={`${completionRate}%`} sublabel={`${statusCounts[2]} completed visits`} icon={Check} tone="green" /></section>
    <section className="chart-grid">
      <article className="surface-panel chart-panel"><h3>Appointments over time</h3><p>Visits by month, last six months</p>{data.appointments.length ? <div className="chart-canvas"><Bar data={barData(months.map(monthLabel), appointmentsByMonth, "#277c79")} options={axisOptions} /></div> : <EmptyState title="Not enough data" description="Appointment trends appear once visits are recorded." />}</article>
      <article className="surface-panel chart-panel"><h3>Appointment status</h3><p>Distribution across all appointments</p>{data.appointments.length ? <div className="doughnut-wrap"><Doughnut data={{ labels: statusNames, datasets: [{ data: statusCounts, backgroundColor: ["#3478c5", "#277c79", "#5b9c73", "#c56d63"], borderWidth: 0 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, cutout: "66%" }} /></div> : <EmptyState title="No appointments" description="Status distribution will appear here." />}</article>
      <article className="surface-panel chart-panel"><h3>Patient registrations</h3><p>New patient profiles by month</p>{data.patients.some((patient) => patient.created_at) ? <div className="chart-canvas"><Bar data={barData(months.map(monthLabel), patientsByMonth, "#c7943b")} options={axisOptions} /></div> : <EmptyState title="Registration history unavailable" description="This chart needs patient created_at timestamps." />}</article>
      <article className="surface-panel chart-panel"><h3>Doctor workload</h3><p>Appointments by doctor</p>{data.appointments.length && data.doctors.length ? <div className="chart-canvas"><Bar data={barData(doctorNames, doctorWorkload, "#5477a5")} options={{ ...axisOptions, indexAxis: "y" }} /></div> : <EmptyState title="No workload data" description="Add doctors and appointments to compare workloads." />}</article>
    </section>
  </>;
}

function SettingsPage({ user, onLogout }) {
  return <>
    <PageHeading title="Settings" description="Account details and session controls." />
    <section className="surface-panel settings-panel"><span className="settings-avatar"><UserRound size={26} /></span><div><span className="eyebrow">SIGNED-IN ACCOUNT</span><h2>{user.username}</h2><p className="role-chip">{user.role}</p></div><div className="settings-divider" /><p>Password and notification preferences are managed by your clinic administrator.</p><button className="button-secondary logout-button" onClick={onLogout}><LogOut size={16} />Log out</button></section>
  </>;
}

export default ClinicWorkspace;
