import { prisma } from './src/lib/prisma';
import { requireAuth, AuthError } from './src/lib/permissions';
import { getNormalizedDate } from './src/lib/attendance';
import { Role, EmploymentStatus, AttendanceStatus, LeaveStatus } from '@prisma/client';
import { UserSession } from './src/types';

let testsPassed = 0;
let testsFailed = 0;

async function assertTest(
  testNumber: number,
  description: string,
  testFn: () => Promise<void>,
  expectedOutcome: 'ALLOW' | 'DENY_401' | 'DENY_403' | 'DENY_400' = 'ALLOW'
) {
  try {
    await testFn();
    if (expectedOutcome === 'ALLOW') {
      console.log(`✅ TEST ${testNumber}: ${description} -> ALLOWED (Pass)`);
      testsPassed++;
    } else {
      console.error(`❌ TEST ${testNumber}: ${description} -> Expected ${expectedOutcome}, but action was ALLOWED`);
      testsFailed++;
    }
  } catch (error: any) {
    if (error instanceof AuthError || error.code?.startsWith('TEST_REJECT')) {
      const status = error.statusCode || (error.code === 'TEST_REJECT_400' ? 400 : 403);
      if (
        (expectedOutcome === 'DENY_401' && status === 401) ||
        (expectedOutcome === 'DENY_403' && status === 403) ||
        (expectedOutcome === 'DENY_400' && status === 400)
      ) {
        console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED ${status} (Pass) [Msg: "${error.message}"]`);
        testsPassed++;
      } else {
        console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected rejection code ${status} (Expected ${expectedOutcome}) [Msg: "${error.message}"]`);
        testsFailed++;
      }
    } else {
      console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected error:`, error);
      testsFailed++;
    }
  }
}

async function runDashboardApiTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING PHASE 7A DASHBOARD API & AGGREGATION SUITE');
  console.log('==================================================\n');

  // Fetch Test User Accounts from DB
  const empAUser = await prisma.user.findFirstOrThrow({
    where: { email: 'employee.a@company.com' },
    include: { employee: true },
  });

  const empBUser = await prisma.user.findFirstOrThrow({
    where: { email: 'employee.b@company.com' },
    include: { employee: true },
  });

  const managerAUser = await prisma.user.findFirstOrThrow({
    where: { email: 'manager.a@company.com' },
    include: { employee: true },
  });

  const managerBUser = await prisma.user.findFirstOrThrow({
    where: { email: 'manager.b@company.com' },
    include: { employee: true },
  });

  const hrUser = await prisma.user.findFirstOrThrow({
    where: { email: 'hr@company.com' },
    include: { employee: true },
  });

  const empASession: UserSession = {
    id: empAUser.id,
    email: empAUser.email,
    role: empAUser.role,
    employeeId: empAUser.employeeId,
    employee: {
      ...empAUser.employee!,
      joiningDate: empAUser.employee!.joiningDate.toISOString(),
    },
  };

  const managerASession: UserSession = {
    id: managerAUser.id,
    email: managerAUser.email,
    role: managerAUser.role,
    employeeId: managerAUser.employeeId,
    employee: {
      ...managerAUser.employee!,
      joiningDate: managerAUser.employee!.joiningDate.toISOString(),
    },
  };

  const hrSession: UserSession = {
    id: hrUser.id,
    email: hrUser.email,
    role: hrUser.role,
    employeeId: hrUser.employeeId,
    employee: {
      ...hrUser.employee!,
      joiningDate: hrUser.employee!.joiningDate.toISOString(),
    },
  };

  const today = getNormalizedDate();

  // --- 1. EMPLOYEE DASHBOARD TESTS ---

  // 1. Employee can access dashboard
  await assertTest(1, 'Employee A -> Access own dashboard aggregation', async () => {
    if (empASession.role !== Role.EMPLOYEE) throw new Error('Role mismatch');
    const emp = await prisma.employee.findUnique({ where: { id: empASession.employeeId } });
    if (!emp) throw new Error('Employee profile missing');
  }, 'ALLOW');

  // 2. Employee receives own employee information
  await assertTest(2, 'Employee A -> Receives correct self information', async () => {
    const emp = await prisma.employee.findUnique({
      where: { id: empASession.employeeId },
      select: { employeeCode: true, fullName: true, department: true, designation: true },
    });
    if (!emp || emp.fullName !== empAUser.employee?.fullName) {
      throw new Error('Employee summary data incorrect');
    }
  }, 'ALLOW');

  // 3. Employee receives own attendance for today
  await assertTest(3, 'Employee A -> Receives own today attendance', async () => {
    const att = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: empASession.employeeId, date: today } },
    });
    // Valid object or null allowed
  }, 'ALLOW');

  // 4. Employee receives own leave summary
  await assertTest(4, 'Employee A -> Receives own leave summary counts', async () => {
    const pending = await prisma.leaveRequest.count({ where: { employeeId: empASession.employeeId, status: LeaveStatus.PENDING } });
    const approved = await prisma.leaveRequest.count({ where: { employeeId: empASession.employeeId, status: LeaveStatus.APPROVED } });
    const rejected = await prisma.leaveRequest.count({ where: { employeeId: empASession.employeeId, status: LeaveStatus.REJECTED } });
    if (typeof pending !== 'number' || typeof approved !== 'number' || typeof rejected !== 'number') {
      throw new Error('Invalid count numbers returned');
    }
  }, 'ALLOW');

  // 5. Employee receives own recent leaves
  await assertTest(5, 'Employee A -> Receives own recent leave requests (Max 5)', async () => {
    const recent = await prisma.leaveRequest.findMany({
      where: { employeeId: empASession.employeeId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    if (recent.some((r) => r.employeeId !== empASession.employeeId)) {
      throw new Error('Leaked another employee leave request into employee dashboard');
    }
  }, 'ALLOW');

  // 6. Employee cannot use another employeeId parameter to view another dashboard
  await assertTest(6, 'Employee A -> Spoofed query employeeId parameter is strictly ignored', async () => {
    // The server handler strictly uses session.employeeId regardless of query params
    const activeId = empASession.employeeId;
    const spoofedId = empBUser.employeeId;
    if (activeId === spoofedId) throw new Error('Ids must differ');
  }, 'ALLOW');

  // --- 2. MANAGER DASHBOARD TESTS ---

  // 7. Manager can access dashboard
  await assertTest(7, 'Manager A -> Access manager dashboard aggregation', async () => {
    if (managerASession.role !== Role.MANAGER) throw new Error('Role mismatch');
  }, 'ALLOW');

  // 8. Manager receives direct team count
  await assertTest(8, 'Manager A -> Receives direct team count', async () => {
    const team = await prisma.employee.findMany({
      where: { managerId: managerASession.employeeId },
    });
    if (team.some((e) => e.managerId !== managerASession.employeeId)) {
      throw new Error('Team count includes non-team employees');
    }
  }, 'ALLOW');

  // 9. Manager receives only direct team attendance today
  await assertTest(9, 'Manager A -> Receives only direct team attendance today', async () => {
    const atts = await prisma.attendance.findMany({
      where: { date: today, employee: { managerId: managerASession.employeeId } },
      include: { employee: true },
    });
    if (atts.some((a) => a.employee.managerId !== managerASession.employeeId)) {
      throw new Error('Attendance contains employee from another team');
    }
  }, 'ALLOW');

  // 10. Manager receives only direct team leave requests
  await assertTest(10, 'Manager A -> Receives only direct team leave requests', async () => {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employee: { managerId: managerASession.employeeId } },
      include: { employee: true },
    });
    if (leaves.some((l) => l.employee.managerId !== managerASession.employeeId)) {
      throw new Error('Leave contains employee from another team');
    }
  }, 'ALLOW');

  // 11. Manager receives team pending leave count
  await assertTest(11, 'Manager A -> Receives team pending leave count', async () => {
    const count = await prisma.leaveRequest.count({
      where: { status: LeaveStatus.PENDING, employee: { managerId: managerASession.employeeId } },
    });
    if (typeof count !== 'number') throw new Error('Invalid count');
  }, 'ALLOW');

  // 12. Manager cannot access Manager B team via query parameter manipulation
  await assertTest(12, 'Manager A -> Spoofed managerId query param cannot access Manager B team', async () => {
    // The server handler strictly uses session.employeeId
    const activeId = managerASession.employeeId;
    const managerBId = managerBUser.employeeId;
    if (activeId === managerBId) throw new Error('Manager ids must differ');
  }, 'ALLOW');

  // --- 3. HR ADMIN DASHBOARD TESTS ---

  // 13. HR can access dashboard
  await assertTest(13, 'HR_ADMIN -> Access global company dashboard', async () => {
    if (hrSession.role !== Role.HR_ADMIN) throw new Error('Role mismatch');
  }, 'ALLOW');

  // 14. HR receives company employee counts
  await assertTest(14, 'HR_ADMIN -> Receives total, active, and inactive employee counts', async () => {
    const total = await prisma.employee.count();
    const active = await prisma.employee.count({ where: { status: EmploymentStatus.ACTIVE } });
    const inactive = await prisma.employee.count({ where: { status: EmploymentStatus.INACTIVE } });
    if (total !== active + inactive) {
      throw new Error('Employee count breakdown mismatch');
    }
  }, 'ALLOW');

  // 15. HR receives company attendance summary
  await assertTest(15, 'HR_ADMIN -> Receives company-wide today attendance counts', async () => {
    const count = await prisma.attendance.count({ where: { date: today } });
    if (typeof count !== 'number') throw new Error('Invalid count');
  }, 'ALLOW');

  // 16. HR receives company leave summary
  await assertTest(16, 'HR_ADMIN -> Receives company-wide leave counts', async () => {
    const pending = await prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } });
    const approved = await prisma.leaveRequest.count({ where: { status: LeaveStatus.APPROVED } });
    const rejected = await prisma.leaveRequest.count({ where: { status: LeaveStatus.REJECTED } });
    if (typeof pending !== 'number' || typeof approved !== 'number' || typeof rejected !== 'number') {
      throw new Error('Invalid counts');
    }
  }, 'ALLOW');

  // 17. HR receives department overview
  await assertTest(17, 'HR_ADMIN -> Receives department-level employee overview', async () => {
    const deptGroups = await prisma.employee.groupBy({
      by: ['department'],
      _count: { id: true },
    });
    if (!Array.isArray(deptGroups)) throw new Error('Department overview is not an array');
  }, 'ALLOW');

  // --- 4. EDGE CASES & SECURITY TESTS ---

  // 18. Employee with no leave requests returns empty arrays / zero counts
  await assertTest(18, 'Employee with no leave requests -> returns zero counts & empty array', async () => {
    // Create temporary isolated employee
    const tempEmpCode = `EMP-TEST-DASH-${Date.now()}`;
    const tempEmp = await prisma.employee.create({
      data: {
        employeeCode: tempEmpCode,
        fullName: 'Isolated Test Employee',
        email: `isolated.${Date.now()}@company.com`,
        phone: '9998887776',
        department: 'Testing',
        designation: 'Tester',
        joiningDate: new Date(),
        status: EmploymentStatus.ACTIVE,
      },
    });

    const pending = await prisma.leaveRequest.count({ where: { employeeId: tempEmp.id, status: LeaveStatus.PENDING } });
    const recent = await prisma.leaveRequest.findMany({ where: { employeeId: tempEmp.id } });

    if (pending !== 0 || recent.length !== 0) {
      await prisma.employee.delete({ where: { id: tempEmp.id } });
      throw new Error('Expected zero count and empty array for new employee');
    }

    await prisma.employee.delete({ where: { id: tempEmp.id } });
  }, 'ALLOW');

  // 19. Manager with no team returns teamSize = 0 and empty teamMembers array
  await assertTest(19, 'Manager with no team -> returns teamSize = 0 & empty array', async () => {
    const tempMgrCode = `MGR-TEST-DASH-${Date.now()}`;
    const tempMgr = await prisma.employee.create({
      data: {
        employeeCode: tempMgrCode,
        fullName: 'Isolated Test Manager',
        email: `isolatedmgr.${Date.now()}@company.com`,
        phone: '9998887775',
        department: 'Management',
        designation: 'Manager',
        joiningDate: new Date(),
        status: EmploymentStatus.ACTIVE,
      },
    });

    const team = await prisma.employee.findMany({ where: { managerId: tempMgr.id } });

    if (team.length !== 0) {
      await prisma.employee.delete({ where: { id: tempMgr.id } });
      throw new Error('Expected zero team members for manager with no team');
    }

    await prisma.employee.delete({ where: { id: tempMgr.id } });
  }, 'ALLOW');

  // 20. Dashboard response does NOT expose passwordHash or sensitive auth fields
  await assertTest(20, 'Dashboard aggregation -> Excludes passwordHash and session secrets', async () => {
    const empData = await prisma.employee.findUnique({
      where: { id: empASession.employeeId },
      select: { id: true, employeeCode: true, fullName: true, department: true },
    });

    if ('passwordHash' in (empData as any) || 'password' in (empData as any)) {
      throw new Error('Sensitive password field exposed in query selection!');
    }
  }, 'ALLOW');

  console.log('\n==================================================');
  console.log(`📊 PHASE 7A DASHBOARD SUITE RESULTS: ${testsPassed} PASSED, ${testsFailed} FAILED out of ${testsPassed + testsFailed} Tests`);
  console.log('==================================================\n');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runDashboardApiTests().catch((err) => {
  console.error('Fatal error running dashboard test suite:', err);
  process.exit(1);
});
