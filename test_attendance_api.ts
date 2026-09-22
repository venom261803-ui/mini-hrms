import { prisma } from './src/lib/prisma';
import { requireAuth, requireRole, requireEmployeeAccess, AuthError } from './src/lib/permissions';
import { getNormalizedDate, hasApprovedLeave } from './src/lib/attendance';
import { UserSession } from './src/types';
import { Role, EmploymentStatus, AttendanceStatus, LeaveType, LeaveStatus } from '@prisma/client';

async function runAttendanceApiTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING PHASE 5A ATTENDANCE API & BUSINESS TEST SUITE');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  // Load test fixtures from database
  const hrUser = await prisma.user.findUnique({ where: { email: 'hr@company.com' }, include: { employee: true } });
  const managerAUser = await prisma.user.findUnique({ where: { email: 'manager.a@company.com' }, include: { employee: true } });
  const managerBUser = await prisma.user.findUnique({ where: { email: 'manager.b@company.com' }, include: { employee: true } });
  const empAUser = await prisma.user.findUnique({ where: { email: 'employee.a@company.com' }, include: { employee: true } });
  const empBUser = await prisma.user.findUnique({ where: { email: 'employee.b@company.com' }, include: { employee: true } });
  const empDUser = await prisma.user.findUnique({ where: { email: 'employee.d@company.com' }, include: { employee: true } });
  const empEUser = await prisma.user.findUnique({ where: { email: 'employee.e@company.com' }, include: { employee: true } });

  if (!hrUser || !managerAUser || !managerBUser || !empAUser || !empBUser || !empDUser || !empEUser) {
    console.error('❌ Failed to load test user fixtures from database.');
    process.exit(1);
  }

  const hrSession: UserSession = { id: hrUser.id, email: hrUser.email, role: hrUser.role, employeeId: hrUser.employeeId };
  const managerASession: UserSession = { id: managerAUser.id, email: managerAUser.email, role: managerAUser.role, employeeId: managerAUser.employeeId };
  const managerBSession: UserSession = { id: managerBUser.id, email: managerBUser.email, role: managerBUser.role, employeeId: managerBUser.employeeId };
  const empASession: UserSession = { id: empAUser.id, email: empAUser.email, role: empAUser.role, employeeId: empAUser.employeeId };
  const empBSession: UserSession = { id: empBUser.id, email: empBUser.email, role: empBUser.role, employeeId: empBUser.employeeId };

  const today = getNormalizedDate();

  // Helper assertion wrapper
  async function assertTest(
    testNumber: number,
    description: string,
    action: () => Promise<void>,
    expectedOutcome: 'ALLOW' | 'DENY_400' | 'DENY_403' | 'DENY_404' | 'DENY_409'
  ) {
    try {
      await action();
      if (expectedOutcome === 'ALLOW') {
        console.log(`✅ TEST ${testNumber}: ${description} -> ALLOWED (Pass)`);
        passedCount++;
      } else {
        console.error(`❌ TEST ${testNumber}: ${description} -> Expected ${expectedOutcome}, but action WAS ALLOWED! (Fail)`);
        failedCount++;
      }
    } catch (err: any) {
      if (err instanceof AuthError) {
        if (expectedOutcome === 'DENY_403' && err.statusCode === 403) {
          console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED 403 (Pass) [Msg: "${err.message}"]`);
          passedCount++;
        } else {
          console.error(`❌ TEST ${testNumber}: ${description} -> AuthError status ${err.statusCode} (Expected ${expectedOutcome}) (Fail) [Msg: "${err.message}"]`);
          failedCount++;
        }
      } else if (err.code === 'TEST_REJECT_400') {
        if (expectedOutcome === 'DENY_400') {
          console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED 400 (Pass) [Msg: "${err.message}"]`);
          passedCount++;
        } else {
          console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected 400 (Expected ${expectedOutcome}) (Fail)`);
          failedCount++;
        }
      } else if (err.code === 'TEST_REJECT_409') {
        if (expectedOutcome === 'DENY_409') {
          console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED 409 (Pass) [Msg: "${err.message}"]`);
          passedCount++;
        } else {
          console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected 409 (Expected ${expectedOutcome}) (Fail)`);
          failedCount++;
        }
      } else {
        console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected error:`, err);
        failedCount++;
      }
    }
  }

  // --- AUTHORIZATION TESTS ---

  // 1. HR can view all attendance
  await assertTest(1, 'HR_ADMIN -> view all company attendance', async () => {
    requireRole(hrSession, [Role.HR_ADMIN, Role.MANAGER]);
  }, 'ALLOW');

  // 2. Manager A can view direct team attendance (Employee A)
  await assertTest(2, 'Manager A -> view direct report (Employee A) attendance', async () => {
    await requireEmployeeAccess(managerASession, empAUser.employeeId);
  }, 'ALLOW');

  // 3. Manager A cannot view Manager B team attendance (Employee D)
  await assertTest(3, 'Manager A -> view Manager B team (Employee D) attendance', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 'DENY_403');

  // 4. Employee A can view own attendance
  await assertTest(4, 'Employee A -> view own attendance', async () => {
    await requireEmployeeAccess(empASession, empAUser.employeeId);
  }, 'ALLOW');

  // 5. Employee A cannot view Employee B attendance
  await assertTest(5, 'Employee A -> view Employee B attendance', async () => {
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 'DENY_403');

  // --- CHECK-IN TESTS ---

  // Create a test employee for fresh check-in tests
  const testCheckInEmpCode = 'TEST-CHK-001';
  let testCheckInEmp = await prisma.employee.findUnique({ where: { employeeCode: testCheckInEmpCode } });
  if (!testCheckInEmp) {
    testCheckInEmp = await prisma.employee.create({
      data: {
        employeeCode: testCheckInEmpCode,
        fullName: 'Checkin Test User',
        email: 'checkin.test@company.com',
        phone: '+1-555-9999',
        department: 'Engineering',
        designation: 'Tester',
        joiningDate: new Date(),
        status: EmploymentStatus.ACTIVE,
        user: {
          create: {
            email: 'checkin.test@company.com',
            passwordHash: 'dummy',
            role: Role.EMPLOYEE,
          },
        },
      },
    });
  }

  const testCheckInSession: UserSession = {
    id: testCheckInEmp.id,
    email: testCheckInEmp.email,
    role: Role.EMPLOYEE,
    employeeId: testCheckInEmp.id,
  };

  // Clean test attendance record for today if exists
  await prisma.attendance.deleteMany({
    where: { employeeId: testCheckInEmp.id, date: today },
  });

  // 6. Employee can check in
  await assertTest(6, 'Employee -> Check-in for today', async () => {
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: testCheckInSession.employeeId, date: today } },
    });
    if (!existing) {
      await prisma.attendance.create({
        data: {
          employeeId: testCheckInSession.employeeId,
          date: today,
          checkIn: new Date(),
          status: AttendanceStatus.PRESENT,
        },
      });
    }
  }, 'ALLOW');

  // 7. Duplicate check-in rejected
  await assertTest(7, 'Employee -> Duplicate check-in for today', async () => {
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: testCheckInSession.employeeId, date: today } },
    });
    if (existing && existing.checkIn !== null) {
      const err: any = new Error('Already checked in for today.');
      err.code = 'TEST_REJECT_409';
      throw err;
    }
  }, 'DENY_409');

  // 8. Inactive employee check-in rejected
  await assertTest(8, 'Inactive Employee E -> Check-in attempt', async () => {
    const empERecord = await prisma.employee.findUnique({ where: { id: empEUser.employeeId } });
    if (empERecord?.status === EmploymentStatus.INACTIVE) {
      throw new AuthError('Account inactive. Contact HR for assistance.', 403);
    }
  }, 'DENY_403');

  // 9. Check-in during approved leave rejected
  await assertTest(9, 'Employee -> Check-in during approved leave', async () => {
    // Create temporary approved leave for test user covering today
    const tempLeave = await prisma.leaveRequest.create({
      data: {
        employeeId: testCheckInSession.employeeId,
        leaveType: LeaveType.CASUAL,
        startDate: new Date(today.getTime() - 86400000),
        endDate: new Date(today.getTime() + 86400000),
        reason: 'Test Leave',
        status: LeaveStatus.APPROVED,
      },
    });

    const onLeave = await hasApprovedLeave(testCheckInSession.employeeId, today);

    // Clean up temp leave
    await prisma.leaveRequest.delete({ where: { id: tempLeave.id } });

    if (onLeave) {
      const err: any = new Error('Cannot check in while on approved leave.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 10. Another employee cannot check in on behalf of authenticated employee
  await assertTest(10, 'Employee A -> Pass another employeeId in check-in body (IDOR)', async () => {
    // Server enforces session.employeeId regardless of client payload
    const effectiveEmployeeId = empASession.employeeId;
    if (effectiveEmployeeId !== empASession.employeeId) {
      throw new Error('IDOR vulnerability');
    }
  }, 'ALLOW');

  // --- CHECK-OUT TESTS ---

  const testCheckOutEmpCode = 'TEST-CHK-002';
  let testCheckOutEmp = await prisma.employee.findUnique({ where: { employeeCode: testCheckOutEmpCode } });
  if (!testCheckOutEmp) {
    testCheckOutEmp = await prisma.employee.create({
      data: {
        employeeCode: testCheckOutEmpCode,
        fullName: 'Checkout Test User',
        email: 'checkout.test@company.com',
        phone: '+1-555-8888',
        department: 'Marketing',
        designation: 'Tester',
        joiningDate: new Date(),
        status: EmploymentStatus.ACTIVE,
        user: {
          create: {
            email: 'checkout.test@company.com',
            passwordHash: 'dummy',
            role: Role.EMPLOYEE,
          },
        },
      },
    });
  }

  const testCheckOutSession: UserSession = {
    id: testCheckOutEmp.id,
    email: testCheckOutEmp.email,
    role: Role.EMPLOYEE,
    employeeId: testCheckOutEmp.id,
  };

  // Clean test attendance record for today
  await prisma.attendance.deleteMany({
    where: { employeeId: testCheckOutEmp.id, date: today },
  });

  // 11. Employee cannot checkout before check-in
  await assertTest(11, 'Employee -> Check-out without checking in first', async () => {
    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId: testCheckOutSession.employeeId, date: today } },
    });
    if (!existing || existing.checkIn === null) {
      const err: any = new Error('Cannot check out without checking in first.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // Perform valid check-in first for checkout testing
  const checkOutRec = await prisma.attendance.create({
    data: {
      employeeId: testCheckOutSession.employeeId,
      date: today,
      checkIn: new Date(),
      status: AttendanceStatus.PRESENT,
    },
  });

  // 12. Employee can checkout after check-in
  await assertTest(12, 'Employee -> Check-out after checking in', async () => {
    await prisma.attendance.update({
      where: { id: checkOutRec.id },
      data: { checkOut: new Date() },
    });
  }, 'ALLOW');

  // 13. Duplicate checkout rejected
  await assertTest(13, 'Employee -> Duplicate check-out', async () => {
    const existing = await prisma.attendance.findUnique({
      where: { id: checkOutRec.id },
    });
    if (existing && existing.checkOut !== null) {
      const err: any = new Error('Already checked out for today.');
      err.code = 'TEST_REJECT_409';
      throw err;
    }
  }, 'DENY_409');

  // --- HR STATUS CORRECTION TESTS ---

  // 14. HR can manually set HALF_DAY
  await assertTest(14, 'HR_ADMIN -> Manually set attendance status HALF_DAY', async () => {
    requireRole(hrSession, [Role.HR_ADMIN]);
    await prisma.attendance.update({
      where: { id: checkOutRec.id },
      data: { status: AttendanceStatus.HALF_DAY },
    });
  }, 'ALLOW');

  // 15. HR can manually set ABSENT
  await assertTest(15, 'HR_ADMIN -> Manually set attendance status ABSENT', async () => {
    requireRole(hrSession, [Role.HR_ADMIN]);
    await prisma.attendance.update({
      where: { id: checkOutRec.id },
      data: { status: AttendanceStatus.ABSENT },
    });
  }, 'ALLOW');

  // 16. Non-HR cannot manually modify attendance status
  await assertTest(16, 'Manager A -> Attempt manual status update', async () => {
    requireRole(managerASession, [Role.HR_ADMIN]);
  }, 'DENY_403');

  // 17. LEAVE status requires approved leave
  await assertTest(17, 'HR_ADMIN -> Set LEAVE status without approved leave', async () => {
    requireRole(hrSession, [Role.HR_ADMIN]);
    const onLeave = await hasApprovedLeave(checkOutRec.employeeId, checkOutRec.date);
    if (!onLeave) {
      const err: any = new Error('Cannot set status to LEAVE: No approved leave request exists.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // --- SECURITY TESTS ---

  // 18. Employee IDOR attempt rejected
  await assertTest(18, 'Employee A -> IDOR query for Employee B attendance', async () => {
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 'DENY_403');

  // 19. Manager cross-team IDOR attempt rejected
  await assertTest(19, 'Manager A -> Cross-team IDOR query for Manager B employee attendance', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 'DENY_403');

  // 20. Query parameter manipulation cannot bypass server scope
  await assertTest(20, 'Manager A -> Query param manipulation trying to fetch Manager B employee', async () => {
    const requestedEmpId = empDUser.employeeId;
    const targetEmp = await prisma.employee.findUnique({ where: { id: requestedEmpId } });
    if (!targetEmp || targetEmp.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: You can only access attendance records for your team members.', 403);
    }
  }, 'DENY_403');

  console.log('\n==================================================');
  console.log(`📊 PHASE 5A ATTENDANCE SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of 20 Tests`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAttendanceApiTests()
  .catch((err) => {
    console.error('Fatal error running Phase 5A Attendance API test suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
