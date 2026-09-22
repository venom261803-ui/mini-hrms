# API PERMISSION MATRIX & SECURITY BOUNDARY MATRIX

**Project:** Mini HRMS  
**Target:** AppTrait Solutions Practical Assessment  

---

## 1. Overview & Security Philosophy

In the Mini HRMS, **frontend UI element hiding is strictly treated as UX optimization, NOT security**. 
Every single API endpoint and Server Action enforces server-side authentication, role authorization, resource ownership, team relationship verification, and business state checks before executing any database mutation or query.

---

## 2. Comprehensive API Endpoint Permission Matrix

| Endpoint | Method | Required Roles | Ownership / Boundary Constraint | Error Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | None | `401 Unauthorized` |
| `/api/auth/logout` | `POST` | Authenticated | Must have valid session cookie | `401 Unauthorized` |
| `/api/auth/me` | `GET` | Authenticated | Returns logged-in user profile | `401 Unauthorized` |
| `/api/employees` | `GET` | `HR_ADMIN`, `MANAGER` | `HR_ADMIN`: All records<br>`MANAGER`: Filtered by `managerId == caller.employeeId`<br>`EMPLOYEE`: Denied | `403 Forbidden` |
| `/api/employees` | `POST` | `HR_ADMIN` | Restrict creation to `HR_ADMIN` only | `403 Forbidden` |
| `/api/employees/[id]` | `GET` | `HR_ADMIN`, `MANAGER`, `EMPLOYEE` | `HR_ADMIN`: Any ID<br>`MANAGER`: Direct team reports only<br>`EMPLOYEE`: Own ID (`id == caller.employeeId`) only | `403 Forbidden` / `404 Not Found` |
| `/api/employees/[id]` | `PATCH` | `HR_ADMIN`, `EMPLOYEE` | `HR_ADMIN`: Full field edit<br>`EMPLOYEE`: Own ID only (`phone`, `email` fields allowed only)<br>`MANAGER`: Denied | `403 Forbidden` |
| `/api/employees/[id]/status` | `PATCH` | `HR_ADMIN` | Restrict status toggle (`ACTIVE`/`INACTIVE`) to `HR_ADMIN` only | `403 Forbidden` |
| `/api/attendance/check-in` | `POST` | `EMPLOYEE`, `MANAGER`, `HR_ADMIN` | Validates caller account is `ACTIVE`, caller does NOT have approved leave today, caller has no prior check-in today | `400 Bad Request` / `403 Forbidden` |
| `/api/attendance/check-out` | `POST` | `EMPLOYEE`, `MANAGER`, `HR_ADMIN` | Validates caller account is `ACTIVE`, caller checked in today, caller has no prior check-out today | `400 Bad Request` / `403 Forbidden` |
| `/api/attendance` | `GET` | Authenticated | `HR_ADMIN`: All attendance records<br>`MANAGER`: Team attendance records<br>`EMPLOYEE`: Own attendance history | `403 Forbidden` |
| `/api/leave` | `POST` | Authenticated Active | Validates caller account is `ACTIVE`, `endDate >= startDate`, no overlapping `PENDING`/`APPROVED` leave | `400 Bad Request` / `403 Forbidden` |
| `/api/leave` | `GET` | Authenticated | `HR_ADMIN`: All requests<br>`MANAGER`: Team leave requests<br>`EMPLOYEE`: Own leave requests | `403 Forbidden` |
| `/api/leave/[id]` | `GET` | Authenticated | `HR_ADMIN`: Any request<br>`MANAGER`: Team requests only<br>`EMPLOYEE`: Own requests only | `403 Forbidden` |
| `/api/leave/[id]/review` | `PATCH` | `HR_ADMIN`, `MANAGER` | `HR_ADMIN`: Any request EXCEPT own request<br>`MANAGER`: Team requests EXCEPT own request<br>`EMPLOYEE`: Denied<br>Requires `rejectionReason` if rejecting | `403 Forbidden` / `400 Bad Request` |
| `/api/leave/[id]/cancel` | `PATCH` | Authenticated | `EMPLOYEE`: Can cancel ONLY own request if status is `PENDING`<br>`MANAGER`/`HR`: Can cancel pending team/all requests | `403 Forbidden` / `400 Bad Request` |
| `/api/dashboard` | `GET` | Authenticated | Returns dynamically queried metrics based on caller role scope | `401 Unauthorized` |

---

## 3. Server Authorization Helper Contracts

The backend service layer relies on four standardized security assertions in `@/lib/permissions`:

```typescript
// 1. Authenticate session token
export async function requireAuth(): Promise<UserSession>

// 2. Assert role eligibility
export function requireRole(user: UserSession, allowedRoles: Role[]): void

// 3. Prevent IDOR on Employee Profile Access
export function requireEmployeeAccess(user: UserSession, targetEmployeeId: string, targetManagerId?: string | null): void

// 4. Enforce Manager Team Scope & Self-Approval Prevention for Leave Reviews
export function requireLeaveReviewAccess(user: UserSession, leaveApplicantId: string, applicantManagerId?: string | null): void
```
