# Product Requirements Document (PRD)

## 1. Project Overview
The **POS & Inventory Authentication System** is an enterprise-grade, multi-branch retail Point of Sale (POS) and inventory management platform. It offers a secure, audited, and role-restricted ecosystem where business managers and cashiers can run sales transactions, manage branch catalogs, track stock levels, transfer items between branches, monitor raw kitchen ingredients, and view detailed analytical reports.

The application features a secure React-based frontend client, powered by a robust Express backend API using MongoDB for data persistence.

---

## 2. Business Problem
Retail and hospitality businesses operating across multiple geographic locations often suffer from:
- **Inventory Leakage**: Inability to track real-time stock levels, leading to unexplained inventory loss.
- **Auditing Gaps**: Lack of tamper-proof logging regarding who created bills, modified stock levels, or changed user permissions.
- **Inefficient Restocking**: Missing visibility of low-stock thresholds, causing stockouts of high-demand items.
- **Unauthorized Actions**: Cashiers accessing administrative configurations or editing ingredient supplies without permission overrides.
- **Communication Latency**: Delay in stock replenishment due to complex stock transfer workflows between different branches.

---

## 3. Objectives
- **Secure Authentication & RBAC**: Prevent unauthorized access using JWT token-based authentication and a strict permission model.
- **Multi-Branch Data Isolation**: Isolate records so branch employees can only view and manage resources specific to their location, while allowing global visibility for Super Admins.
- **Zero-Trust Stock Management**: Log every single stock change (Restocks, Adjustments, Transfers, Sales) to historical ledger collections.
- **Robust POS Billing**: Support features such as hold orders, split bills, refunds, and void transactions with automatic inventory reduction.
- **Tamper-Proof Auditing**: Maintain immutable audit logs for all security-critical operations.

---

## 4. Target Users

### Super Admin
- **Role Purpose**: Global system owner and platform regulator.
- **Access Scope**: 
  - Full read/write access across all branches.
  - Ability to register, approve, reject, de-register, and manage users.
  - Ability to create and edit branches and assign managers.
  - Exclusive access to read the system-wide **Audit Logs**.

### Admin
- **Role Purpose**: Branch Manager or regional supervisor.
- **Access Scope**:
  - Bound to a specific branch (must select/be assigned to a branch).
  - Manage categories, products, suppliers, customers, and inventory for their branch.
  - Approve or register cashiers for their branch.
  - Initiate and accept stock transfers to/from other branches.
  - Full access to branch reports and history.

### Cashier
- **Role Purpose**: Frontline checkout operator.
- **Access Scope**:
  - Restricted to their assigned branch.
  - Create orders, process POS checkouts, hold orders, resume orders, and manage split bills.
  - Read-only access to categories, products, and branches.
  - Access to raw kitchen ingredients *only* if explicitly granted via the `hasIngredientsAccess` override flag.
  - Lacks access to users, inventory settings, suppliers, audit logs, and analytics reports.

---

## 5. Functional Requirements

### Authentication
- Register with a unique username, email, full name, phone number, password, and selection of role and branch.
- Login via credentials, returning a JWT stored in a secure, HttpOnly, SameSite cookie.
- Automatic account lockout after 5 consecutive failed login attempts (locked for 15 minutes).
- Session check (`/api/auth/me`) on frontend load to determine authentication status and fetch user metadata.
- Sign out, which clears the HttpOnly cookie.

### Password Reset
- Request password reset by entering an email address.
- Sends a verification email containing a secure, short-lived token (valid for 1 hour).
- Reset password endpoint validates the token and updates the password, immediately invalidating previous active sessions (using `passwordChangedAt` validation in auth middleware).

### User Approval & RBAC
- Newly registered accounts are set to `PENDING` status.
- Admins/Super Admins must approve pending users (`status` changes from `PENDING` to `ACTIVE`) before they can log in.
- Ability to reject registrations, deactivate active accounts, or change user roles.
- Role-based permissions checking for all routes (cashier vs. admin vs. super admin).

### Branch Management
- Create new branch locations with details: name, unique branch code, contact details (phone, email), manager, and full address.
- Toggle status between `ACTIVE` and `INACTIVE`.
- Update branch details.

### Category & Product Management
- Create categories with display orders and active statuses (unique name per branch).
- Create products linked to categories with SKU, barcode (optional), base price, tax percentage, and non-negative quantity.
- Support product variants (e.g. size variants like Small, Medium, Large) each with its own price.
- Support combos containing multiple products.
- Status toggle (`ACTIVE` vs. `INACTIVE`).

### Supplier & Customer Management
- Maintain supplier details (company name, contact person, phone, email, address, GST number) for purchasing raw inventory.
- Track customer profiles (name, phone number, email, purchase history) for POS checkouts.

### Inventory Control
- Track product inventory levels at each branch.
- Restock inventory with details: added quantity, supplier, invoice number, and notes.
- Adjust inventory (to correct damages, expirations, waste, or manual counting differences) with mandatory audit notes.
- Low-stock alerts showing items where the current quantity falls below the defined threshold.

### Ingredient Management
- Track raw ingredients (e.g. Dairy, Meat, Spices) in specific categories and units.
- Track current quantity, cost per unit, and reorder thresholds.
- Support ingredient restocks, adjustments, and transfers between branch kitchens.
- Guard access for cashier accounts using `hasIngredientsAccess`.

### Billing & POS Order Processing
- **Checkout Cart**: Process payments using CASH, CARD, or UPI. Validates stock levels, creates an Order record, and decrements product inventory.
- **Hold Order**: Save temporary shopping carts to clear the register, which can be resumed or cancelled later.
- **Split Bill**: Split an order amount into multiple payments using different payment methods (CASH/CARD/UPI).
- **Void & Refund**: Mark an order as void or processed for a refund, which reverses the stock levels to original inventories.

### Reports & Dashboard
- Dashboard summary cards (sales total, order counts, active terminal status, low stock count).
- Report modules: Sales reports, payment method summaries, top products, cashier performance, branch comparison, and inventory audits.
- Filters: Date ranges (start/end date) and branch selectors.
- Data export in CSV format.

### Audit Logs
- Automatically log all crucial events (User status changes, role changes, login failures, database mutations) with actors, action descriptions, timestamps, IP addresses, and user agents.
- Audit logs are completely immutable (enforced at the Mongoose level).

---

## 6. Non-Functional Requirements

### Security
- **Data Protection**: Direct HttpOnly cookies for session state preventing cross-site scripting (XSS) token extraction.
- **Password Hashing**: Uses `bcrypt` with a salt work factor of 12.
- **Mongo Injection Prevention**: Cleanses raw parameters via `express-mongo-sanitize`.
- **HTTP Header Security**: Utilizes `helmet` middleware to set context headers.
- **Parameter Pollution Protection**: Uses `hpp` middleware.

### Rate Limiting
- **Global Limiter**: Maximum 200 requests per 15 minutes per IP.
- **Auth Limiter**: Maximum 5 login/registration requests per 15 minutes per IP.
- **Forgot Password Limiter**: Maximum 3 request emails per 15 minutes per IP.
- *Health check endpoint (`/api/health`) is excluded from rate limits to prevent monitoring alerts.*

### Performance & Availability
- **Query Optimizations**: Indexes on key query fields (`branchId`, `sku`, `status`, `orderDate`, `timestamp`).
- **Response Compression**: Gzip compression via the `compression` middleware.
- **Caching Block**: Express response headers enforce `no-store, no-cache` to secure real-time POS data.

### Graceful Shutdown
- Listeners for `SIGINT` and `SIGTERM` close the HTTP server and release MongoDB connections before exit, preventing corrupted requests.

### Environment Validation
- Checks environment variables (`MONGO_URI`, `JWT_SECRET`, etc.) at startup, stopping the process if critical configurations are missing.

---

## 7. Edge Cases Supported

- **Duplicate Products / SKUs**: Enforced uniqueness constraints (`branchId` + `sku` and `branchId` + `categoryId` + `name`) in MongoDB prevent creation of duplicate identifiers in a single branch.
- **Insufficient Inventory**: Checkouts fail with a `400 Bad Request` if any item quantity requested exceeds available inventory.
- **Invalid ObjectId**: Clean validation using Zod regex catches malformed Mongo IDs before database queries, returning a `422 Unprocessable Entity` rather than throwing a `500 Server Error`.
- **Deleted Users**: Checked in `authMiddleware`. If an account is soft-deleted or marked as inactive, their session is immediately rejected.
- **Inactive Branches**: Users assigned to inactive branches are blocked from accessing APIs via `branchScope`.
- **Transfer Failures**: Stock transfers between branches rollback/abort if the source branch has insufficient stock.
- **Expired JWT / Password Reset Tokens**: Custom error middleware formats JWT expiration into clear messages, forcing redirection.
- **Database Unavailable**: Health endpoint immediately returns `DOWN` state, and endpoints gracefully return `503 Service Unavailable` through error middleware.

---

## 8. Multi-Branch Workflow
The system runs on a **shared-database, isolated-resource** architecture:

```
[Super Admin] ──> Sees all branches, manages cross-branch setups
[Admin / Cashier Branch A] ──> Filtered queries on branchId === A
[Admin / Cashier Branch B] ──> Filtered queries on branchId === B
```

- **Branch Isolation**: The `branchScope` middleware reads the authenticated user's `branchId` and appends it to `req.scope`. Every query for products, categories, customers, and orders must filter by this scope.
- **Transfer Workflow**: Allows shifting stock from one branch to another. An Admin creates a transfer request:
  1. Decrements quantity in the source branch's inventory.
  2. Increments/creates quantity in the destination branch's inventory.
  3. Records a `StockTransfer` document showing `fromBranch`, `toBranch`, and `quantity` with status `APPROVED`.
- **Super Admin Visibility**: Super Admins bypass branch filters, enabling platform-wide visibility and reporting.

---

## 9. Role-Based Permissions (RBAC)

Below is the permission matrix implemented across the roles:

| Module / Operation | Permission ID | Super Admin | Admin | Cashier |
| :--- | :--- | :---: | :---: | :---: |
| **Branch Management** | `CREATE_BRANCH`, `UPDATE_BRANCH`, `UPDATE_BRANCH_STATUS` | ✓ | ✗ | ✗ |
| **Branch View** | `READ_BRANCH` | ✓ | ✓ | ✓ |
| **User Approvals** | `APPROVE_USER`, `REJECT_USER` | ✓ | ✗ | ✗ |
| **User Management** | `CREATE_USER`, `READ_USER`, `UPDATE_USER`, `UPDATE_USER_STATUS` | ✓ | ✓ | ✗ |
| **Category Management** | `CREATE_CATEGORY`, `READ_CATEGORY`, `UPDATE_CATEGORY`, `ARCHIVE_CATEGORY` | ✓ | ✓ | Read Only |
| **Product Management** | `CREATE_PRODUCT`, `READ_PRODUCT`, `UPDATE_PRODUCT`, `ARCHIVE_PRODUCT` | ✓ | ✓ | Read Only |
| **Supplier CRUD** | `CREATE_SUPPLIER`, `READ_SUPPLIER`, `UPDATE_SUPPLIER`, `ARCHIVE_SUPPLIER` | ✓ | ✓ | ✗ |
| **Customer CRUD** | `CREATE_CUSTOMER`, `READ_CUSTOMER`, `UPDATE_CUSTOMER`, `ARCHIVE_CUSTOMER` | ✓ | ✓ | ✓ |
| **Inventory Restock/Adjust**| `RESTOCK_INVENTORY`, `ADJUST_INVENTORY`, `READ_INVENTORY` | ✓ | ✓ | ✗ |
| **Stock Transfer** | `TRANSFER_INVENTORY` | ✓ | ✓ | ✗ |
| **Ingredients Control** | `CREATE_INGREDIENT`, `READ_INGREDIENT`, `UPDATE_INGREDIENT` | ✓ | ✓ | Conditional* |
| **POS Billing Checkout** | `CREATE_BILL` | ✓ | ✓ | ✓ |
| **Void & Refund Bills** | `VOID_BILL`, `REFUND_BILL` | ✓ | ✓ | ✗ |
| **Reports Access** | `READ_REPORTS`, `EXPORT_REPORTS` | ✓ | ✓ | ✗ |
| **Audit Logs View** | `READ_AUDIT` | ✓ | ✗ | ✗ |

*\*Conditional Cashier access requires `hasIngredientsAccess === true`.*

---

## 10. Reporting
Analytical reports aggregate live data from the database using Mongo aggregation pipelines:
- **Sales Reports**: Hourly/daily summaries of completed checkouts, subtotal metrics, discounts, and taxes.
- **Payment Methods**: Distribution of payment methods (CASH vs. CARD vs. UPI).
- **Top Products**: List of best-selling products by quantity and revenue.
- **Branch Reports**: Performance comparisons across retail locations (available to Super Admin).
- **Cashier Performance**: Tracks order volume and total sales processed by individual Cashier IDs.
- **Low Stock & Audits**: Summary of items below threshold and historical inventory adjustments.
- **CSV Export**: All analytics pages support downloading the raw tabular results in standard CSV formatting.

---

## 11. Assumptions
- **Persistent Network Connection**: Frontends are expected to maintain an active internet connection to communicate with the central Express backend server.
- **Single Currency**: Monetary values are calculated as numbers representing a single default currency (e.g. USD, INR).
- **Trustworthy Admins**: Admin users have rights to manage inventory, categories, and products for their own branch without multi-level sign-offs.

---

## 12. Constraints
- **Database Dependency**: The system depends entirely on MongoDB. Offline syncing or locally buffered queues are not supported.
- **JWT Lifespan**: Session tokens are stateless and expire at a configured time (default: 24h), requiring users to re-login once expired.

---

## 13. Future Enhancements
- **Scheduled Email Reports**: Cron jobs running on the backend to automatically email weekly PDF/CSV reports to Super Admins.
- **Multi-Factor Authentication (MFA)**: Adding Authenticator App (TOTP) or SMS verification to strengthen login protection.
- **Dynamic Role Designer**: A UI to create custom roles and assign granular permissions on the fly, rather than using a static permission matrix.
- **Distributed Cache Layer**: Integrating Redis for caching static product lists and dashboard metrics to reduce database load.

---

## 14. Requirement Traceability Matrix

| Requirement Name | Backend Module / Controller | Frontend Module / Component | API Endpoint(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Authentication** | `controllers/authController.js` | `pages/LoginRegister.jsx` | `POST /api/auth/register`<br>`POST /api/auth/login`<br>`POST /api/auth/logout`<br>`GET /api/auth/me` | Implemented |
| **Password Reset** | `controllers/authController.js` | `pages/ResetPassword.jsx` | `POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password/:token` | Implemented |
| **User Approvals** | `controllers/userController.js` | `pages/Users/index.jsx` | `POST /api/users/:id/approve`<br>`POST /api/users/:id/reject`<br>`GET /api/users/pending` | Implemented |
| **Branch Control** | `controllers/branchController.js` | `pages/Branches/index.jsx` | `POST /api/branches`<br>`PATCH /api/branches/:id`<br>`PATCH /api/branches/:id/status`<br>`GET /api/branches` | Implemented |
| **User Management** | `controllers/userController.js` | `pages/Users/index.jsx` | `POST /api/users`<br>`PATCH /api/users/:id`<br>`PATCH /api/users/:id/status`<br>`PATCH /api/users/:id/deactivate`<br>`GET /api/users` | Implemented |
| **Categories** | `controllers/categoryController.js` | `pages/Categories/index.jsx` | `POST /api/categories`<br>`GET /api/categories`<br>`PATCH /api/categories/:id`<br>`PATCH /api/categories/:id/status` | Implemented |
| **Products** | `controllers/productController.js` | `pages/Products/index.jsx` | `POST /api/products`<br>`GET /api/products`<br>`PATCH /api/products/:id`<br>`PATCH /api/products/:id/status` | Implemented |
| **Suppliers** | `controllers/supplierController.js` | `pages/Suppliers/index.jsx` | `POST /api/suppliers`<br>`GET /api/suppliers`<br>`PUT /api/suppliers/:id`<br>`DELETE /api/suppliers/:id`<br>`POST /api/suppliers/:id/restore` | Implemented |
| **Customers** | `controllers/customerController.js` | `pages/Customers/index.jsx` | `POST /api/customers`<br>`GET /api/customers`<br>`PUT /api/customers/:id`<br>`DELETE /api/customers/:id`<br>`PATCH /api/customers/:id/restore` | Implemented |
| **Inventory Control**| `controllers/inventoryController.js` | `pages/Inventory/index.jsx` | `POST /api/inventory/restock`<br>`POST /api/inventory/adjust`<br>`GET /api/inventory` | Implemented |
| **Stock Transfer** | `controllers/inventoryController.js` | `pages/Inventory/index.jsx` | `POST /api/inventory/transfer` | Implemented |
| **Ingredients** | `controllers/ingredientController.js` | `pages/Ingredients/index.jsx` | `POST /api/ingredients`<br>`POST /api/ingredients/restock`<br>`POST /api/ingredients/adjust`<br>`POST /api/ingredients/transfer` | Implemented |
| **POS Billing** | `controllers/billingController.js` | `pages/Billing/index.jsx` | `POST /api/billing/checkout`<br>`POST /api/billing/hold`<br>`POST /api/billing/split`<br>`POST /api/billing/resume/:id`<br>`POST /api/billing/cancel-hold/:id` | Implemented |
| **Void & Refund** | `controllers/billingController.js` | `pages/Billing/index.jsx` | `POST /api/billing/void/:id`<br>`POST /api/billing/refund/:id` | Implemented |
| **Reports** | `controllers/reportController.js` | `pages/Reports/index.jsx` | `GET /api/reports/sales`<br>`GET /api/reports/payment-method`<br>`GET /api/reports/top-products`<br>`GET /api/reports/inventory` | Implemented |
| **Audit Logs** | `controllers/auditController.js` | `pages/AuditLogs/index.jsx` | `GET /api/audit`<br>`GET /api/audit/:id` | Implemented |
| **Dashboard** | `controllers/dashboardController.js` | `pages/Dashboard.jsx` | `GET /api/dashboard/me` | Implemented |
