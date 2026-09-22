# TECHNICAL PLANNING & ARCHITECTURE SPECIFICATION: Mini HRMS

**Project:** Mini Human Resource Management System (HRMS)  
**Target:** Small SaaS Company  
**Assessment:** AppTrait Solutions - Vibe Coder Practical Assessment  
**Author:** Senior Full-Stack Engineer  

---

## 1. Requirement Breakdown & Identified Modules

The Mini HRMS is decomposed into 5 core functional modules:

1. **Authentication & Session Module (`/auth`, `/api/auth/*`)**
   - User credentials verification using bcrypt password hashing.
   - Session creation with JWT stored in HTTP-Only cookies (`SameSite=Lax`).
   - Session context extraction and Next.js Edge Middleware route guarding.

2. **Employee Management Module (`/employees`, `/api/employees/*`)**
   - Employee directory table with search, filter (department/status), and pagination-ready queries.
   - Employee creation with automatic unique `employeeCode` generation and linked `User` record creation in a transaction.
   - Employee details view protected against IDOR attacks.
   - Employee editing (HR: full edit; Employee: self `email` and `phone` edit; Manager: denied).
   - Employment status toggle (`ACTIVE` / `INACTIVE`).

3. **Attendance Management Module (`/attendance`, `/api/attendance/*`)**
   - Employee Check-in and Check-out engine with date normalization (Asia/Kolkata IST).
   - Edge-case validations (duplicate check-in, checkout without check-in, duplicate checkout, check-in on approved leave, inactive account lockout).
   - Role-scoped attendance viewing (HR: All, Manager: Assigned Team, Employee: Self).

4. **Leave Management Module (`/leave`, `/api/leave/*`)**
   - Leave application handler supporting types (`CASUAL`, `SICK`, `ANNUAL`, `UNPAID`), date validations (`endDate >= startDate`), and overlap detection.
   - Leave approval & rejection queue for Managers (team scope) and HR (all).
   - Rejection reason enforcement on rejection.
   - Self-approval lockdown (HR/Manager cannot review own leave; Employee cannot review any leave).
   - Leave cancellation for `PENDING` requests only.

5. **Dashboard & Analytics Module (`/dashboard`, `/api/dashboard`)**
   - Dynamic metric aggregation powered strictly by live PostgreSQL queries.
   - Customized KPI views for `HR_ADMIN`, `MANAGER`, and `EMPLOYEE`.

---

## 2. Technology Selection & Reasons

| Stack Layer | Selected Technology | Technical Reason for Selection |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 15 (App Router) + React 19 + TypeScript | Unified React framework offering fast routing, server-side rendering, type safety, and clean file-based routing. |
| **UI Design System** | Tailwind CSS + shadcn/ui + Lucide Icons | Utility-first styling combined with accessible, unstyled, customizable UI primitives (dialogs, tables, badges, cards, forms). |
| **Backend Layer** | Next.js Route Handlers (`/api/*`) | Monolithic server architecture keeping API endpoints and UI in a single deployable unit without extra microservice overhead. |
| **Database** | PostgreSQL | Enterprise relational database guaranteeing ACID compliance, relational integrity, unique index enforcement, and foreign key cascades. |
| **ORM** | Prisma ORM | Type-safe database client generating TypeScript interfaces, schema migration management, and clean relation queries. |
| **Payload Validation** | Zod | Schema-based validation for runtime request body parsing, query parameters, and form validation. |
| **Authentication** | Custom Session JWT (`jose` + `bcryptjs`) | Lightweight, secure session handling stored in HTTP-Only cookies (`SameSite=Lax`, `Secure` in prod) without third-party vendor lock-in. |

---

## 3. Application Architecture & Layering

```
                     ┌──────────────────────────────────────────────┐
                     │          Next.js UI Component Layer          │
                     │  (Client Pages, Dialogs, Forms, Toast Skeletons) │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            Next.js Route Handlers            │
                     │               (/api/v1/* Routes)             │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │            Authentication Engine             │
                     │      (verifySessionToken from HttpOnly JWT)  │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │             Authorization Layer              │
                     │  (requireRole, requireEmployeeAccess, etc.)  │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │             Zod Payload Validation           │
                     │         (Schema parsing & error formatting)  │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │       Service Layer / Business Logic         │
                     │  (Edge case checks: Overlap, Duplicate, IST) │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │                 Prisma ORM                   │
                     │       (Type-safe Database Operations)        │
                     └──────────────────────┬───────────────────────┘
                                            │
                                            ▼
                     ┌──────────────────────────────────────────────┐
                     │             PostgreSQL Database              │
                     │      (Relational Tables & Unique Constraints)│
                     └──────────────────────────────────────────────┘
```

---

## 4. Application Flow Overview

1. **Authentication Flow**: User submits credentials at `/login` → Route Handler verifies bcrypt hash → `jose` signs JWT → Set `hrms_session` HttpOnly cookie → Next.js Middleware checks cookie on protected routes → Redirects to `/dashboard`.
2. **Employee Management Flow**: HR accesses `/employees` → API checks `HR_ADMIN` role → HR fills creation modal → Route Handler creates `Employee` + `User` records in a Prisma transaction → Toast notification rendered.
3. **Attendance Flow**: Employee clicks Check-in → API checks status is `ACTIVE`, no approved leave today, no duplicate check-in → Upserts `Attendance` record with `checkIn = now()`, `status = PRESENT`. On Check-out → API checks `checkIn != null` and `checkOut == null` → Updates `checkOut = now()`.
4. **Leave Flow**: Employee submits leave request → API validates `endDate >= startDate`, active status, and queries overlap with `PENDING`/`APPROVED` requests → Creates `LeaveRequest`. Manager views team queue → Approves or rejects with reason (self-approval blocked).
5. **Dashboard Flow**: Page calls `/api/dashboard` → Server runs parallel aggregated queries scoped by role → HR gets company stats, Manager gets team stats, Employee gets personal stats.

---

## 5. Database Design Overview

The relational schema consists of 4 main entities:
- **`User`**: System login credentials (`email`, `passwordHash`, `role`, `employeeId`).
- **`Employee`**: Core employment profile (`employeeCode`, `fullName`, `email`, `phone`, `department`, `designation`, `managerId`, `joiningDate`, `status`).
- **`Attendance`**: Daily log (`employeeId`, `date`, `checkIn`, `checkOut`, `status`) guarded by `@@unique([employeeId, date])`.
- **`LeaveRequest`**: Leave application (`employeeId`, `leaveType`, `startDate`, `endDate`, `reason`, `status`, `rejectionReason`, `reviewedById`, `reviewedAt`).

---

## 6. Authentication Approach

- **Storage**: Token is placed strictly inside an `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (in production) cookie named `hrms_session`.
- **Encryption & Verification**: Signed using `jose` library (Web Crypto API compliant for Next.js Edge Runtime compatibility).
- **Password Protection**: Passwords are hashed with `bcryptjs` (salt rounds: 10). Plaintext passwords are NEVER stored or logged.

---

## 7. Authorization & RBAC Security Model

Authorization is enforced on the server-side for every single API endpoint using four reusable helpers in `src/lib/permissions.ts`:

1. **`requireAuth()`**: Verifies session JWT from cookies. Returns `UserSession` or throws `401 Unauthorized`.
2. **`requireRole(allowedRoles)`**: Verifies user role. Throws `403 Forbidden` if role is insufficient.
3. **`requireEmployeeAccess(targetEmployeeId)`**:
   - `HR_ADMIN`: Allowed any ID.
   - `MANAGER`: Allowed if `targetEmployee.managerId === user.employeeId`.
   - `EMPLOYEE`: Allowed ONLY if `targetEmployeeId === user.employeeId`.
   - Throws `403 Forbidden` if unauthorized (IDOR Defense).
4. **`requireLeaveReviewAccess(targetRequest)`**:
   - **HR_ADMIN & MANAGER**: Blocked if `targetRequest.employeeId === user.employeeId` (Self-approval lockout).
   - **MANAGER**: Blocked if `targetRequest.employee.managerId !== user.employeeId` (Cross-team lockout).
   - **EMPLOYEE**: Blocked from all review actions.

---

## 8. Business Assumptions & Rules Summary

1. **Leave Categories**: `CASUAL`, `SICK`, `ANNUAL`, `UNPAID`.
2. **Employee Self-Edit Scope**: `email` and `phone` only. All other profile fields are locked to HR.
3. **Leave Cancellation**: Only `PENDING` leave requests can be cancelled by employees.
4. **Inactive Accounts**: `INACTIVE` employees are blocked from login, check-in, check-out, and leave applications.
5. **Attendance Calculation**:
   - `PRESENT`: Set on normal check-in.
   - `LEAVE`: Automatically set when an approved leave covers the calendar date.
   - `HALF_DAY`: Manually assigned by HR/Admin.
   - `ABSENT`: Manually assigned by HR/Admin.

---

## 9. Business Logic & Edge-Case Matrix

| # | Edge Case Scenario | Expected API Behavior | Error Message Returned |
| :--- | :--- | :--- | :--- |
| **1** | Duplicate Check-in | Reject if today's attendance has `checkIn != null`. | `"You have already checked in today."` |
| **2** | Checkout without Check-in | Reject if no attendance record exists for today. | `"Cannot check out without checking in first."` |
| **3** | Duplicate Checkout | Reject if today's attendance has `checkOut != null`. | `"You have already checked out today."` |
| **4** | Check-in during Approved Leave | Reject if today falls within an `APPROVED` leave date range. | `"Check-in disabled: You are currently on approved leave."` |
| **5** | Leave End Date < Start Date | Validate `endDate >= startDate`. Reject if false. | `"End date cannot be prior to start date."` |
| **6** | Overlapping Leave Requests | Reject if dates overlap with existing `PENDING` or `APPROVED` leave. | `"Leave request dates overlap with an existing request."` |
| **7** | Cross-Team Manager Approval | Reject if applicant's `managerId !== caller.employeeId`. | `"Forbidden: You can only review leave requests for your team members."` |
| **8** | Self Leave Review Attempt | Reject if `applicantId === caller.employeeId` (HR/Manager) or if role is `EMPLOYEE`. | `"Forbidden: HR/Managers cannot approve or reject their own leave requests."` |
| **9** | Inactive Employee Actions | Reject check-in, checkout, or leave submission if status is `INACTIVE`. | `"Account inactive. Contact HR for assistance."` |
| **10**| Profile ID Tampering (IDOR) | Reject request if Employee A attempts to read/edit Employee B profile. | `"403 Forbidden: Unauthorized resource access."` |

---

## 10. Validation & Error Handling Strategy

- **Validation**: All incoming API payloads are parsed using Zod schemas (`src/lib/validations/*`). Invalid payloads return HTTP `400 Bad Request` with structured field errors.
- **Error Handling**: Wrapped in a central `handleApiError` utility. Known authorization errors return HTTP `403`, unauthenticated requests return `401`, missing entities return `404`, database unique violations (e.g. duplicate check-in) return friendly `400` messages, and unexpected exceptions return `500 Internal Error` without leaking stack traces.

---

## 11. Security Testing Strategy (12 Cases)

1. Employee A attempts to view Employee B details (`403 Forbidden`).
2. Employee A changes employee ID in API request URL (`403 Forbidden`).
3. Employee attempts to approve a leave request (`403 Forbidden`).
4. Employee attempts to reject a leave request (`403 Forbidden`).
5. Manager A attempts to view Manager B's team employee (`403 Forbidden`).
6. Manager A attempts to approve Manager B's team leave request (`403 Forbidden`).
7. Manager attempts to modify employee profile details (`403 Forbidden`).
8. Inactive employee attempts login (`403 Account Inactive`).
9. Inactive employee attempts check-in (`403 Account Inactive`).
10. Inactive employee attempts leave application (`403 Account Inactive`).
11. Unauthenticated user accesses protected API (`401 Unauthorized`).
12. User attempts to manipulate role field in HTTP request body (`Blocked / Ignored`).

---

## 12. Definition of Done Checklist

Every feature must pass all 12 criteria before being marked complete:
- [ ] UI works (Responsive, accessible, clean layout)
- [ ] API works (Correct HTTP status codes and responses)
- [ ] Database operation works (Prisma ORM data persistence)
- [ ] Authentication checked (Session cookie verified)
- [ ] Authorization checked (Role & ownership enforced)
- [ ] Validation implemented (Zod schema validation active)
- [ ] Business rules implemented (Edge cases handled)
- [ ] Error handling implemented (Friendly messages returned)
- [ ] Loading state implemented (Skeletons & spinners active)
- [ ] Empty state implemented (Clean placeholder cards rendered)
- [ ] Success feedback implemented (Toast notifications displayed)
- [ ] Unauthorized access tested (Security test cases pass)

---

## 13. Implementation Phases (1 through 10)

- **Phase 1 — Project Foundation**: Next.js 15 setup, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Database schema, Migration, Seed data.
- **Phase 2 — Authentication**: Login, Logout, Password hashing (`bcryptjs`), Session (`jose`), HTTP-only cookie, Protected routes middleware.
- **Phase 3 — Authorization**: RBAC, Role guards, Resource ownership (IDOR defense), Manager team isolation, API security.
- **Phase 4 — Employee Management**: CRUD Route Handlers, Directory UI, Search, Filters, Self-edit restrictions, Activate/Deactivate toggle.
- **Phase 5 — Attendance**: Check-in, Check-out, History, HR view, Manager team view, Edge case rules.
- **Phase 6 — Leave**: Apply, View, Approve, Reject, Rejection reason, Overlap validation, Self-approval block, Pending cancellation.
- **Phase 7 — Dashboards**: HR_ADMIN, MANAGER, EMPLOYEE dynamic database-driven metrics.
- **Phase 8 — Security & Validation**: Comprehensive testing for IDOR, role escalation, team boundaries, and edge cases.
- **Phase 9 — UI/UX**: Responsive layout, Loading skeletons, Empty states, Error states, Toast alerts, Dialogs.
- **Phase 10 — Documentation & Deployment**: README.md, AI Development Process report, Demo credentials documentation, Vercel deployment setup, Final verification.
