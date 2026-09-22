# Mini HRMS

A role-based Mini Human Resource Management System built for the 2-day Vibe Coder / Intern-Fresher assessment, covering employee management, attendance tracking, leave management, dynamic dashboards, authentication, and role-based authorization.

---

## 1. Project Overview

**Mini HRMS** is a web-based human resource management portal designed to streamline core administrative workflows for organizations. It provides dedicated, isolated interfaces tailored to three user roles: **HR Administrators**, **People Managers**, and **Employees**.

### Intended Users & Roles
- **HR_ADMIN (HR Director / Admin)**: Global administrative access to manage company-wide employee directories, adjust employment statuses, oversee company attendance logs, perform status corrections, and approve or reject any employee leave request.
- **MANAGER (People Manager / Tech Lead)**: Scoped access restricted strictly to their direct team members. Managers can monitor team attendance, review team roster details, and approve or reject leave requests submitted by their direct subordinates.
- **EMPLOYEE (Staff Member)**: Self-service access restricted strictly to their own profile, personal attendance check-in/check-out, attendance logs, and personal leave submissions.

---

## 2. Key Features

### Authentication & Session Management
- **Secure Authentication**: Email and password authentication powered by `bcryptjs` password hashing (salt factor 10).
- **HttpOnly JWT Session**: Stateless session handling using Web Crypto compliant `jose` tokens stored in `HttpOnly`, `SameSite=Lax` security cookies (`hrms_session`).
- **Protected Routes & Inactive Account Protection**: Edge middleware (`middleware.ts`) and server-side guards (`requireAuth()`) block unauthenticated users and instantly reject inactive accounts (`status: INACTIVE`).

### Authorization (Server-Side RBAC)
- **Role Hierarchy**: Strict role-based permission enforcement via `requireRole()` helper.
- **Team Isolation**: Manager access is strictly scoped to direct reports (`subordinates` where `managerId === session.employeeId`).
- **Self-Service Restrictions**: Employees are restricted strictly to their own data (`employeeId === session.employeeId`).
- **Self-Approval Guard**: Managers and HR Administrators are strictly forbidden from approving or rejecting their own leave requests.

### Employee Management
- **Employee Directory**: Filterable directory with real-time search by name/email/code, department filter, and status filter.
- **Employee Creation & Editing (HR Only)**: HR Admins can onboard new employees, assign roles/managers, and update employee records.
- **Status Toggle (HR Only)**: Activate or deactivate employee accounts with immediate session invalidation.
- **Self-Profile Editing**: Employees can update their personal contact details (email, phone) while HR-controlled fields (role, department, designation, joining date, status) remain locked.

### Attendance Management
- **Daily Attendance**: One-click check-in and check-out with UTC Midnight date normalization (`00:00:00.000Z`).
- **Duplicate Prevention**: Database unique constraint (`@@unique([employeeId, date])`) prevents duplicate daily check-ins.
- **Leave Conflict Guard**: Check-in is automatically blocked if the employee has an approved leave for the date.
- **HR Status Correction**: HR Admins can manually adjust attendance statuses with audit logging.

### Leave Management
- **Leave Application**: Employees can apply for leave choosing from standard leave types (`CASUAL`, `SICK`, `ANNUAL`, `UNPAID`).
- **Overlapping Request Guard**: Rejects submissions that overlap with existing `PENDING` or `APPROVED` leave requests.
- **Approval Workflow**: Managers (for direct team) and HR Admins (company-wide) can approve or reject pending requests.
- **Mandatory Rejection Reason**: Rejections require an explicit explanation before submission.
- **Pending Leave Cancellation**: Employees can cancel their own `PENDING` leave requests before approval.

### Dynamic Role Dashboards
- **EMPLOYEE Dashboard**: Personal welcome banner, current day attendance status card, leave metric counters, and recent leave history.
- **MANAGER Dashboard**: Team summary metrics, team attendance breakdown, pending team leave queue, and direct team roster.
- **HR_ADMIN Dashboard**: Company-wide workforce statistics (Total/Active/Inactive), company today attendance summary, global pending leave queue, and department distribution overview.

---

## 3. Role & Permission Matrix

| Capability / Resource | HR_ADMIN | MANAGER | EMPLOYEE |
| :--- | :---: | :---: | :---: |
| **Login / Authenticate** | ✅ | ✅ | ✅ |
| **View Dashboard** | Global Company Data | Direct Team Data Only | Self Data Only |
| **View Employee Directory** | All Company Employees | Direct Team Members Only | Self Record Only (via Profile) |
| **Create New Employee** | ✅ | ❌ | ❌ |
| **Edit Employee Details** | All Fields | ❌ (Read-only) | Contact Fields Only (Email, Phone) |
| **Deactivate/Activate Employee** | ✅ | ❌ | ❌ |
| **Check-In / Check-Out** | ✅ (Self) | ✅ (Self) | ✅ (Self) |
| **View Attendance Logs** | All Employees | Direct Team + Self | Self Only |
| **Correct Attendance Status** | ✅ | ❌ | ❌ |
| **Submit Leave Request** | ✅ (Self) | ✅ (Self) | ✅ (Self) |
| **View Leave Requests** | All Employees | Direct Team + Self | Self Only |
| **Approve/Reject Leave** | Any Employee (except Self) | Direct Team Only (except Self) | ❌ |
| **Cancel Leave Request** | Self Pending Requests | Self Pending Requests | Self Pending Requests |

---

## 4. Technology Stack

- **Framework**: Next.js 15 (App Router, Server Actions & Route Handlers)
- **Language**: TypeScript 5.8
- **UI & Styling**: Tailwind CSS 4, Lucide React Icons, Sonner (Toast notifications)
- **Validation**: Zod 3.24
- **Authentication**: JWT (`jose` 6.0), `bcryptjs` 3.0, HttpOnly Cookie
- **Database**: PostgreSQL 16
- **ORM**: Prisma Client & CLI 6.4
- **Testing & Scripts**: `tsx` test runner, custom automated API test suites

---

## 5. System Architecture

```
                               ┌─────────────────────────┐
                               │   Browser / Client UI   │
                               └────────────┬────────────┘
                                            │ HTTP / Cookie
                                            ▼
                               ┌─────────────────────────┐
                               │ Next.js 15 App Router   │
                               │  Middleware Guard       │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ REST Route Handlers     │
                               │ (/api/* Endpoints)      │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ Authentication Service  │
                               │ (requireAuth / RBAC)    │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ Zod Schema Validation & │
                               │ Domain Business Logic   │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ Prisma ORM Client       │
                               └────────────┬────────────┘
                                            │
                                            ▼
                               ┌─────────────────────────┐
                               │ PostgreSQL 16 Database  │
                               └─────────────────────────┘
```

---

## 6. Project Structure

```
d:/HRMS
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── attendance/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── leave/
│   │   │   └── profile/
│   │   ├── api/
│   │   │   ├── attendance/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   └── leave/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── attendance/
│   │   ├── dashboard/
│   │   ├── employees/
│   │   ├── layout/
│   │   └── leave/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── validations/
│       ├── attendance.ts
│       ├── employee.ts
│       └── leave.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── docs/
│   ├── REQUIREMENT_ANALYSIS.md
│   └── PLANNING.md
├── test_authorization.ts
├── test_employee_api.ts
├── test_phase4_security.ts
├── test_attendance_api.ts
├── test_leave_api.ts
├── test_dashboard_api.ts
├── package.json
└── tsconfig.json
```

---

## 7. Database Model Summary

| Model | Purpose | Key Attributes |
| :--- | :--- | :--- |
| **User** | System authentication credentials & role mapping | `email`, `passwordHash`, `role`, `employeeId` |
| **Employee** | Core personnel records & managerial hierarchy | `employeeCode`, `fullName`, `department`, `designation`, `status`, `managerId` |
| **Attendance** | Daily check-in/out logs per employee | `employeeId`, `date`, `checkIn`, `checkOut`, `status` (`@@unique([employeeId, date])`) |
| **LeaveRequest** | Leave application & approval tracking | `employeeId`, `leaveType`, `startDate`, `endDate`, `status`, `reason`, `rejectionReason`, `reviewedById` |

---

## 8. API Endpoint Reference

### Authentication Endpoints
- `POST /api/auth/login` — Authenticate user credentials and issue HttpOnly JWT cookie.
- `GET /api/auth/me` — Retrieve current authenticated session identity and user profile.
- `POST /api/auth/logout` — Clear session cookie and destroy active session.

### Employee Endpoints
- `GET /api/employees` — List employees (HR: All, Manager: Direct Team).
- `POST /api/employees` — Onboard a new employee and user account (HR Only).
- `GET /api/employees/[id]` — Retrieve specific employee details (Role-scoped).
- `PATCH /api/employees/[id]` — Update employee details (HR: All, Employee: Email/Phone).
- `PATCH /api/employees/[id]/status` — Toggle employee active/inactive status (HR Only).

### Attendance Endpoints
- `POST /api/attendance/check-in` — Register daily check-in timestamp.
- `POST /api/attendance/check-out` — Register daily check-out timestamp.
- `GET /api/attendance` — Fetch attendance records (Role-scoped).
- `PATCH /api/attendance/[id]/status` — Correct attendance record status (HR Only).

### Leave Endpoints
- `POST /api/leave` — Submit a new leave request.
- `GET /api/leave` — List leave requests (Role-scoped).
- `GET /api/leave/[id]` — Fetch specific leave request details.
- `PATCH /api/leave/[id]/approve` — Approve pending leave request (HR or Direct Manager).
- `PATCH /api/leave/[id]/reject` — Reject pending leave request with reason (HR or Direct Manager).
- `PATCH /api/leave/[id]/cancel` — Cancel pending leave request (Applicant Only).

### Dashboard Endpoint
- `GET /api/dashboard` — Retrieve aggregated dashboard analytics scoped by logged-in role.

---

## 9. Local Setup & Installation

### Prerequisites
- **Node.js**: v18.x or v20.x
- **npm**: v9.x or v10.x
- **PostgreSQL**: v16 (Local instance or Docker container)
- **Git**

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/your-username/mini-hrms.git
cd mini-hrms
npm install
```

### Step 2: Configure Environment Variables
Create a `.env` file in the project root directory:
```env
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/mini_hrms?schema=public"
JWT_SECRET="your-secure-random-jwt-secret-key-at-least-32-chars"
PORT=3000
NODE_ENV="development"
```

### Step 3: Initialize Database & Run Migrations
```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### Step 4: Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 10. Demo Credentials (Development / Evaluation Seed Data)

The database seed script (`npx prisma db seed`) populates the following **DEMO / DEVELOPMENT** credentials for evaluator testing:

| Role | Employee Name | Email | Password | Access Scope |
| :--- | :--- | :--- | :--- | :--- |
| **HR_ADMIN** | Sarah Jenkins | `hr@company.com` | `Password123!` | Global company management |
| **MANAGER** | Alex Rivera | `manager.a@company.com` | `Password123!` | Engineering Team (EMP-004, EMP-005, EMP-006) |
| **MANAGER** | Priya Sharma | `manager.b@company.com` | `Password123!` | Marketing Team (EMP-007, EMP-008) |
| **EMPLOYEE** | John Doe | `employee.a@company.com` | `Password123!` | Active employee (Engineering) |
| **EMPLOYEE** | Jane Smith | `employee.b@company.com` | `Password123!` | Active employee (Engineering) |
| **EMPLOYEE** | Michael Lee | `employee.e@company.com` | `Password123!` | Inactive employee (Access blocked) |

> [!IMPORTANT]
> The credentials above are for local development and assessment evaluation only. No real production secrets are exposed.

---

## 11. Automated Test Suites & Verification

The application includes 6 comprehensive automated API test suites covering 119 verified test cases:

```bash
# Run individual test suites
npx tsx test_authorization.ts    # 12 / 12 PASSED
npx tsx test_employee_api.ts     # 17 / 17 PASSED
npx tsx test_phase4_security.ts  # 10 / 10 PASSED
npx tsx test_attendance_api.ts   # 20 / 20 PASSED
npx tsx test_leave_api.ts        # 40 / 40 PASSED
npx tsx test_dashboard_api.ts    # 20 / 20 PASSED
```

### Overall Automated Test Summary
- **Total Tests**: **119 / 119 PASSED (0 Failed)**
- **TypeScript Typecheck (`npx tsc --noEmit`)**: **0 Errors**
- **Production Build (`npm run build`)**: **PASSED**
- **Prisma Schema Validation (`npx prisma validate`)**: **Valid**

---

## 12. Security & Edge Case Coverage

1. **Password Hashing**: Passwords stored using `bcryptjs` (salt factor 10).
2. **HttpOnly Cookies**: Session cookie cannot be accessed via JavaScript (`XSS` mitigation).
3. **IDOR Immunity**: Identity derived exclusively from server JWT token; request body `employeeId` overrides are strictly ignored.
4. **Manager Scoping**: Managers attempting cross-team reads or approvals receive HTTP `403 Forbidden`.
5. **Self-Approval Lockout**: Users attempting to approve or reject their own leave receive HTTP `403 Forbidden`.
6. **Attendance Guards**: Duplicate check-ins and check-ins during approved leave return HTTP `400 Bad Request`.
7. **Overlapping Leave Guard**: Date ranges overlapping with `PENDING` or `APPROVED` leave are rejected.
8. **Inactive Lockout**: Deactivated users (`status: INACTIVE`) are immediately denied access on session check.
9. **Data Exclusion**: `passwordHash` and security fields are excluded from all API outputs.

---

## 13. AI Usage & Vibe Coding Process

Development followed a structured AI-assisted pair-engineering workflow using Antigravity (Google DeepMind):

### Iterative Development Phasing
1. **Requirement Analysis**: Extracted functional rules, role matrix, and security constraints.
2. **Planning & Architecture**: Drafted relational schema, route tree, and RBAC matrix.
3. **Incremental Implementation**: Implemented backend APIs, authentication middleware, and frontend components step-by-step per phase.
4. **Automated Testing**: Created standalone test suites (`test_*.ts`) verifying 119 API test cases.
5. **Security Review**: Conducted Phase 4 and Phase 8 security audits.
6. **UI/UX Polish**: Refined responsive dark-mode dashboard interfaces.

---

## 14. 5 Key AI Prompts Used

### Prompt 1: Database Schema & Relational Modeling
- **Prompt**:  
  *"Design a Prisma schema for a PostgreSQL database for a Mini HRMS supporting User, Employee, Attendance, and LeaveRequest entities. Include self-referential relations for Manager to Subordinates, unique constraint on employeeId + date for Attendance, proper status enums, and cascade deletion rules."*
- **Why Used**: To quickly generate a type-safe database schema adhering to relational integrity constraints and database-level unique guards.
- **AI Approach/Output**: Generated models for `User`, `Employee`, `Attendance`, and `LeaveRequest` with Prisma enums (`Role`, `EmploymentStatus`, `AttendanceStatus`, `LeaveType`, `LeaveStatus`).
- **What Was Accepted**: Enums and self-referential `Employee` relation (`managerId` -> `subordinates`), `@@unique([employeeId, date])` in `Attendance`.
- **What Was Changed or Rejected**: Kept sensitive `passwordHash` strictly on `User` entity (rejected storing plain `password` string on `Employee`). Standardized `Attendance.date` field to store UTC normalized midnight (`00:00:00.000Z`) timestamps.

### Prompt 2: Session JWT & Middleware Auth Engine
- **Prompt**:  
  *"Create a lightweight JWT session authentication utility and Next.js 15 App Router middleware using the `jose` library and `bcryptjs`. It must store an HttpOnly cookie named `hrms_session` with SameSite=Lax and protect routes /dashboard, /employees, /attendance, /leave, /profile."*
- **Why Used**: Next.js 15 Middleware runs on Edge Runtime where standard Node.js crypto libraries like `jsonwebtoken` throw runtime exceptions.
- **AI Approach/Output**: Provided `src/lib/auth.ts` using `jose` `SignJWT` / `jwtVerify` and Next.js `middleware.ts` reading request cookies and parsing session state.
- **What Was Accepted**: Edge-compatible `jose` token signing and cookie reading logic.
- **What Was Changed or Rejected**: Added role hierarchy checks to middleware so non-HR users visiting `/employees/new` are immediately redirected to `/dashboard` with an alert parameter. Rejected storing full user entity in JWT payload; restricted payload to minimal claims `{ id, email, role, employeeId }`.

### Prompt 3: Overlapping Leave Detection Query
- **Prompt**:  
  *"Write a Prisma query and Zod validation function to check if a new leave request (startDate to endDate) overlaps with any existing PENDING or APPROVED leave request for the same employee."*
- **Why Used**: Date range overlap checking is an algorithmic edge case prone to off-by-one errors.
- **AI Approach/Output**: Provided query filtering `employeeId`, `status: { in: ['PENDING', 'APPROVED'] }` with overlap condition `startDate <= newEndDate AND endDate >= newStartDate`.
- **What Was Accepted**: The mathematical condition `existingStartDate <= requestedEndDate AND existingEndDate >= requestedStartDate`.
- **What Was Changed or Rejected**: Extended check to reject submission if `endDate < startDate`. Rejected AI's initial recommendation to check overlap on client-side state only; enforced check inside PostgreSQL transaction on backend route handler.

### Prompt 4: Dynamic Dashboard Metrics Service
- **Prompt**:  
  *"Write a service function `getDashboardStats(user: UserSession)` that executes database aggregation queries to return KPI cards for HR_ADMIN, MANAGER, and EMPLOYEE roles without hardcoding any values."*
- **Why Used**: Dashboard queries require parallel database aggregation based on user role boundaries.
- **AI Approach/Output**: Used `Promise.all` with Prisma `count()` and `findMany()` calls scoped by user role.
- **What Was Accepted**: Parallel query execution strategy with `Promise.all`.
- **What Was Changed or Rejected**: Adjusted "Present Today" query to filter attendance records matching UTC normalized current date. Rejected fetching all records into JavaScript memory to filter counts; forced filtering in SQL `WHERE` clauses.

### Prompt 5: Standardized API Error Response & Edge Case Handlers
- **Prompt**:  
  *"Create a custom API error handling wrapper that catches Zod validation errors, Prisma database constraint violations, and security authorization exceptions, returning uniform JSON error responses `{ error: string, details?: any }`."*
- **Why Used**: To ensure all edge-case rejections return standard HTTP status codes (`400`, `401`, `403`, `404`, `500`) and clean human-readable error messages for client toasts.
- **AI Approach/Output**: Created `handleApiError` utility mapping exception instances to status codes.
- **What Was Accepted**: Mapping Zod `ZodError` to `400 Bad Request` and `AuthError` to `403 Forbidden`.
- **What Was Changed or Rejected**: Added specific message override for Prisma `P2002` unique constraint violation on `[employeeId, date]` to return `"You have already checked in today."`. Rejected dumping raw database stack trace logs to client responses.

---

## 15. AI Code Review & Challenge Analysis

### Case 1: Edge Runtime Incompatibility in Auth Middleware
- **What AI Generated**:
  ```typescript
  import jwt from 'jsonwebtoken';
  export function verifyToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }
  ```
- **What Was Wrong**: `jsonwebtoken` relies on Node.js native `crypto` module, which is unsupported in Next.js 15 Edge Runtime (`middleware.ts`), causing `Dynamic Code Evaluation / Module not found: crypto` runtime crashes.
- **How Identified**: Dev server startup failure when attempting to navigate to protected route `/dashboard`.
- **How Fixed**: Refactored to use Web Crypto API compliant `jose` library:
  ```typescript
  import { jwtVerify } from 'jose';
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  export async function verifySessionToken(token: string) {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  }
  ```

### Case 2: Self-Approval Authorization Vulnerability in Leave Review API
- **What AI Generated**:
  ```typescript
  export async function PATCH(req: Request) {
    const session = await requireAuth();
    if (session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Employees cannot approve leave' }, { status: 403 });
    }
    await prisma.leaveRequest.update({ ... });
  }
  ```
- **What Was Wrong**: Omitted checking if the applicant ID matched the reviewer session ID, allowing Managers and HR Admins to approve their own leave requests.
- **How Identified**: Security review against the permission matrix rule: *"User must never be able to approve their own leave."*
- **How Fixed**: Added explicit applicant vs reviewer ownership assertion:
  ```typescript
  const targetRequest = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } });
  if (targetRequest.employeeId === session.employeeId) {
    return NextResponse.json(
      { error: "Forbidden: You cannot approve or reject your own leave request." },
      { status: 403 }
    );
  }
  ```

---

## 16. Deliberate Scope Limitations & Implementation Behavior

- **Leave Request Cancellation Behavior**: The Prisma `LeaveStatus` enum includes `PENDING`, `APPROVED`, and `REJECTED` statuses, but does not include a `CANCELLED` status. Consequently, when an employee cancels a `PENDING` leave request (`PATCH /api/leave/[id]/cancel`), the backend handler removes the record from PostgreSQL using `prisma.leaveRequest.delete()`.
- **Attendance Date Normalization**: All attendance dates are normalized to **UTC Midnight (`00:00:00.000Z`)** using `getNormalizedDate()` in `src/lib/attendance.ts` to ensure consistent calendar date matching regardless of client timezone offsets.
- **Attendance Scope**: Simple daily check-in and check-out system; no biometric or GPS geolocation tracking.
- **Payroll**: Payroll calculation and payslip generation were intentionally excluded per assessment scope.
- **Notifications**: In-app toast feedback provided; external email/SMS notification integration omitted.
- **Shift Management**: Standard single-shift working hours assumed; complex rotas omitted.

---

## 17. Deployment Status

- **Status**: Pending final deployment verification.

---

## 18. Screenshots

*(Screenshots can be added following final deployment hosting).*
