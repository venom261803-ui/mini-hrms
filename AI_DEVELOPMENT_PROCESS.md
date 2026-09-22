# AI DEVELOPMENT PROCESS & CODE REVIEW REPORT

**Project:** Mini HRMS  
**Assessment:** AppTrait Solutions - Vibe Coder Practical Assessment  
**AI Pair Engineer:** Antigravity (Google DeepMind)  

---

## 1. AI Prompting Strategy & Evaluation Overview

The Mini HRMS application is built following a strict **Understand → Plan → Prompt → Build → Review → Debug → Test → Improve → Ship** development lifecycle. Rather than using AI to generate an unverified monolithic codebase, AI prompting was systematically scoped to individual components, database schemas, authorization guards, and validation handlers.

---

## 2. 5 Documented AI Prompts

### Prompt 1: Database Schema & Relational Modeling
- **Prompt**:  
  *"Design a Prisma schema for a PostgreSQL database for a Mini HRMS supporting User, Employee, Attendance, and LeaveRequest entities. Include self-referential relations for Manager to Subordinates, unique constraint on employeeId + date for Attendance, proper status enums, and cascade deletion rules."*
- **Why Used**:  
  To quickly generate a type-safe database schema adhering to relational integrity constraints and database-level unique guards.
- **AI Approach/Output**:  
  Generated models for `User`, `Employee`, `Attendance`, and `LeaveRequest` with Prisma enums (`Role`, `EmploymentStatus`, `AttendanceStatus`, `LeaveType`, `LeaveStatus`).
- **What Was Accepted**:  
  - Enums and self-referential `Employee` relation (`managerId` -> `subordinates`).
  - `@@unique([employeeId, date])` in `Attendance`.
- **What Was Modified**:  
  - Changed `Attendance.date` field to store normalized start-of-day IST date timestamps to prevent timezone mismatch duplicates.
- **What Was Rejected**:  
  - Rejected AI's attempt to store plain `password` string on `Employee` model directly; kept sensitive `passwordHash` strictly on `User` entity.
- **Validation**:  
  Ran `npx prisma validate` and verified schema compilation.

---

### Prompt 2: Session JWT & Middleware Auth Engine
- **Prompt**:  
  *"Create a lightweight JWT session authentication utility and Next.js 15 App Router middleware using the `jose` library and `bcryptjs`. It must store an HttpOnly cookie named `hrms_session` with SameSite=Lax and protect routes /dashboard, /employees, /attendance, /leave, /profile."*
- **Why Used**:  
  Next.js 15 Middleware runs on Edge Runtime where standard Node.js crypto libraries like `jsonwebtoken` or native `crypto` can throw runtime exceptions.
- **AI Approach/Output**:  
  Provided `src/lib/auth.ts` using `jose` `SignJWT` / `jwtVerify` and Next.js `middleware.ts` reading request cookies and parsing session state.
- **What Was Accepted**:  
  - Edge-compatible `jose` token signing and cookie reading logic.
- **What Was Modified**:  
  - Added role hierarchy checks to middleware so non-HR users visiting `/employees/new` are immediately redirected to `/dashboard` with an alert parameter.
- **What Was Rejected**:  
  - Rejected storing full user entity in JWT payload; restricted payload to minimal claims `{ id, email, role, employeeId }`.
- **Validation**:  
  Manual login test, verified HTTP-Only flag on set cookie in browser devtools.

---

### Prompt 3: Overlapping Leave Detection Query
- **Prompt**:  
  *"Write a Prisma query and Zod validation function to check if a new leave request (startDate to endDate) overlaps with any existing PENDING or APPROVED leave request for the same employee."*
- **Why Used**:  
  Date range overlap checking is an algorithmic edge case prone to off-by-one errors.
- **AI Approach/Output**:  
  Provided query filtering `employeeId`, `status: { in: ['PENDING', 'APPROVED'] }` with overlap condition `startDate <= newEndDate AND endDate >= newStartDate`.
- **What Was Accepted**:  
  - The mathematical condition `existingStartDate <= requestedEndDate AND existingEndDate >= requestedStartDate`.
- **What Was Modified**:  
  - Extended check to reject submission if `endDate < startDate`.
- **What Was Rejected**:  
  - Rejected AI's initial recommendation to check overlap on client-side state only; enforced check inside PostgreSQL transaction on backend route handler.
- **Validation**:  
  Tested submitting overlapping dates (e.g. Existing: Oct 1-5, New Attempt: Oct 4-7) and confirmed `400 Bad Request` with message `"Leave request dates overlap with an existing request."`.

---

### Prompt 4: Dynamic Dashboard Metrics Service
- **Prompt**:  
  *"Write a service function `getDashboardStats(user: UserSession)` that executes database aggregation queries to return KPI cards for HR_ADMIN, MANAGER, and EMPLOYEE roles without hardcoding any values."*
- **Why Used**:  
  Dashboard queries require parallel database aggregation based on user role boundaries.
- **AI Approach/Output**:  
  Used `Promise.all` with Prisma `count()` and `findMany()` calls scoped by user role.
- **What Was Accepted**:  
  - Parallel query execution strategy with `Promise.all`.
- **What Was Modified**:  
  - Adjusted "Present Today" query to filter attendance records matching normalized current date in IST timezone.
- **What Was Rejected**:  
  - Rejected fetching all records into JavaScript memory to filter counts; forced filtering in SQL `WHERE` clauses.
- **Validation**:  
  Cross-verified dashboard metric counts against direct SQL queries in Prisma Studio.

---

### Prompt 5: Standardized API Error Response & Edge Case Handlers
- **Prompt**:  
  *"Create a custom API error handling wrapper that catches Zod validation errors, Prisma database constraint violations, and security authorization exceptions, returning uniform JSON error responses `{ error: string, details?: any }`."*
- **Why Used**:  
  To ensure all edge-case rejections return standard HTTP status codes (`400`, `401`, `403`, `404`, `500`) and clean human-readable error messages for client toasts.
- **AI Approach/Output**:  
  Created `handleApiError` utility mapping exception instances to status codes.
- **What Was Accepted**:  
  - Mapping Zod `ZodError` to `400 Bad Request` and `AuthError` to `403 Forbidden`.
- **What Was Modified**:  
  - Added specific message override for Prisma `P2002` unique constraint violation on `[employeeId, date]` to return `"You have already checked in today."`.
- **What Was Rejected**:  
  - Rejected dumping raw database stack trace logs to client responses.
- **Validation**:  
  Triggered deliberate duplicate check-ins and invalid dates, verifying toast error rendering.

---

## 3. AI Code Review & Challenge Analysis (2 Required Cases)

### Case 1: Edge Runtime Incompatibility in Auth Middleware
- **AI Generated Code**:
  ```typescript
  // AI initially generated auth verification using jsonwebtoken & crypto
  import jwt from 'jsonwebtoken';
  export function verifyToken(token: string) {
    return jwt.verify(token, process.env.JWT_SECRET!);
  }
  ```
- **Problem**:  
  When executed inside Next.js 15 `middleware.ts`, `jsonwebtoken` depends on Node.js native `crypto` module, which is unavailable in the Next.js Edge Runtime. This caused runtime errors (`Dynamic Code Evaluation / Module not found: crypto`).
- **How Discovered**:  
  Attempting to run `npm run dev` and navigate to protected route `/dashboard` caused Next.js server compilation failure.
- **Fix**:  
  Replaced `jsonwebtoken` with Web Crypto API compliant `jose` library:
  ```typescript
  import { jwtVerify } from 'jose';
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  export async function verifySessionToken(token: string) {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  }
  ```
- **Validation**:  
  Successfully started dev server, navigated between public and protected routes without Edge runtime crashes.

---

### Case 2: Self-Approval Authorization Vulnerability in Leave Review API
- **AI Generated Code**:
  ```typescript
  // AI generated leave review route handler:
  export async function PATCH(req: Request) {
    const session = await requireAuth();
    if (session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'Employees cannot approve leave' }, { status: 403 });
    }
    // AI directly proceeded to approve/reject request without checking if session user is applicant!
    await prisma.leaveRequest.update({ ... });
  }
  ```
- **Problem**:  
  The AI-generated code allowed an HR/Admin user or a Manager to approve or reject **their own** leave request if they submitted one, violating the explicit business security requirement: *"Employee/User must never be able to approve their own leave."*
- **How Discovered**:  
  Discovered during security review of the permission matrix against the assessment security rules.
- **Fix**:  
  Added an explicit ownership check preventing self-review regardless of role:
  ```typescript
  const targetRequest = await prisma.leaveRequest.findUnique({ where: { id: leaveRequestId } });
  if (targetRequest.employeeId === session.employeeId) {
    return NextResponse.json(
      { error: "Forbidden: You cannot approve or reject your own leave request." },
      { status: 403 }
    );
  }
  ```
- **Validation**:  
  Logged in as Manager A, submitted a leave request, attempted to approve own request via API; verified system rejected action with HTTP `403 Forbidden`.
