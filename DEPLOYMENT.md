# Deployment and Testing Guide

This document covers project requirements, installation, environment variables, containerized execution, cloud hosting, and a comprehensive manual testing guide.

---

## 1. Project Requirements

### Node.js Version
- **Requirement**: Node.js `v20.0.0` or higher (tested on LTS version).
- **Package Manager**: npm `v10.x` or yarn.

### MongoDB Version
- **Requirement**: MongoDB server version `v6.0` or higher.
- **Support**: Runs on local installations or managed MongoDB Atlas instances.

---

## 2. Installation & Quickstart

### Local Setup
1. **Clone the Repository** and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. **Install Backend Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment File**:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in `MONGO_URI` and `JWT_SECRET`.*
4. **Seed Demonstration Data (Optional)**:
   ```bash
   npm run seed:demo
   ```
5. **Run Backend in Development Mode**:
   ```bash
   npm run dev
   ```
6. **Navigate to the Frontend Directory**:
   ```bash
   cd ../frontend
   ```
7. **Install Frontend Dependencies & Run**:
   ```bash
   npm install
   npm run dev
   ```
   *Frontend is now served on `http://localhost:5173`.*

---

## 3. Environment Variables Reference

Configure these in `backend/.env`. Missing critical values (marked with **Yes**) causes the backend server to abort start-up.

| Name | Required | Description | Default / Example |
| :--- | :---: | :--- | :--- |
| `PORT` | No | Port for the Express server to listen on | `5000` |
| `NODE_ENV` | No | Deployment environment (`development`, `production`, `test`) | `development` |
| `MONGO_URI` | **Yes** | MongoDB Connection string (Atlas or Local) | `mongodb://localhost:27017/pos_db` |
| `JWT_SECRET` | **Yes** | Secret key used to sign JWT session cookies (Min 8 chars) | `change_me_to_something_secure` |
| `JWT_EXPIRE` | No | JWT token expiry duration | `24h` |
| `COOKIE_EXPIRE` | No | Cookie expiry duration (in hours) | `24` |
| `CLIENT_URL` | No | Frontend URL for CORS mapping (comma-separated if multiple) | `http://localhost:5173` |
| `SMTP_HOST` | No | Outgoing mail server for password reset emails | `smtp.mailtrap.io` |
| `SMTP_PORT` | No | Mail server port | `2525` |
| `SMTP_USER` | No | Mail service username | `user_name` |
| `SMTP_PASS` | No | Mail service password | `user_password` |
| `SMTP_FROM` | No | Sender address for outgoing emails | `noreply@apexify.com` |
| `SUPER_ADMIN_INVITE`| No | Invite code required to self-register as Super Admin | `SUPER2026` |
| `ADMIN_INVITE` | No | Invite code required to self-register as Admin | `ADMIN2026` |

---

## 4. Docker & Docker Compose Containerization

### Standard Compose Commands
To boot the full stack (database + backend server):
- **Build and Start Container Lifecycle**:
  ```bash
  docker compose up --build -d
  ```
- **Stop Containers**:
  ```bash
  docker compose down
  ```
- **Check Combined Logs**:
  ```bash
  docker compose logs -f
  ```

---

## 5. Cloud Platform Deployments

### Render Deployment (Backend API)
1. Register on [Render](https://render.com) and click **New > Web Service**.
2. Select your repository.
3. Configure settings:
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
4. Add the required environment variables:
   - `MONGO_URI`, `JWT_SECRET`, `NODE_ENV=production`.
5. Enable **Health Check Path**: `/api/health`.

### Vercel Deployment (React Frontend)
1. Register on [Vercel](https://vercel.com) and link your GitHub repository.
2. Select the `frontend` subdirectory as the root directory.
3. Configure settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set the environment variable:
   - `VITE_API_URL` = Your backend API deployment URL.

---

## 6. Testing & Verification Guide

### Health Endpoint Verification
Validate that the database connection and Node processes are functioning correctly:
- **Test Request**:
  ```bash
  curl -i http://localhost:5000/api/health
  ```
- **Verification Rule**: Must return `HTTP 200 OK` with JSON showing `"status": "UP"` and `"database": "CONNECTED"`.

### Authentication Verification
Ensure user registration invite flows function as expected:
1. **Attempt Registration with Admin Username**:
   - Send `POST /api/auth/register` with `username: "admin_test"` and `inviteCode: "ADMIN2026"`.
   - **Expect**: `201 Created` with message `"Registration successful. Awaiting administrator approval."`.
2. **Brute Force Lockout Test**:
   - Call `POST /api/auth/login` five times consecutively using incorrect passwords.
   - **Expect**: The fifth attempt must return `423 Locked` with message `"Your account has been temporarily locked due to multiple failed login attempts. Please try again in 15 minute(s)."`.

### Inventory Stock Level & Checkout Verification
Verify that inventory subtraction and low-stock indicators trigger correctly:
1. **Check Inventory**:
   - Get the current quantity of product ID `X` at branch `Y`. Let's say quantity is `10`.
2. **POS Checkout**:
   - Call `POST /api/billing/checkout` for `1` unit of product `X`.
   - **Expect**: `200 OK` and a returned order ID.
3. **Verify Decrement**:
   - Request the current quantity of product ID `X` at branch `Y`.
   - **Expect**: Quantity must equal `9`.
4. **Under-stock Test**:
   - Attempt a checkout for `50` units of product `X` (when available quantity is `9`).
   - **Expect**: `400 Bad Request` with message indicating insufficient stock.

### Reports & Aggregations Verification
Verify report generation and export output:
1. **Sales Report Fetch**:
   - Send `GET /api/reports/sales?startDate=2026-07-01&endDate=2026-07-31`.
   - **Expect**: JSON array listing total completed checkout figures.
2. **CSV Download Verification**:
   - Send `GET /api/reports/sales?export=csv`.
   - **Expect**: `HTTP 200` with headers `Content-Type: text/csv` and a raw CSV payload.

---

## 7. Manual Regression Checklist

Verify each of the following items before pushing code changes to production:

- [ ] **Startup Check**: Run `npm run dev` and ensure there are no unhandled promise warnings or startup crashes in the console logs.
- [ ] **Role Isolation**: Log in as a Cashier. Attempt to fetch `/api/audit` or edit product stock. Verify you receive `403 Forbidden`.
- [ ] **Empty Branch Scope**: Attempt to log in with an approved account that is not assigned to a branch ID. Verify you receive a `403 Forbidden` branch error.
- [ ] **Password Reset expiry**: Generate a password reset link. Wait 16 minutes. Attempt to submit a reset request. Verify you receive `400 Bad Request`.
- [ ] **Audit Immutable Hook**: Trigger an adjustment on stock levels. Attempt a direct database mutation to delete or modify the resulting Audit Log. Verify MongoDB blocks the edit.
- [ ] **CORS Origin Filtering**: Make a fetch call from an origin not whitelisted in `CLIENT_URL`. Verify the request is rejected with a CORS policy error.

---

## 8. Security & Production Checklist

- [ ] Disable all development bypass settings (e.g. set `NODE_ENV=production`).
- [ ] Update `JWT_SECRET` to a strong, high-entropy random sequence.
- [ ] Keep invite codes (`SUPER_ADMIN_INVITE` and `ADMIN_INVITE`) hidden from public configurations.
- [ ] Ensure MongoDB is bound to local interfaces or utilizes authentication passwords for cluster access.
- [ ] Verify that cookies are sent with `secure: true` (requires HTTPS).

---

## 9. Backup Recommendations

- **Automated Crons**: Run database dump tools once daily:
  ```bash
  mongodump --uri="mongodb://localhost:27017/pos_db" --out=/backups/$(date +%F)
  ```
- **Offsite Upload**: Compress and upload backups to secure cloud object storage (e.g. AWS S3, Google Cloud Storage) with bucket policies that lock files for 30 days (WORM compliance).
