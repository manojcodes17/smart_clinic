# Smart Clinic

A clinic management dashboard backed by a Node.js/Express API and MySQL. The React dashboard provides staff sign-in, clinic metrics, patient registration, and views for doctors, appointments, and medical records. The API also exposes CRUD endpoints for these resources.

## Stack

- Frontend: React 19, Vite 8
- Backend: Node.js, Express 5
- Database: MySQL via `mysql2`
- Authentication: bcrypt password hashes and two-hour JWTs

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MySQL 8.0+

## Local setup

1. Create the database and tables from the repository root:

   ```sh
   mysql -u root -p < schema.sql
   ```

2. Copy `.env.example` to `.env`, then set the MySQL credentials and a long, random `JWT_SECRET`. `.env` is ignored by Git.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Install backend and frontend dependencies:

   ```sh
   npm install
   npm --prefix frontend install
   ```

4. Create the first administrator. Generate a bcrypt hash for a strong password:

   ```sh
   node -e "require('bcryptjs').hash('REPLACE_WITH_A_STRONG_PASSWORD', 10).then(console.log)"
   ```

   Insert the generated hash into the database (replace the username and hash):

   ```sql
   INSERT INTO users (username, password_hash, role)
   VALUES ('clinic-admin', 'PASTE_BCRYPT_HASH_HERE', 'admin');
   ```

   Public registration is admin-only, so users cannot grant themselves a privileged role. An administrator can create staff accounts with `POST /api/auth/register` after signing in.

5. Start the API and frontend in separate terminals:

   ```sh
   npm run dev
   npm --prefix frontend run dev
   ```

   Open <http://localhost:5173>. Vite proxies `/api` to `http://localhost:5000` by default. Set `VITE_API_BASE_URL` in the frontend environment only when using a different API origin.

## Configuration

See `.env.example` for all backend values:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `5000` | Express API port |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed browser origin for CORS |
| `DB_HOST` | none | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | none | MySQL user |
| `DB_PASSWORD` | none | MySQL password |
| `DB_NAME` | none | MySQL database name (`smart_clinic` in `schema.sql`) |
| `JWT_SECRET` | none | Secret used to sign and verify tokens |

The API exits during startup if required database or JWT configuration is missing or MySQL cannot be reached. `/api/test-db` can be used to check connectivity after startup.

## Application workflow

1. Staff sign in with an account created by an administrator. The frontend stores the JWT and user details in browser `localStorage`.
2. Dashboard requests load live patients, doctors, appointments, and, for admins and doctors, medical records.
3. The Patients, Doctors, Appointments, and Medical Records pages provide searchable lists, filters, detail views, and role-appropriate create, edit, cancel, or delete actions.
4. Dashboard counts and analytics are derived from the loaded database records. Missing data is shown as an empty state, not fabricated chart values.
5. Logging out removes the token and returns to sign-in. Expired or rejected sessions are cleared when a protected request fails.

The dashboard admits `admin`, `doctor`, and `receptionist` accounts. Doctor accounts must be linked to a doctor profile through `users.doctor_id`; doctors only see and manage their assigned appointments and records. Patient accounts can authenticate through the API, but patient self-service screens are not implemented.

## API overview

All routes are prefixed with `/api`. JSON request bodies are expected where applicable. Protected requests require `Authorization: Bearer <token>`.

| Route | Methods | Access |
| --- | --- | --- |
| `/auth/login` | `POST` | Public |
| `/auth/register` | `POST` | Admin |
| `/patients` | `GET` | Admin, receptionist; doctors only for patients they treat |
| `/patients` | `POST` | Admin, receptionist |
| `/patients/:id` | `GET` | Admin, receptionist; doctors only for patients they treat |
| `/patients/:id` | `PUT` | Admin, receptionist |
| `/patients/:id` | `DELETE` | Admin |
| `/doctors` | `GET` | Admin, doctor, patient, receptionist |
| `/doctors` | `POST` | Admin |
| `/doctors/:id` | `GET` | Admin, doctor, patient, receptionist |
| `/doctors/:id` | `PUT`, `DELETE` | Admin |
| `/appointments` and `/appointments/:id` | `GET`, `POST`, `PUT` | Admin, receptionist; doctors only for their linked profile |
| `/appointments/:id` | `DELETE` | Admin |
| `/medical-records` and `/medical-records/:id` | `GET`, `POST`, `PUT`, `DELETE` | Admin; doctors only for their linked profile |
| `/admin-test` | `GET` | Admin |
| `/test-db` | `GET` | Public connectivity check |

The admin bootstrap record should be inserted directly into MySQL; do not expose a production admin password or JWT secret in source control.

## Project layout

```text
server.js                  Express app and startup checks
db.js                      MySQL connection pool
middleware/auth.js         JWT and role middleware
routes/                    Authentication and clinic API routes
schema.sql                 Fresh-install database schema
frontend/src/App.jsx        Staff dashboard and sign-in screen
frontend/src/ClinicWorkspace.jsx Role-aware pages, dialogs, and analytics
frontend/src/services/api.js Shared frontend API client
migrations/                 Existing-database SQL upgrades
```

## Checks and scripts

From the repository root:

- `npm run dev` starts the backend with Node watch mode.
- `npm start` starts the backend normally.
- `npm run lint` runs the frontend ESLint rules.
- `npm run build` creates the frontend production bundle in `frontend/dist`.
- `npm test` runs Node's test discovery. There are currently no automated test files.

To lint or build the frontend directly, run `npm --prefix frontend run lint` or `npm --prefix frontend run build`.

## Existing databases

`schema.sql` creates missing tables but does not alter existing tables. Back up an older database, then apply the one-time upgrade for receptionist accounts, doctor-profile links, and medical-record fields:

```sh
mysql -u root -p smart_clinic < migrations/001_staff_roles_and_record_fields.sql
```

Do not run that migration more than once. The migration adds `users.doctor_id` and medical-record `diagnosis` and `treatment` columns. Create doctor accounts through the admin-only `/api/auth/register` endpoint with `doctor_id`. For existing doctor accounts, link each username to its doctor profile once:

```sql
UPDATE users SET doctor_id = 7 WHERE username = 'doctor-username' AND role = 'doctor';
```

Replace the sample ID and username with the matching records in your database. Doctor access is scoped by this link.
