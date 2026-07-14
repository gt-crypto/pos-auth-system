# POS & Inventory Authentication System

A production-ready Multi-Branch Point of Sale (POS) and Inventory management platform built using Node.js, Express, MongoDB, and React.

---

[![Node.js Version](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v18+-blue.svg)](https://react.dev/)
[![MongoDB Version](https://img.shields.io/badge/MongoDB-v6.0+-darkgreen.svg)](https://www.mongodb.com/)
[![Docker Compose](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)

---

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Document Directory Quick Links](#-document-directory-quick-links)
3. [Key Features Matrix](#-key-features-matrix)
4. [Technology Stack](#-technology-stack)
5. [Architecture Flow](#-architecture-flow)
6. [Screenshots](#-screenshots)
7. [Directory Structure](#-directory-structure)
8. [Getting Started Locally](#-getting-started-locally)
9. [Running with Docker Compose](#-running-with-docker-compose)
10. [Observability & Health Checks](#-observability--health-checks)
11. [License](#-license)

---

## 🔍 Overview
The **POS & Inventory Authentication System** provides businesses with a central database to manage retail branch locations, catalog products, track real-time stock levels, check out customers, and log administrative security audits. With a multi-layered Role-Based Access Control (RBAC) permission structure and strict multi-branch data isolation, it offers enterprise-grade security and transparency.

---

## 📂 Document Directory Quick Links

We have generated comprehensive, production-grade documentation for this system:

- 📋 **[Product Requirements Document (PRD.md)](file:///c:/Users/achu1/.gemini/antigravity/scratch/pos-auth-system/PRD.md)**: Product scope, target user definitions, functional/non-functional requirements, edge case documentation, and the **Requirement Traceability Matrix**.
- 🏗️ **[Architecture Design Document (ARCHITECTURE.md)](file:///c:/Users/achu1/.gemini/antigravity/scratch/pos-auth-system/ARCHITECTURE.md)**: System design patterns, database schemas, indexes, collections description, custom transaction flow charts, and future scaling strategies.
- 🔌 **[REST API Reference Guide (API_DOCUMENTATION.md)](file:///c:/Users/achu1/.gemini/antigravity/scratch/pos-auth-system/API_DOCUMENTATION.md)**: Granular documentation of all endpoints, request bodies, query strings, headers, and success/error payload examples.
- 🚀 **[Deployment and Testing Manual (DEPLOYMENT.md)](file:///c:/Users/achu1/.gemini/antigravity/scratch/pos-auth-system/DEPLOYMENT.md)**: Server configurations, Docker Compose guidelines, Render/Vercel guides, and manual testing checklists.

---

## 📊 Key Features Matrix

| Module | Super Admin | Admin | Cashier | Status |
| :--- | :---: | :---: | :---: | :---: |
| **Authentication & Lockout** | ✓ | ✓ | ✓ | **Implemented** |
| **User approvals** | ✓ | ✗ | ✗ | **Implemented** |
| **Branch Outlets CRUD** | ✓ | ✗ | ✗ | **Implemented** |
| **Category/Product Catalog** | ✓ | ✓ | Read-Only | **Implemented** |
| **Branch Inventory Stock** | ✓ | ✓ | ✗ | **Implemented** |
| **Inter-Branch Transfers** | ✓ | ✓ | ✗ | **Implemented** |
| **POS Billing & Checkout** | ✓ | ✓ | ✓ | **Implemented** |
| **Split & Hold Bills** | ✓ | ✓ | ✓ | **Implemented** |
| **Kitchen Ingredients** | ✓ | ✓ | Override* | **Implemented** |
| **Analytical Reports** | ✓ | ✓ | ✗ | **Implemented** |
| **Immutable Audit Logs** | ✓ | ✗ | ✗ | **Implemented** |

*\*Access for Cashier role requires setting `hasIngredientsAccess === true`.*

---

## 🛠️ Technology Stack

### Backend Server
- **Core Engine**: Node.js & Express.
- **Data Modeling**: Mongoose & MongoDB.
- **Security Middlewares**: `helmet` (hardened HTTP headers), `express-mongo-sanitize` (SQL/NoSQL injection protection), `hpp` (parameter pollution protection).
- **Throttling**: `express-rate-limit`.
- **Validations**: `zod`.
- **Log Management**: Winston structured console & file archives.

### Frontend Client
- **Framework**: React (Vite-bundler).
- **State Engines**: React Context API.
- **Animations**: Framer Motion.
- **Icons Library**: Lucide React.
- **Client Networking**: Axios (custom instance with HttpOnly session cookies management).

---

## 📐 Architecture Flow
```
[Client App] 
     │ (HTTPS Requests + Session Cookie)
     ▼
[Express Server] ──> [Security/Auth Middlewares] ──> [Zod Validation]
     │                                                     │
     ▼                                                     ▼
[Controllers/Services] ──────────────────────────> [MongoDB Database]
```

For detailed class diagrams, database relationships, and request timelines, check **[ARCHITECTURE.md](file:///c:/Users/achu1/.gemini/antigravity/scratch/pos-auth-system/ARCHITECTURE.md)**.

---

## 📸 Screenshots
*(Place actual system screenshots here during production deployments)*

### 1. POS Checkout Screen
![POS Checkout Placeholder](https://via.placeholder.com/800x450.png?text=POS+Billing+Checkout+Dashboard+Mockup)

### 2. Multi-Branch Analytics Reports
![Reports Dashboard Placeholder](https://via.placeholder.com/800x450.png?text=Analytical+Reports+with+CSV+Export)

---

## 🌲 Directory Structure

```
├── backend/
│   ├── config/             # DB & Winston configs
│   ├── constants/          # Static role IDs & blacklists
│   ├── controllers/        # Express handlers
│   ├── middleware/         # Auth, RBAC & security filters
│   ├── models/             # Mongoose database models
│   ├── routes/             # API routing mappings
│   ├── services/           # Business logic layer
│   └── validators/         # Input parsing schemas (Zod)
└── frontend/
    └── src/
        ├── components/     # Routing guards & reusable inputs
        ├── context/        # React global state containers
        ├── pages/          # Multi-tab view layouts
        └── services/       # Network client API
```

---

## ⚡ Getting Started Locally

### 1. Database & Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the `.env` file using the example template:
   ```bash
   cp .env.example .env
   ```
   *(Ensure you update `MONGO_URI` and `JWT_SECRET` in `.env`)*
4. Seed the demo data:
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

### 2. Frontend Client Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *(Open `http://localhost:5173` in your browser)*

---

## 🐳 Running with Docker Compose

To run the application inside isolated Docker containers (MongoDB + Backend API):

1. From the root directory:
   ```bash
   docker compose up --build -d
   ```
2. Check logs:
   ```bash
   docker compose logs -f
   ```
3. Stop containers:
   ```bash
   docker compose down
   ```

---

## 📊 Observability & Health Checks

### Health Check Endpoint
To inspect server uptime and database connectivity:
- **Endpoint**: `GET /api/health`
- **Response Format**:
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
    "timestamp": "2026-07-14T05:40:00.000Z",
    "environment": "production"
  }
  ```

### Logging
All backend logs are formatted in JSON and written:
- Output to console (`stdout`/`stderr`).
- Written to local files at `backend/logs/combined.log` and `backend/logs/error.log` (excluded from git tracking).

---

## 📄 License
This project is licensed under the MIT License - see local terms for details.
