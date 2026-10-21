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

1. A staff member signs in with the account created by an administrator. The frontend stores the JWT and user details in browser `localStorage`.
2. The dashboard requests patients, doctors, appointments, and medical records with the bearer token.
3. Staff can register a patient from the Patients page. Dashboard and Analytics show aggregate counts; the other pages display their respective lists.
4. Use the API to create or update doctors, appointments, and medical records. Those operations are not currently exposed as forms in the dashboard.
5. Logging out removes the token and returns to the sign-in screen.

The dashboard admits `admin` and `doctor` accounts. Patient accounts can authenticate through the API, but patient self-service screens are not implemented.

## API overview

All routes are prefixed with `/api`. JSON request bodies are expected where applicable. Protected requests require `Authorization: Bearer <token>`.

| Route | Methods | Access |
| --- | --- | --- |
| `/auth/login` | `POST` | Public |
| `/auth/register` | `POST` | Admin |
| `/patients` | `GET`, `POST` | Admin, doctor |
| `/patients/:id` | `GET`, `PUT` | Admin, doctor |
| `/patients/:id` | `DELETE` | Admin |
| `/doctors` | `GET` | Admin, doctor, patient |
| `/doctors` | `POST` | Admin |
| `/doctors/:id` | `GET` | Admin, doctor, patient |
| `/doctors/:id` | `PUT`, `DELETE` | Admin |
| `/appointments` and `/appointments/:id` | `GET`, `POST`, `PUT`, `DELETE` | Admin, doctor |
| `/medical-records` and `/medical-records/:id` | `GET`, `POST`, `PUT`, `DELETE` | Admin, doctor |
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
frontend/src/services/api.js Shared frontend API client
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

`schema.sql` creates missing tables but does not alter existing tables. Back up an existing database, then verify its columns and constraints match `schema.sql`; the medical-record API expects `diagnosis` and `treatment` columns in addition to `patient_id`, `doctor_id`, `visit_date`, and `notes`.
