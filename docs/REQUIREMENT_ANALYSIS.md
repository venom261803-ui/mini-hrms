# REQUIREMENT ANALYSIS: Mini HRMS

**Project:** Mini Human Resource Management System (HRMS)  
**Target:** Small SaaS Company  
**Assessment:** AppTrait Solutions - Vibe Coder Practical Assessment  

---

## 1. Executive Summary & Goals

The objective of this project is to build a functional, secure, robust, and maintainable Mini HRMS. Rather than building a bloated enterprise suite, the goal is to prioritize **reliable, testable and maintainable core functionality, strict backend security enforcement, comprehensive business edge-case handling, and clear architectural planning**.

Key Focus Areas:
- **Core Functionality First**: Auth, Protected Routes, Employee Management, Attendance, Leave Management, Role-specific Dashboards.
- **Strict Security Architecture**: Backend authorization checks for every single API endpoint and Route Handler (protecting against IDOR, URL manipulation, unauthorized team actions, self-approvals).
- **Edge-Case Business Logic**: Full handling for overlapping leave, date validations, duplicate attendance, check-out without check-in, inactive employee locks.
- **Transparent AI Development**: Detailed documentation of AI usage, prompt strategies, and code review corrections.

---

## 2. User Roles & Permission Matrix

The application supports three distinct user roles: **HR_ADMIN**, **MANAGER**, and **EMPLOYEE**.

| Feature / Action | HR_ADMIN | MANAGER | EMPLOYEE | Security Rule / Constraint |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication (Login/Logout)** | Yes | Yes | Yes | Session token in HTTP-only Cookie |
| **View All Employees** | Yes | No | No | Manager/Employee blocked at API layer |
| **View Team Employees** | Yes | Yes (Assigned Team) | No | Manager can ONLY view `managerId == manager.employeeId` |
| **View Own Profile** | Yes | Yes | Yes | Employee can only access own profile data |
| **Add Employee** | Yes | No | No | Restricted to `HR_ADMIN` |
| **Edit Employee** | Yes | No | Own Allowed Fields | Employee restricted to phone/email update |
| **Activate/Deactivate Employee** | Yes | No | No | Deactivated employees lose system access |
| **Mark Attendance (Check In/Out)** | ❌ | ❌ | Yes | Requires `ACTIVE` status; no duplicate check-ins |
| **View Attendance** | All Employees | Team Only | Own Only | Filtered at database query layer |
| **Apply for Leave** | Yes | Yes | Yes | Validates leave type, dates, reason, employee status and overlapping requests |
| **Approve Leave Request** | All* | Team Only* | No | HR/Manager cannot approve own leave; Employee cannot approve any leave |
| **Reject Leave Request** | All* | Team Only* | No | Rejection reason required; HR/Manager cannot reject own leave |
| **View Dashboards** | HR Metrics | Team Metrics | Personal Metrics | All counts dynamically queried from DB |

*\* Note on Approval Rules:*
- **HR_ADMIN & MANAGER**: Cannot approve or reject their own leave requests.
- **EMPLOYEE**: Cannot approve or reject any leave request.

---

## 3. Explicit API Permission Matrix

| API Endpoint | HR_ADMIN | MANAGER | EMPLOYEE | Security & Ownership Constraint |
| :--- | :---: | :---: | :---: | :--- |
| `GET /api/employees` | ✅ | ❌ | ❌ | HR_ADMIN only |
| `POST /api/employees` | ✅ | ❌ | ❌ | HR_ADMIN only |
| `GET /api/employees/[id]` | Any | Team only | Own | IDOR protected: Manager team scope, Employee self scope |
| `PATCH /api/employees/[id]` | Any | ❌ | Own allowed fields | Employee restricted to `email` & `phone` |
| `PATCH /api/employees/[id]/status` | ✅ | ❌ | ❌ | HR_ADMIN only |
| `GET /api/attendance` | All | Team | Own | Role-scoped database filter |
| `POST /api/attendance/check-in` | ❌ | ❌ | Own | Active employees only; duplicate check-in blocked |
| `POST /api/attendance/check-out` | ❌ | ❌ | Own | Active employees only; check-in required |
| `POST /api/leave` | Own | Own | Own | Active employees only; overlap checks |
| `GET /api/leave` | All | Team | Own | Role-scoped database filter |
| `PATCH /api/leave/[id]/approve` | All* | Team* | ❌ | HR/Manager cannot approve own leave; Employee cannot approve any leave |
| `PATCH /api/leave/[id]/reject` | All* | Team* | ❌ | HR/Manager cannot reject own leave; rejectionReason required |

---

## 4. Core Functional Requirements

### 4.1 Authentication & Authorization
- **Login**: Email + Password authentication with bcrypt hashing.
- **Session Management**: JWT session stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Logout**: Clears cookie and redirects to `/login`.
- **Protected Routes**: Next.js Middleware guarding `/dashboard`, `/employees`, `/attendance`, `/leave`, `/profile`.
- **RBAC**: Middleware and backend helpers enforcing role permissions.

### 4.2 Employee Management (HR_ADMIN)
- **Employee CRUD**:
  - Add new employee (generates unique `employeeCode`, links to `User` account).
  - Edit employee details (department, designation, manager assignment, status).
  - View employee details.
  - Search by Name, Email, Employee ID.
  - Filter by Department, Designation, Employment Status (`ACTIVE` / `INACTIVE`).
  - Toggle status between `ACTIVE` and `INACTIVE`.

### 4.3 Attendance Management
- **Employee Check-in / Check-out**:
  - Single button check-in / check-out on Employee Dashboard or `/attendance`.
  - Records check-in time, check-out time, date, and status (`PRESENT`, `HALF_DAY`, `ABSENT`, `LEAVE`).
- **HR View**: Filter all records by employee and date.
- **Manager View**: Filter attendance for team members only.

### 4.4 Leave Management
- **Submit Request**: Select `leaveType` (`CASUAL`, `SICK`, `ANNUAL`, `UNPAID`), `startDate`, `endDate`, `reason`.
- **Review Requests**:
  - Manager sees team requests.
  - HR sees all requests.
  - Statuses: `PENDING`, `APPROVED`, `REJECTED`.
  - Rejection requires an explicit `rejectionReason`.

### 4.5 Role-Based Dashboards (Dynamic DB Driven)
- **HR_ADMIN Dashboard**: Total Employees, Active Employees, Present Today, Employees on Leave Today, Pending Leave Requests.
- **MANAGER Dashboard**: Total Team Members, Team Present Today, Team Members on Leave Today, Pending Approvals.
- **EMPLOYEE Dashboard**: Today's Attendance Status, Total Leave Requests, Pending, Approved, Rejected Requests, Recent Attendance.

---

## 5. Explicit Business Assumptions

1. **Leave Types**:
   - `CASUAL`, `SICK`, `ANNUAL`, `UNPAID`. (Implementation choice; not categorized in PDF).
2. **Employee Self-Editing Scope**:
   - Allowed fields: `email`, `phone`.
   - Locked fields (HR only): `employeeCode`, `department`, `designation`, `managerId`, `joiningDate`, `status`.
3. **Leave Cancellation**:
   - Only `PENDING` leave requests may be cancelled.
   - `APPROVED` and `REJECTED` requests cannot be cancelled directly by employees.
4. **Inactive Accounts**:
   - `INACTIVE` employees cannot: log in, check in, check out, or submit new leave requests.
5. **Attendance Status Calculation**:
   - `PRESENT`: Normal attendance created through check-in.
   - `LEAVE`: Approved leave covers the date.
   - `HALF_DAY`: Assigned manually by HR/Admin.
   - `ABSENT`: Assigned manually by HR/Admin.

---

## 6. Security Requirements & Security Test Cases

### Security Rules:
1. **Dual-Layer Authorization**: Frontend UI hiding + Strict Backend Route Handler verification.
2. **IDOR Prevention**: Accessing `/employees/[id]` verifies role, team assignment, or self ownership.
3. **Team Boundary Isolation**: Managers can view/review only direct reports (`WHERE managerId = caller.employeeId`).
4. **Self-Approval Prevention**: HR_ADMIN and MANAGER cannot approve/reject their own leave requests; EMPLOYEE cannot approve/reject any leave request.
5. **Inactive Employee Lockdown**: Blocked at authentication and route handler levels.

### Security Test Cases (Verification Checklist):
1. Employee A attempts to access Employee B details (`403 Forbidden`).
2. Employee A changes employee ID in API request URL (`403 Forbidden`).
3. Employee attempts to approve a leave request (`403 Forbidden`).
4. Employee attempts to reject a leave request (`403 Forbidden`).
5. Manager A attempts to access Manager B's team employee (`403 Forbidden`).
6. Manager A attempts to approve Manager B's team leave request (`403 Forbidden`).
7. Manager attempts to modify employee profile details (`403 Forbidden`).
8. Inactive employee attempts login (`403 Account Inactive`).
9. Inactive employee attempts check-in (`403 Account Inactive`).
10. Inactive employee attempts leave application (`403 Account Inactive`).
11. Unauthenticated user accesses protected API (`401 Unauthorized`).
12. User attempts to manipulate role field in HTTP request body (`Blocked / Ignored`).

---

## 7. Definition of Done

A feature is considered **DONE** only when all of the following pass review:
- [ ] **UI works**: Interface renders correctly with responsive layout.
- [ ] **API works**: Route Handler responds cleanly with correct HTTP status codes.
- [ ] **Database operation works**: Data persists accurately via Prisma ORM.
- [ ] **Authentication checked**: Valid session required.
- [ ] **Authorization checked**: Role, team ownership, and self-approval guards verified.
- [ ] **Validation implemented**: Zod schema validation active on server payload.
- [ ] **Business rules implemented**: Edge cases handled (overlap, duplicate check-in, dates).
- [ ] **Error handling implemented**: Human-readable error messages returned.
- [ ] **Loading state implemented**: UI displays loading spinner/skeleton.
- [ ] **Empty state implemented**: Clean fallback placeholder when no data exists.
- [ ] **Success feedback implemented**: Toast notification rendered upon success.
- [ ] **Unauthorized access tested**: Security test cases pass.

---

## 8. Implementation Priority Matrix

- **P0 — Must Work (Core System)**: Authentication, RBAC, Employee Management, Attendance, Leave Management, Role Dashboards, Security, Edge Cases.
- **P1 — Must Be Polished**: Zod Validation, Error Handling, Loading States, Empty States, Responsive UI, README, Planning docs, AI Development Process.
- **P2 — Only If Time Remains (Optional)**: Pagination, CSV Export, Leave Balance, Attendance Calendar, Profile Photo, Email Notifications, Audit Log, Dark Mode, Automated Tests.

---

## 9. Evaluation Criteria Alignment

| Evaluation Area | Weight | Compliance Strategy |
| :--- | :---: | :--- |
| **Requirement Understanding & Planning** | 15% | Comprehensive requirement analysis, database design, app flow, and implementation plan documents. |
| **Application Architecture** | 10% | Clean Next.js 15 App Router structure, Prisma ORM, Route Handler service layer, Zod validation. |
| **Core Functionality** | 20% | Fully working Auth, Employee CRUD, Attendance, Leave workflows, and dynamic DB dashboards. |
| **Business Logic & Edge Cases** | 15% | Pre-built validation handlers covering all edge cases with clear toast alerts. |
| **Authentication & Authorization** | 10% | Secure HTTP-only cookies, password hashing with bcrypt, RBAC middleware, and backend verification helpers. |
| **AI Usage & Prompting** | 10% | Clear AI development report documenting 5+ structured prompts and rationale. |
| **AI Code Review / Validation** | 10% | 2+ detailed cases highlighting AI hallucination/vulnerabilities caught and corrected by human review. |
| **UI/UX & Usability** | 5% | Clean dashboard layout with Tailwind CSS + shadcn/ui, responsive sidebar, status badges, loading skeletons, and empty states. |
| **Code Quality & Documentation** | 5% | TypeScript strict mode, clean code formatting, comprehensive README.md with setup instructions and demo credentials. |

---

## 10. Required Planning Documents

Before implementation, the project generates 5 core planning documents:

1. `REQUIREMENT_ANALYSIS.md`
2. `PLANNING.md`
3. `DATABASE_DESIGN.md`
4. `APPLICATION_FLOW.md`
5. `API_PERMISSION_MATRIX.md`

`PLANNING.md` specifically explains:
- Requirement breakdown
- Identified modules
- Application flow
- Database design
- Technology selection & reasons for technology selection
- Security approach
- Business assumptions
- Edge cases
- Implementation phases

---

## 11. Implementation Phases

- **Phase 1 — Project Foundation**: Next.js setup, TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, Database schema, Migration, Seed data.
- **Phase 2 — Authentication**: Login, Logout, Password hashing, Session, HTTP-only cookie, Protected routes.
- **Phase 3 — Authorization**: RBAC, Role guards, Resource ownership, Manager team isolation, API security.
- **Phase 4 — Employee Management**: CRUD, Search, Filters, Activate/deactivate.
- **Phase 5 — Attendance**: Check-in, Check-out, History, HR view, Manager team view, Edge cases.
- **Phase 6 — Leave**: Apply, View, Approve, Reject, Rejection reason, Overlap validation, Edge cases.
- **Phase 7 — Dashboards**: HR, Manager, Employee database-driven metrics.
- **Phase 8 — Security & Validation**: IDOR testing, Role testing, Team boundary testing, Edge-case testing.
- **Phase 9 — UI/UX**: Responsive layout, Loading states, Empty states, Error states, Toasts.
- **Phase 10 — Documentation & Deployment**: README, AI Development Process, Demo credentials, Deployment, Final testing.
