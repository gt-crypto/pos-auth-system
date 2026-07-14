# REST API Endpoint Documentation

This document describes all API endpoints exposed by the backend Express server.

---

## Global API Rules
- **Base URL**: `/api` (or custom endpoint specified in environment variables).
- **Authentication**: Stateful session management via HttpOnly cookies (`jwt`).
- **Response Envelopes**:
  - **Success Response (2xx)**:
    ```json
    {
      "success": true,
      "message": "Action completed successfully",
      "data": { ... }
    }
    ```
  - **Error Response (4xx/5xx)**:
    ```json
    {
      "success": false,
      "message": "Error description here",
      "errors": [ ... ]
    }
    ```

---

## 1. Authentication Module (`/api/auth`)

### Register Account
- **Method**: `POST`
- **URL**: `/api/auth/register`
- **Description**: Registers a new user. If registering a Super Admin or Admin, the request must include the matching invite codes (`SUPER_ADMIN_INVITE` or `ADMIN_INVITE`).
- **Authentication Required**: No
- **Permission Required**: None
- **Request Body**:
  - `username` (String, required, 4-20 characters, alphanumeric + underscores)
  - `name` (String, required)
  - `email` (String, required, valid email format)
  - `password` (String, required, min 8 characters)
  - `inviteCode` (String, optional)
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registration successful. Awaiting administrator approval.",
    "data": {}
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Username already taken / email registered.
  - `422 Unprocessable Entity`: Validation failure on email or password length.

### Login
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Description**: Verifies credentials, updates lockout logs, and sets a JWT cookie. Locked after 5 failures for 15 minutes.
- **Authentication Required**: No
- **Request Body**:
  - `username` (String, required, lowercase)
  - `password` (String, required)
  - `rememberMe` (Boolean, optional, defaults to false)
- **Success Response (200 OK)**:
  *Sets HTTP Header `Set-Cookie: jwt=TOKEN; HttpOnly; SameSite=Lax`*
  ```json
  {
    "success": true,
    "message": "Logged in successfully",
    "data": {
      "user": {
        "id": "603d274f1f50a830200845a1",
        "username": "cashier_john",
        "email": "john@example.com",
        "role": "CASHIER",
        "status": "ACTIVE",
        "lastLogin": "2026-07-14T05:00:00.000Z",
        "loginHistory": []
      }
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid username or password.
  - `403 Forbidden`: Account is deleted, pending, inactive, or suspended.
  - `423 Locked`: Account is temporarily locked.

### Logout
- **Method**: `POST`
- **URL**: `/api/auth/logout`
- **Description**: Clears the JWT session cookie.
- **Authentication Required**: Yes
- **Success Response (200 OK)**:
  *Sets Cookie `jwt` to empty and expires it.*
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### Forgot Password
- **Method**: `POST`
- **URL**: `/api/auth/forgot-password`
- **Description**: Generates an encrypted token and emails a reset URL to the user.
- **Authentication Required**: No
- **Request Body**:
  - `email` (String, required)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "If that email is registered, a password reset link has been sent."
  }
  ```

### Reset Password
- **Method**: `POST`
- **URL**: `/api/auth/reset-password/:token`
- **Description**: Updates the account password using the token received in email.
- **Authentication Required**: No
- **Request Body**:
  - `password` (String, required, min 8 characters)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Password updated successfully. Please login."
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Token is invalid or expired.

---

## 2. Branch Module (`/api/branches`)

### Get Assigned Branch Details
- **Method**: `GET`
- **URL**: `/api/branches/my`
- **Description**: Fetches the branch details assigned to the currently logged in user.
- **Authentication Required**: Yes
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Branch details retrieved",
    "data": {
      "branch": {
        "_id": "603d274f1f50a830200845a0",
        "name": "Downtown Branch",
        "branchCode": "DTN01",
        "status": "ACTIVE"
      }
    }
  }
  ```

### Create Branch
- **Method**: `POST`
- **URL**: `/api/branches`
- **Description**: Creates a new retail location.
- **Authentication Required**: Yes
- **Permission Required**: `CREATE_BRANCH` (Super Admin Only)
- **Request Body**:
  - `name` (String, required)
  - `branchCode` (String, required, unique)
  - `phone` (String, required)
  - `email` (String, required)
  - `address` (String, required)
  - `city` (String, required)
  - `state` (String, required)
  - `country` (String, required)
  - `pincode` (String, required)
  - `managerName` (String, required)
- **Success Response (210 Created)**:
  ```json
  {
    "success": true,
    "message": "Branch created successfully",
    "data": { ... }
  }
  ```

---

## 3. User Management Module (`/api/users`)

### Get Pending Approvals
- **Method**: `GET`
- **URL**: `/api/users/pending`
- **Description**: Returns all users with a status of `PENDING`.
- **Authentication Required**: Yes
- **Permission Required**: `APPROVE_USER` (Super Admin Only)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Pending user accounts retrieved",
    "data": { "users": [ ... ] }
  }
  ```

### Approve User Account
- **Method**: `POST`
- **URL**: `/api/users/:id/approve`
- **Description**: Activates a pending account by changing its status to `ACTIVE`.
- **Authentication Required**: Yes
- **Permission Required**: `APPROVE_USER`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "User account approved and activated successfully",
    "data": { ... }
  }
  ```

---

## 4. Category Module (`/api/categories`)

### Get Categories
- **Method**: `GET`
- **URL**: `/api/categories`
- **Description**: Returns the list of categories for the branch. Bounded by branch scope filters.
- **Authentication Required**: Yes
- **Permission Required**: `READ_CATEGORY`
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Categories list retrieved successfully",
    "data": { "categories": [ ... ] }
  }
  ```

### Create Category
- **Method**: `POST`
- **URL**: `/api/categories`
- **Description**: Registers a new category under the branch scope.
- **Authentication Required**: Yes
- **Permission Required**: `CREATE_CATEGORY`
- **Request Body**:
  - `name` (String, required, unique per branch)
  - `description` (String, optional)
  - `displayOrder` (Number, optional, default: 0)
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Category created successfully",
    "data": { ... }
  }
  ```

---

## 5. Product Module (`/api/products`)

### Create Product
- **Method**: `POST`
- **URL**: `/api/products`
- **Description**: Registers a new menu item, combo, or variant structure.
- **Authentication Required**: Yes
- **Permission Required**: `CREATE_PRODUCT`
- **Request Body**:
  - `categoryId` (ObjectId, required)
  - `name` (String, required)
  - `sku` (String, required, unique per branch)
  - `price` (Number, optional, base price)
  - `taxPercentage` (Number, required)
  - `variants` (Array of variants, optional)
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": { ... }
  }
  ```

---

## 6. Inventory Module (`/api/inventory`)

### Restock Inventory
- **Method**: `POST`
- **URL**: `/api/inventory/restock`
- **Description**: Restocks a product inventory level. Emits an audit history entry.
- **Authentication Required**: Yes
- **Permission Required**: `RESTOCK_INVENTORY`
- **Request Body**:
  - `inventoryId` (ObjectId, required)
  - `quantityAdded` (Number, positive)
  - `supplierId` (ObjectId, optional)
  - `invoiceNumber` (String, optional)
  - `notes` (String, optional)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Stock restocked successfully",
    "data": { ... }
  }
  ```

### Adjust Stock
- **Method**: `POST`
- **URL**: `/api/inventory/adjust`
- **Description**: Corrects inventory discrepancies.
- **Authentication Required**: Yes
- **Permission Required**: `ADJUST_INVENTORY`
- **Request Body**:
  - `inventoryId` (ObjectId, required)
  - `newQuantity` (Number, non-negative)
  - `reason` (String: `DAMAGED`, `EXPIRED`, `WASTED`, `MANUAL_CORRECTION`)
  - `notes` (String, required, min 3 characters)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Inventory stock adjusted successfully",
    "data": { ... }
  }
  ```

### Transfer Stock between Branches
- **Method**: `POST`
- **URL**: `/api/inventory/transfer`
- **Description**: Shifits quantities of a product from a source branch to a target branch.
- **Authentication Required**: Yes
- **Permission Required**: `TRANSFER_INVENTORY`
- **Request Body**:
  - `productId` (ObjectId, required)
  - `fromBranch` (ObjectId, required)
  - `toBranch` (ObjectId, required)
  - `quantity` (Number, positive)
  - `notes` (String, optional)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Inventory transfer completed successfully",
    "data": { ... }
  }
  ```

---

## 7. Kitchen Ingredients Module (`/api/ingredients`)

### Get Ingredients
- **Method**: `GET`
- **URL**: `/api/ingredients`
- **Description**: Fetches raw kitchen ingredients (e.g. Dairy, spices, beverages). Cashiers must have the `hasIngredientsAccess` flag set to true to access this route.
- **Authentication Required**: Yes
- **Permission Required**: `READ_INGREDIENT` (or cashier override)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Ingredients retrieved successfully",
    "data": { ... }
  }
  ```

---

## 8. POS Billing Module (`/api/billing`)

### Checkout Cart Order
- **Method**: `POST`
- **URL**: `/api/billing/checkout`
- **Description**: Validates items stock levels, records a completed Order, updates customer history, and decrements product inventory quantities.
- **Authentication Required**: Yes
- **Permission Required**: `CREATE_BILL`
- **Request Body**:
  - `customerId` (ObjectId, optional)
  - `customerName` (String, optional)
  - `customerPhone` (String, optional)
  - `items` (Array, required)
    - `productId` (ObjectId, required)
    - `quantity` (Number, required)
    - `unitPrice` (Number, required)
    - `totalPrice` (Number, required)
    - `variantName` (String, optional)
  - `subtotal` (Number, required)
  - `totalAmount` (Number, required)
  - `paymentMethod` (String: `CASH`, `CARD`, `UPI`)
  - `paymentMethods` (Array, optional for splits)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Checkout processed successfully",
    "data": {
      "order": {
        "orderNumber": "ORD-20260714-001",
        "totalAmount": 10.78,
        "paymentStatus": "PAID"
      }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Insufficient inventory for product X.

### Hold Order
- **Method**: `POST`
- **URL**: `/api/billing/hold`
- **Description**: Places a temporary order basket on hold.
- **Authentication Required**: Yes
- **Permission Required**: `CREATE_BILL`
- **Request Body**: Same schema as Checkout but creates a document with status `HOLD`.
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Order held on register successfully",
    "data": { ... }
  }
  ```

---

## 9. Reports Module (`/api/reports`)

### Get Sales Report
- **Method**: `GET`
- **URL**: `/api/reports/sales`
- **Description**: Aggregates sales statistics. Admins are forced to their assigned branch scope, while Super Admins can pass a query string to view any branch.
- **Authentication Required**: Yes
- **Permission Required**: `READ_REPORTS`
- **Query Parameters**:
  - `startDate` (ISO Date string, optional)
  - `endDate` (ISO Date string, optional)
  - `branchId` (ObjectId string, optional for Super Admin)
  - `export` (String, set to `csv` to get downloadable response)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Sales reports retrieved successfully",
    "data": {
      "summary": {
        "totalRevenue": 4249.50,
        "totalOrders": 18,
        "totalTax": 340.00,
        "totalDiscount": 45.00
      },
      "transactions": [ ... ]
    }
  }
  ```

---

## 10. Audit Logs Module (`/api/audit`)

### Fetch Audit Trail
- **Method**: `GET`
- **URL**: `/api/audit`
- **Description**: Fetches the global action audit logs list.
- **Authentication Required**: Yes
- **Permission Required**: `READ_AUDIT` (Super Admin Only)
- **Query Parameters**:
  - `startDate` / `endDate` (Dates)
  - `action` (String)
  - `entityType` (String)
  - `performedBy` (ObjectId)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Audit logs retrieved successfully",
    "data": {
      "logs": [ ... ]
    }
  }
  ```

---

## 11. Health Check Endpoint

### Check System Status
- **Method**: `GET`
- **URL**: `/api/health`
- **Description**: Evaluates overall systems statuses including MongoDB state and node processes.
- **Authentication Required**: No (Excluded from rate limits)
- **Success Response (200 OK)**:
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
