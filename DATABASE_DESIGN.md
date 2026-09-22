# DATABASE DESIGN: Mini HRMS

**Project:** Mini HRMS  
**ORM:** Prisma ORM  
**Database System:** PostgreSQL  

---

## 1. Entity Relationship Diagram (Conceptual)

```
 ┌──────────────────────┐         1:1         ┌────────────────────────┐
 │         User         ├─────────────────────┤        Employee        │
 ├──────────────────────┤                     ├────────────────────────┤
 │ id (PK)              │                     │ id (PK)                │
 │ email (UQ)           │                     │ employeeCode (UQ)      │
 │ passwordHash         │                     │ fullName               │
 │ role (ENUM)          │                     │ email (UQ)             │
 │ employeeId (FK, UQ)  │                     │ phone                  │
 └──────────────────────┘                     │ department             │
                                              │ designation            │
                                              │ managerId (FK) ────────┼──┐ (Self-ref: Manager -> Direct Reports)
                                              │ joiningDate            │  │
                                              │ status (ENUM)          │◄─┘
                                              └──────────┬─────────────┘
                                                         │
                                   ┌─────────────────────┴─────────────────────┐
                                   │ 1:N                                       │ 1:N
                                   ▼                                           ▼
                       ┌───────────────────────┐                   ┌───────────────────────┐
                       │      Attendance       │                   │     LeaveRequest      │
                       ├───────────────────────┤                   ├───────────────────────┤
                       │ id (PK)               │                   │ id (PK)               │
                       │ employeeId (FK)       │                   │ employeeId (FK)       │
                       │ date (DateTime)       │                   │ leaveType (ENUM)      │
                       │ checkIn (DateTime?)   │                   │ startDate (DateTime)  │
                       │ checkOut (DateTime?)  │                   │ endDate (DateTime)    │
                       │ status (ENUM)         │                   │ reason (Text)         │
                       └───────────────────────┘                   │ status (ENUM)         │
                       Constraint: UQ(employeeId, date)            │ rejectionReason       │
                                                                   │ reviewedById (FK?)    │
                                                                   │ reviewedAt (DateTime?)│
                                                                   └───────────────────────┘
```

---

## 2. Prisma Schema Definition (`prisma/schema.prisma`)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  HR_ADMIN
  MANAGER
  EMPLOYEE
}

enum EmploymentStatus {
  ACTIVE
  INACTIVE
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  HALF_DAY
  LEAVE
}

enum LeaveType {
  CASUAL
  SICK
  ANNUAL
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  passwordHash String
  role         Role      @default(EMPLOYEE)
  employeeId   String    @unique
  employee     Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Employee {
  id             String           @id @default(uuid())
  employeeCode   String           @unique
  fullName       String
  email          String           @unique
  phone          String
  department     String
  designation    String
  joiningDate    DateTime
  status         EmploymentStatus @default(ACTIVE)
  
  // Self-referential relation for Manager -> Subordinates
  managerId      String?
  manager        Employee?        @relation("ManagerSubordinates", fields: [managerId], references: [id], onDelete: SetNull)
  subordinates   Employee[]       @relation("ManagerSubordinates")
  
  // Relations
  user           User?
  attendances    Attendance[]
  leaveRequests  LeaveRequest[]   @relation("EmployeeLeaveRequests")
  reviewedLeaves LeaveRequest[]   @relation("ReviewedLeaveRequests")

  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @updatedAt

  @@index([managerId])
  @@index([department])
  @@index([status])
}

model Attendance {
  id         String           @id @default(uuid())
  employeeId String
  employee   Employee         @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date       DateTime         // Store normalized IST start-of-day date (00:00:00 UTC)
  checkIn    DateTime?
  checkOut   DateTime?
  status     AttendanceStatus @default(PRESENT)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  // Unique constraint ensures max 1 attendance record per employee per calendar date
  @@unique([employeeId, date])
  @@index([employeeId, date])
}

model LeaveRequest {
  id              String      @id @default(uuid())
  employeeId      String
  employee        Employee    @relation("EmployeeLeaveRequests", fields: [employeeId], references: [id], onDelete: Cascade)
  leaveType       LeaveType   @default(CASUAL)
  startDate       DateTime
  endDate         DateTime
  reason          String
  status          LeaveStatus @default(PENDING)
  rejectionReason String?
  
  reviewedById    String?
  reviewedBy      Employee?   @relation("ReviewedLeaveRequests", fields: [reviewedById], references: [id], onDelete: SetNull)
  reviewedAt      DateTime?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  @@index([employeeId])
  @@index([status])
  @@index([startDate, endDate])
}
```

---

## 3. Database Indexes & Integrity Constraints

1. **Unique Index `@@unique([employeeId, date])` in Attendance**:
   - Enforces database-level protection against duplicate attendance entries on the same date.
2. **Foreign Key Cascade Deletions**:
   - Deleting an Employee cascades deletion to User, Attendance, and LeaveRequest records.
   - Manager deletion sets `managerId = NULL` for subordinates without deleting subordinate profiles (`onDelete: SetNull`).
3. **Lookup Performance Indexes**:
   - `Employee.managerId` index for ultra-fast team lookup queries.
   - `LeaveRequest(employeeId, status)` composite index for dashboard counter aggregations.

---

## 4. Seed Data Plan & Demo Credentials

The database seed (`prisma/seed.ts`) populates the system with structured hierarchy:

| Account Role | Email | Password | Employee Name | Department | Designation | Manager |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **HR / Admin** | `hr@company.com` | `Password123!` | Sarah Jenkins | Human Resources | HR Director | *None* |
| **Manager A** | `manager.a@company.com` | `Password123!` | Alex Rivera | Engineering | Tech Lead | Sarah Jenkins |
| **Manager B** | `manager.b@company.com` | `Password123!` | Priya Sharma | Marketing | Marketing Lead | Sarah Jenkins |
| **Employee A** | `employee.a@company.com` | `Password123!` | John Doe | Engineering | Senior Developer | Alex Rivera |
| **Employee B** | `employee.b@company.com` | `Password123!` | Jane Smith | Engineering | Frontend Engineer | Alex Rivera |
| **Employee C** | `employee.c@company.com` | `Password123!` | Bob Johnson | Engineering | QA Engineer | Alex Rivera |
| **Employee D** | `employee.d@company.com` | `Password123!` | Emily Davis | Marketing | Content Specialist | Priya Sharma |
| **Employee E** | `employee.e@company.com` | `Password123!` | Michael Lee | Marketing | SEO Specialist | Priya Sharma |
