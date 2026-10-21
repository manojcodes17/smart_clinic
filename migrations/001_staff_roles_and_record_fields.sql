ALTER TABLE users
  MODIFY COLUMN role ENUM('admin', 'doctor', 'patient', 'receptionist') NOT NULL,
  ADD COLUMN doctor_id INT NULL UNIQUE AFTER role;

ALTER TABLE medical_records
  ADD COLUMN diagnosis TEXT NULL AFTER visit_date,
  ADD COLUMN treatment TEXT NULL AFTER diagnosis;
