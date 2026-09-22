# APPLICATION FLOW & API DESIGN: Mini HRMS

**Project:** Mini HRMS  
**Architecture:** Next.js 15 App Router + Server Actions / Route Handlers  

---

## 1. Main User Flows

```
                   ┌───────────────────────────────┐
                   │    User visits Application    │
                   └───────────────┬───────────────┘
                                   │
                                   ▼
                   ┌───────────────────────────────┐
                   │ Is Authenticated Session JWT? │
                   └───────┬───────────────┬───────┘
                        NO │               │ YES
                           ▼               ▼
           ┌───────────────────┐       ┌─────────────────────────────────┐
           │ Redirect to /login│       │ Redirect to /dashboard          │
           └─────────┬─────────┘       └────────────────┬────────────────┘
                     │                                  │
                     ▼                                  ▼
           ┌───────────────────┐       ┌─────────────────────────────────┐
           │ Enter Credentials │       │ Role-Specific Dashboard Loaded: │
           └─────────┬─────────┘       │ - HR: Full Company Stats        │
                     │                 │ - Manager: Team Stats           │
                     ▼                 │ - Employee: Personal Stats      │
           ┌───────────────────┐       └────────────────┬────────────────┘
           │ Authenticate &    │                        │
           │ Set HTTP-Only     │                        ▼
           │ Session Cookie    │       ┌─────────────────────────────────┐
           └───────────────────┘       │ Access Navigation Sidebar Options│
                                       └─────────────────────────────────┘
```

---

## 2. Page Structure & Protected Route Access Matrix

| Route Path | Page Purpose | Authorized Roles | Unauthorized Access Handling |
| :--- | :--- | :--- | :--- |
| `/login` | Authentication Portal | Public / Unauthenticated | Redirects to `/dashboard` if logged in |
| `/dashboard` | Role-Customized Metrics Dashboard | All Roles (`HR_ADMIN`, `MANAGER`, `EMPLOYEE`) | Redirects to `/login` if unauthenticated |
| `/employees` | Employee Directory Table | `HR_ADMIN`, `MANAGER` | `EMPLOYEE` redirected to `/dashboard` |
| `/employees/new` | Add New Employee Form | `HR_ADMIN` | Non-HR redirected to `/dashboard` |
| `/employees/[id]` | Employee Profile Details | `HR_ADMIN`, `MANAGER` (if in team), `EMPLOYEE` (if own) | `403 Forbidden` / Redirect |
| `/employees/[id]/edit` | Edit Employee Form | `HR_ADMIN`, `EMPLOYEE` (if own profile) | `403 Forbidden` / Redirect |
| `/attendance` | Attendance Logs & Check-In Action | All Roles (UI adapts scope) | Redirects to `/login` if unauthenticated |
| `/leave` | Leave Applications & Approval Queue | All Roles (UI adapts scope) | Redirects to `/login` if unauthenticated |
| `/profile` | Current User Profile Quick View | All Roles | Redirects to `/login` if unauthenticated |

---

## 3. Complete API & Server Action Specification

### 3.1 Authentication endpoints
- **`POST /api/auth/login`**
  - **Auth Required**: No (Public)
  - **Payload**: `{ email: string, password: string }`
  - **Logic**: Validate email/password via Zod, fetch user, compare bcrypt password, mint JWT, set `HttpOnly` cookie.
  - **Response**: `200 OK` `{ user: { id, email, role, employeeId } }` or `401 Unauthorized`.
- **`POST /api/auth/logout`**
  - **Auth Required**: Yes
  - **Logic**: Clear session cookie `hrms_session`.
  - **Response**: `200 OK` `{ message: "Logged out" }`.
- **`GET /api/auth/me`**
  - **Auth Required**: Yes
  - **Response**: `200 OK` `{ user: UserSession }`.

### 3.2 Employee API
- **`GET /api/employees`**
  - **Auth Required**: `HR_ADMIN` or `MANAGER`
  - **Query Params**: `search`, `department`, `status`
  - **Logic**: If `MANAGER`, automatically appends `WHERE managerId = caller.employeeId`. If `HR_ADMIN`, queries all.
- **`POST /api/employees`**
  - **Auth Required**: `HR_ADMIN`
  - **Payload**: `{ employeeCode, fullName, email, phone, department, designation, managerId, joiningDate }`
  - **Logic**: Creates Employee + User record with hashed default password in a Prisma transaction.
- **`GET /api/employees/:id`**
  - **Auth Required**: `HR_ADMIN` or `MANAGER` (if direct report) or `EMPLOYEE` (if `id == self`).
- **`PATCH /api/employees/:id`**
  - **Auth Required**: `HR_ADMIN` (full edit) or `EMPLOYEE` (if self, phone/email only).
- **`PATCH /api/employees/:id/status`**
  - **Auth Required**: `HR_ADMIN`
  - **Payload**: `{ status: "ACTIVE" | "INACTIVE" }`

### 3.3 Attendance API
- **`POST /api/attendance/check-in`**
  - **Auth Required**: `EMPLOYEE`, `MANAGER`, `HR_ADMIN` (for own record)
  - **Logic**:
    1. Check employee status is `ACTIVE`.
    2. Check today is not within an `APPROVED` leave date range.
    3. Check no attendance record exists for today with `checkIn != null`.
    4. Create Attendance record with `status = PRESENT`, `checkIn = now()`.
- **`POST /api/attendance/check-out`**
  - **Auth Required**: Authenticated Employee
  - **Logic**:
    1. Fetch today's attendance record.
    2. Verify `checkIn != null` and `checkOut == null`.
    3. Calculate work duration. If `< 4 hours`, set `status = HALF_DAY`.
    4. Update record with `checkOut = now()`.
- **`GET /api/attendance`**
  - **Auth Required**: Authenticated
  - **Query Params**: `employeeId`, `date`, `startDate`, `endDate`
  - **Logic**: Filter records scoped by caller role (Self / Team / HR).

### 3.4 Leave API
- **`POST /api/leave`**
  - **Auth Required**: Authenticated Active Employee
  - **Payload**: `{ leaveType, startDate, endDate, reason }`
  - **Logic**:
    1. Check `endDate >= startDate`.
    2. Check no existing `PENDING` or `APPROVED` leave overlaps given dates.
    3. Create `LeaveRequest` with status `PENDING`.
- **`GET /api/leave`**
  - **Auth Required**: Authenticated
  - **Query Params**: `status`, `employeeId`
  - **Logic**: Scoped to self for Employee, team for Manager, all for HR.
- **`PATCH /api/leave/:id/review`**
  - **Auth Required**: `HR_ADMIN` or `MANAGER`
  - **Payload**: `{ action: "APPROVE" | "REJECT", rejectionReason?: string }`
  - **Logic**:
    1. Ensure caller is NOT the applicant (`target.employeeId !== caller.employeeId`).
    2. If `MANAGER`, verify `target.employee.managerId === caller.employeeId`.
    3. Update `LeaveRequest` status, `reviewedById`, `reviewedAt`, `rejectionReason`.
    4. If `APPROVED`, create/update Attendance records for those dates to `LEAVE`.

---

## 4. UI/UX State Handling Strategy

1. **Loading States**:
   - Next.js `loading.tsx` skeletons for page transitions.
   - Dynamic spinner inside action buttons during submission (Check-In, Submit Form, Approve/Reject).
2. **Empty States**:
   - Custom SVG illustrations / clean card placeholders when no employees, attendance, or leave requests are returned.
3. **Error Handling**:
   - API errors captured by Zod validation or try/catch blocks are transformed into standard error responses `{ error: string }`.
   - Client displays toast notifications using `sonner` / `shadcn` toast component.
4. **Confirmation Dialogs**:
   - Modal confirmation popups before activating/deactivating an employee or rejecting a leave request.
