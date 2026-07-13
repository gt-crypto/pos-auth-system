# POS & Inventory Authentication System

A production-ready Node.js + Express + MongoDB backend and frontend interface.

## Prerequisites
- Node.js (v20+)
- MongoDB (Running locally or via cloud)
- Docker & Docker Compose (Optional, for containerized execution)

---

## Required Environment Variables
Configure these in a `.env` file under the `/backend` folder. See `backend/.env.example` for details:

| Name | Required | Description | Default |
| --- | --- | --- | --- |
| `PORT` | Yes | Port for the Express server to listen on | `5000` |
| `MONGO_URI` | Yes | MongoDB Connection string (Atlas or Local) | - |
| `JWT_SECRET` | Yes | Secret key used to sign JWT authentication tokens | - |
| `JWT_EXPIRE` | No | JWT token expiry duration | `24h` |
| `COOKIE_EXPIRE` | No | Cookie expiry duration (in hours) | `24` |
| `CLIENT_URL` | No | Frontend URL for CORS mapping (comma-separated if multiple)| `http://localhost:5173` |
| `NODE_ENV` | No | Deployment environment (`development`, `production`, `test`) | `development` |

---

## Getting Started Locally

### 1. Database & Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies (we reuse the existing production packages without duplicates):
   ```bash
   npm install
   ```
3. Configure the `.env` file using the example template:
   ```bash
   cp .env.example .env
   ```
   *(Ensure you update `MONGO_URI` and `JWT_SECRET` in `.env`)*

4. Seed the demo data (optional):
   ```bash
   npm run seed:demo
   ```

5. Run in development mode:
   ```bash
   npm run dev
   ```

6. Run in production mode:
   ```bash
   npm start
   ```

---

## Running with Docker

To simplify setup, you can launch the database and backend using Docker Compose.

### Build and Launch Containers
From the root directory, you can build and run using:
```bash
docker compose up --build -d
```
Alternatively, from the `backend/` directory, you can use the npm scripts defined in `package.json`:
- Build image: `npm run docker:build`
- Start containers: `npm run docker:up`
- Stop containers: `npm run docker:down`

---

## Observability & Health Check

### Health Check Endpoint
The service features a production-ready health check endpoint mapping database connection status, memory allocation, environment settings, uptime, and system versioning:

- **Endpoint**: `GET http://localhost:5000/api/health`
- **Rate Limiting**: Excluded from global API rate limit constraints.
- **Example Response**:
  ```json
  {
    "status": "UP",
    "uptime": 344,
    "database": "CONNECTED",
    "version": "1.0.0",
    "memory": {
      "rss": 49233920,
      "heapTotal": 14757888,
      "heapUsed": 10564880,
      "external": 1289112
    },
    "timestamp": "2026-07-13T16:00:00.000Z",
    "environment": "production"
  }
  ```

### Structured Logging
All application logs (startup status, incoming requests, graceful shutdowns, and database states) are written in structured format using Winston:
- Logs are written to stdout/stderr in a format optimized for container platforms.
- Locally, logs are also archived inside `backend/logs/combined.log` and `backend/logs/error.log`.
