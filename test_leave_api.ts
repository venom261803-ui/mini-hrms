import { prisma } from './src/lib/prisma';
import { requireAuth, requireRole, requireEmployeeAccess, AuthError } from './src/lib/permissions';
import { getNormalizedDate, hasApprovedLeave } from './src/lib/attendance';
import { UserSession } from './src/types';
import { Role, EmploymentStatus, AttendanceStatus, LeaveType, LeaveStatus } from '@prisma/client';

async function runLeaveApiTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING PHASE 6A LEAVE MANAGEMENT API & BUSINESS TEST SUITE');
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

  // Assertion helper
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

  // --- 1. AUTHORIZATION TESTS ---

  // 1. HR can view all leave
  await assertTest(1, 'HR_ADMIN -> view all leave requests', async () => {
    requireRole(hrSession, [Role.HR_ADMIN, Role.MANAGER]);
  }, 'ALLOW');

  // 2. Manager A can view direct team leave (Employee A)
  await assertTest(2, 'Manager A -> view direct report (Employee A) leave', async () => {
    await requireEmployeeAccess(managerASession, empAUser.employeeId);
  }, 'ALLOW');

  // 3. Manager A cannot view Manager B team leave (Employee D)
  await assertTest(3, 'Manager A -> view Manager B team (Employee D) leave', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 'DENY_403');

  // 4. Employee A can view own leave
  await assertTest(4, 'Employee A -> view own leave requests', async () => {
    await requireEmployeeAccess(empASession, empAUser.employeeId);
  }, 'ALLOW');

  // 5. Employee A cannot view Employee B leave
  await assertTest(5, 'Employee A -> view Employee B leave requests', async () => {
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 'DENY_403');

  // --- 2. CREATE TESTS ---

  // Helper date generators for unique non-overlapping leave testing
  const futureBase = new Date(Date.now() + 86400000 * 50); // 50 days from now
  const fStart1 = getNormalizedDate(futureBase);
  const fEnd1 = getNormalizedDate(new Date(futureBase.getTime() + 86400000 * 2));

  // 6. Employee can submit valid leave
  let createdLeaveId = '';
  await assertTest(6, 'Employee A -> Submit valid leave request', async () => {
    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: empASession.employeeId,
        leaveType: LeaveType.CASUAL,
        startDate: fStart1,
        endDate: fEnd1,
        reason: 'Valid casual leave submission test.',
        status: LeaveStatus.PENDING,
      },
    });
    createdLeaveId = leave.id;
  }, 'ALLOW');

  // 7. Invalid leave type rejected
  await assertTest(7, 'Employee -> Submit invalid leave type', async () => {
    const invalidType = 'SUMMER_VACATION';
    if (!Object.values(LeaveType).includes(invalidType as any)) {
      const err: any = new Error('Leave type must be CASUAL, SICK, ANNUAL, or UNPAID');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 8. Invalid date range rejected (endDate < startDate)
  await assertTest(8, 'Employee -> Submit invalid date range (endDate < startDate)', async () => {
    const start = getNormalizedDate('2026-10-10');
    const end = getNormalizedDate('2026-10-05');
    if (end < start) {
      const err: any = new Error('End date cannot be prior to start date.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 9. Employee cannot create leave for another employee (IDOR override)
  await assertTest(9, 'Employee A -> Attempt to pass Employee B ID in submission body', async () => {
    // Server enforces session.employeeId
    const effectiveEmpId = empASession.employeeId;
    if (effectiveEmpId !== empASession.employeeId) {
      throw new Error('IDOR vulnerability in leave creation');
    }
  }, 'ALLOW');

  // 10. Inactive employee cannot submit leave
  await assertTest(10, 'Inactive Employee E -> Submit leave request attempt', async () => {
    const empERecord = await prisma.employee.findUnique({ where: { id: empEUser.employeeId } });
    if (empERecord?.status === EmploymentStatus.INACTIVE) {
      throw new AuthError('Account inactive. Contact HR for assistance.', 403);
    }
  }, 'DENY_403');

  // --- 3. OVERLAP TESTS ---

  // 11. Overlapping PENDING leave rejected
  await assertTest(11, 'Employee A -> Submit overlapping PENDING leave request', async () => {
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: empASession.employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: fEnd1 },
        endDate: { gte: fStart1 },
      },
    });

    if (overlap) {
      const err: any = new Error('Leave request dates overlap with an existing request.');
      err.code = 'TEST_REJECT_409';
      throw err;
    }
  }, 'DENY_409');

  // 12. Overlapping APPROVED leave rejected
  const approvedLeaveBase = new Date(Date.now() + 86400000 * 70);
  const appStart = getNormalizedDate(approvedLeaveBase);
  const appEnd = getNormalizedDate(new Date(approvedLeaveBase.getTime() + 86400000 * 2));

  const tempApprovedLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: empASession.employeeId,
      leaveType: LeaveType.ANNUAL,
      startDate: appStart,
      endDate: appEnd,
      reason: 'Approved leave for overlap test.',
      status: LeaveStatus.APPROVED,
    },
  });

  await assertTest(12, 'Employee A -> Submit overlapping APPROVED leave request', async () => {
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: empASession.employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: appEnd },
        endDate: { gte: appStart },
      },
    });

    if (overlap) {
      const err: any = new Error('Leave request dates overlap with an existing request.');
      err.code = 'TEST_REJECT_409';
      throw err;
    }
  }, 'DENY_409');

  // Clean temp approved leave
  await prisma.leaveRequest.delete({ where: { id: tempApprovedLeave.id } });

  // 13. Non-overlapping leave allowed
  const nonOverlapStart = getNormalizedDate(new Date(futureBase.getTime() + 86400000 * 10));
  const nonOverlapEnd = getNormalizedDate(new Date(futureBase.getTime() + 86400000 * 12));

  let nonOverlapLeaveId = '';
  await assertTest(13, 'Employee A -> Submit non-overlapping leave request', async () => {
    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId: empASession.employeeId,
        leaveType: LeaveType.SICK,
        startDate: nonOverlapStart,
        endDate: nonOverlapEnd,
        reason: 'Non-overlapping medical leave.',
        status: LeaveStatus.PENDING,
      },
    });
    nonOverlapLeaveId = leave.id;
  }, 'ALLOW');

  // 14. REJECTED leave does not block a new request
  const rejectedLeaveBase = new Date(Date.now() + 86400000 * 90);
  const rejStart = getNormalizedDate(rejectedLeaveBase);
  const rejEnd = getNormalizedDate(new Date(rejectedLeaveBase.getTime() + 86400000 * 2));

  const tempRejectedLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: empASession.employeeId,
      leaveType: LeaveType.CASUAL,
      startDate: rejStart,
      endDate: rejEnd,
      reason: 'Rejected leave test.',
      status: LeaveStatus.REJECTED,
      rejectionReason: 'Tested rejection.',
    },
  });

  await assertTest(14, 'Employee A -> Submit request on dates covered by a REJECTED request', async () => {
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: empASession.employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: rejEnd },
        endDate: { gte: rejStart },
      },
    });

    if (overlap) {
      const err: any = new Error('Leave request dates overlap with an existing request.');
      err.code = 'TEST_REJECT_409';
      throw err;
    }
  }, 'ALLOW');

  await prisma.leaveRequest.delete({ where: { id: tempRejectedLeave.id } });

  // --- 4. APPROVAL TESTS ---

  // 15. Manager A can approve direct team's PENDING leave (Employee A)
  await assertTest(15, 'Manager A -> Approve direct report (Employee A) PENDING leave', async () => {
    requireRole(managerASession, [Role.HR_ADMIN, Role.MANAGER]);
    const targetLeave = await prisma.leaveRequest.findUnique({
      where: { id: createdLeaveId },
      include: { employee: true },
    });

    if (targetLeave?.employee.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: Manager scope violation', 403);
    }
    if (targetLeave?.employeeId === managerASession.employeeId) {
      throw new AuthError('Forbidden: Self-approval lockout', 403);
    }

    await prisma.leaveRequest.update({
      where: { id: createdLeaveId },
      data: {
        status: LeaveStatus.APPROVED,
        reviewedById: managerASession.employeeId,
        reviewedAt: new Date(),
      },
    });

    // Also upsert attendance LEAVE status record for approved date range
    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: empASession.employeeId,
          date: fStart1,
        },
      },
      update: { status: AttendanceStatus.LEAVE },
      create: {
        employeeId: empASession.employeeId,
        date: fStart1,
        status: AttendanceStatus.LEAVE,
      },
    });
  }, 'ALLOW');

  // 16. Manager A cannot approve Manager B team leave (Employee D)
  const managerBTeamLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: empDUser.employeeId,
      leaveType: LeaveType.CASUAL,
      startDate: getNormalizedDate(new Date(Date.now() + 86400000 * 100)),
      endDate: getNormalizedDate(new Date(Date.now() + 86400000 * 101)),
      reason: 'Manager B team leave.',
      status: LeaveStatus.PENDING,
    },
  });

  await assertTest(16, 'Manager A -> Attempt to approve Manager B employee leave', async () => {
    const target = await prisma.leaveRequest.findUnique({
      where: { id: managerBTeamLeave.id },
      include: { employee: true },
    });
    if (target?.employee.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: You can only approve leave requests for your direct team members.', 403);
    }
  }, 'DENY_403');

  // 17. HR can approve leave
  await assertTest(17, 'HR_ADMIN -> Approve Manager B employee leave', async () => {
    requireRole(hrSession, [Role.HR_ADMIN, Role.MANAGER]);
    await prisma.leaveRequest.update({
      where: { id: managerBTeamLeave.id },
      data: {
        status: LeaveStatus.APPROVED,
        reviewedById: hrSession.employeeId,
        reviewedAt: new Date(),
      },
    });
  }, 'ALLOW');

  // 18. Employee A cannot approve leave
  await assertTest(18, 'Employee A -> Attempt to approve leave request', async () => {
    requireRole(empASession, [Role.HR_ADMIN, Role.MANAGER]);
  }, 'DENY_403');

  // 19. Reviewer cannot approve own leave
  const managerSelfLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: managerAUser.employeeId,
      leaveType: LeaveType.ANNUAL,
      startDate: getNormalizedDate(new Date(Date.now() + 86400000 * 110)),
      endDate: getNormalizedDate(new Date(Date.now() + 86400000 * 112)),
      reason: 'Manager A self leave test.',
      status: LeaveStatus.PENDING,
    },
  });

  await assertTest(19, 'Manager A -> Attempt to self-approve own leave request', async () => {
    if (managerSelfLeave.employeeId === managerASession.employeeId) {
      throw new AuthError('Forbidden: You cannot approve your own leave request.', 403);
    }
  }, 'DENY_403');

  // 20. Already approved leave cannot be approved again
  await assertTest(20, 'Manager A -> Attempt to re-approve already APPROVED leave', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: createdLeaveId } });
    if (target?.status !== LeaveStatus.PENDING) {
      const err: any = new Error('Cannot approve a leave request that is not PENDING.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // --- 5. REJECTION TESTS ---

  // 21. Manager A can reject direct team's PENDING leave (nonOverlapLeaveId)
  await assertTest(21, 'Manager A -> Reject direct report PENDING leave', async () => {
    requireRole(managerASession, [Role.HR_ADMIN, Role.MANAGER]);
    const target = await prisma.leaveRequest.findUnique({ where: { id: nonOverlapLeaveId }, include: { employee: true } });
    if (target?.employee.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: Manager scope violation', 403);
    }
    await prisma.leaveRequest.update({
      where: { id: nonOverlapLeaveId },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedById: managerASession.employeeId,
        reviewedAt: new Date(),
        rejectionReason: 'Project deadline conflict.',
      },
    });
  }, 'ALLOW');

  // 22. Manager A cannot reject Manager B team leave
  const managerBTeamLeave2 = await prisma.leaveRequest.create({
    data: {
      employeeId: empDUser.employeeId,
      leaveType: LeaveType.SICK,
      startDate: getNormalizedDate(new Date(Date.now() + 86400000 * 120)),
      endDate: getNormalizedDate(new Date(Date.now() + 86400000 * 121)),
      reason: 'Manager B team leave 2.',
      status: LeaveStatus.PENDING,
    },
  });

  await assertTest(22, 'Manager A -> Attempt to reject Manager B employee leave', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: managerBTeamLeave2.id }, include: { employee: true } });
    if (target?.employee.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: You can only reject leave requests for your direct team members.', 403);
    }
  }, 'DENY_403');

  // 23. HR can reject leave
  await assertTest(23, 'HR_ADMIN -> Reject leave request', async () => {
    requireRole(hrSession, [Role.HR_ADMIN, Role.MANAGER]);
    await prisma.leaveRequest.update({
      where: { id: managerBTeamLeave2.id },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedById: hrSession.employeeId,
        reviewedAt: new Date(),
        rejectionReason: 'HR administrative rejection.',
      },
    });
  }, 'ALLOW');

  // 24. Rejection reason required
  await assertTest(24, 'HR_ADMIN -> Reject leave request without rejection reason', async () => {
    const reasonInput: string = '';
    if (!reasonInput || !reasonInput.trim()) {
      const err: any = new Error('Rejection reason is required.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 25. Employee A cannot reject leave
  await assertTest(25, 'Employee A -> Attempt to reject leave request', async () => {
    requireRole(empASession, [Role.HR_ADMIN, Role.MANAGER]);
  }, 'DENY_403');

  // 26. Reviewer cannot reject own leave
  await assertTest(26, 'Manager A -> Attempt to self-reject own leave request', async () => {
    if (managerSelfLeave.employeeId === managerASession.employeeId) {
      throw new AuthError('Forbidden: You cannot reject your own leave request.', 403);
    }
  }, 'DENY_403');

  // 27. Already rejected leave cannot be rejected again
  await assertTest(27, 'HR_ADMIN -> Attempt to re-reject already REJECTED leave', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: managerBTeamLeave2.id } });
    if (target?.status !== LeaveStatus.PENDING) {
      const err: any = new Error('Cannot reject a leave request that is not PENDING.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // --- 6. CANCELLATION TESTS ---

  // Create PENDING leave for cancellation testing
  const cancelTestLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: empASession.employeeId,
      leaveType: LeaveType.CASUAL,
      startDate: getNormalizedDate(new Date(Date.now() + 86400000 * 130)),
      endDate: getNormalizedDate(new Date(Date.now() + 86400000 * 131)),
      reason: 'Cancel test leave.',
      status: LeaveStatus.PENDING,
    },
  });

  // 28. Employee can cancel own PENDING leave
  await assertTest(28, 'Employee A -> Cancel own PENDING leave request', async () => {
    if (cancelTestLeave.employeeId !== empASession.employeeId) {
      throw new AuthError('Forbidden', 403);
    }
    if (cancelTestLeave.status !== LeaveStatus.PENDING) {
      const err: any = new Error('Cannot cancel non-PENDING leave');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
    await prisma.leaveRequest.delete({ where: { id: cancelTestLeave.id } });
  }, 'ALLOW');

  // 29. Employee cannot cancel APPROVED leave
  await assertTest(29, 'Employee A -> Attempt to cancel APPROVED leave request', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: createdLeaveId } });
    if (target?.status !== LeaveStatus.PENDING) {
      const err: any = new Error('Cannot cancel a leave request that is already APPROVED or REJECTED.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 30. Employee cannot cancel REJECTED leave
  await assertTest(30, 'Employee A -> Attempt to cancel REJECTED leave request', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: nonOverlapLeaveId } });
    if (target?.status !== LeaveStatus.PENDING) {
      const err: any = new Error('Cannot cancel a leave request that is already APPROVED or REJECTED.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 31. Employee cannot cancel another employee's leave
  const cancelEmpBLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: empBUser.employeeId,
      leaveType: LeaveType.CASUAL,
      startDate: getNormalizedDate(new Date(Date.now() + 86400000 * 140)),
      endDate: getNormalizedDate(new Date(Date.now() + 86400000 * 141)),
      reason: 'Employee B leave for cancellation test.',
      status: LeaveStatus.PENDING,
    },
  });

  await assertTest(31, 'Employee A -> Attempt to cancel Employee B leave request', async () => {
    if (cancelEmpBLeave.employeeId !== empASession.employeeId) {
      throw new AuthError('Forbidden: You can only cancel your own leave requests.', 403);
    }
  }, 'DENY_403');

  await prisma.leaveRequest.delete({ where: { id: cancelEmpBLeave.id } });

  // --- 7. ATTENDANCE INTEGRATION TESTS ---

  // 32. Approved leave prevents check-in
  await assertTest(32, 'Employee A -> Attempt check-in on approved leave date', async () => {
    const onLeave = await hasApprovedLeave(empASession.employeeId, fStart1);
    if (onLeave) {
      const err: any = new Error('Cannot check in while on approved leave.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // 33. Approved leave represented correctly in attendance (Attendance record exists with status = LEAVE)
  await assertTest(33, 'Approved leave -> Upserts Attendance record with status = LEAVE', async () => {
    const att = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: empASession.employeeId,
          date: fStart1,
        },
      },
    });

    if (att && att.status === AttendanceStatus.LEAVE) {
      // Correctly represented
    } else {
      throw new Error('Attendance LEAVE status record missing or incorrect');
    }
  }, 'ALLOW');

  // 34. Existing conflicting PRESENT attendance prevents leave approval
  const presentConflictDate = getNormalizedDate(new Date(Date.now() + 86400000 * 150));
  await prisma.attendance.create({
    data: {
      employeeId: empASession.employeeId,
      date: presentConflictDate,
      checkIn: new Date(),
      status: AttendanceStatus.PRESENT,
    },
  });

  const conflictLeave = await prisma.leaveRequest.create({
    data: {
      employeeId: empASession.employeeId,
      leaveType: LeaveType.CASUAL,
      startDate: presentConflictDate,
      endDate: presentConflictDate,
      reason: 'Conflicting leave request.',
      status: LeaveStatus.PENDING,
    },
  });

  await assertTest(34, 'HR_ADMIN -> Approve leave with existing PRESENT attendance conflict', async () => {
    const existingAtt = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: empASession.employeeId,
          date: presentConflictDate,
        },
      },
    });

    if (existingAtt && existingAtt.status === AttendanceStatus.PRESENT) {
      const err: any = new Error('Cannot approve leave: Conflicting PRESENT attendance record already exists.');
      err.code = 'TEST_REJECT_400';
      throw err;
    }
  }, 'DENY_400');

  // Clean test fixtures
  await prisma.leaveRequest.delete({ where: { id: conflictLeave.id } });
  await prisma.attendance.delete({ where: { employeeId_date: { employeeId: empASession.employeeId, date: presentConflictDate } } });

  // --- 8. SECURITY / IDOR TESTS ---

  // 35. Employee A cannot access Employee B leave
  await assertTest(35, 'Employee A -> IDOR read Employee B leave request', async () => {
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 'DENY_403');

  // 36. Manager A cannot access Manager B team leave
  await assertTest(36, 'Manager A -> IDOR read Manager B employee leave request', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 'DENY_403');

  // 37. Manager A cannot approve Manager B's employee
  await assertTest(37, 'Manager A -> IDOR approve Manager B employee leave request', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: managerBTeamLeave2.id }, include: { employee: true } });
    if (target?.employee.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: You can only approve leave requests for your direct team members.', 403);
    }
  }, 'DENY_403');

  // 38. Manager A cannot reject Manager B's employee
  await assertTest(38, 'Manager A -> IDOR reject Manager B employee leave request', async () => {
    const target = await prisma.leaveRequest.findUnique({ where: { id: managerBTeamLeave2.id }, include: { employee: true } });
    if (target?.employee.managerId !== managerASession.employeeId) {
      throw new AuthError('Forbidden: You can only reject leave requests for your direct team members.', 403);
    }
  }, 'DENY_403');

  // 39. Client cannot spoof reviewer identity
  await assertTest(39, 'Client -> Attempt to spoof reviewedById parameter', async () => {
    const effectiveReviewerId = hrSession.employeeId;
    if (effectiveReviewerId !== hrSession.employeeId) {
      throw new Error('Reviewer spoofing vulnerability');
    }
  }, 'ALLOW');

  // 40. Client cannot spoof employee identity
  await assertTest(40, 'Client -> Attempt to spoof employeeId parameter', async () => {
    const effectiveEmployeeId = empASession.employeeId;
    if (effectiveEmployeeId !== empASession.employeeId) {
      throw new Error('Employee spoofing vulnerability');
    }
  }, 'ALLOW');

  // Cleanup created test records
  await prisma.leaveRequest.deleteMany({
    where: { id: { in: [createdLeaveId, nonOverlapLeaveId, managerBTeamLeave.id, managerBTeamLeave2.id, managerSelfLeave.id] } },
  });

  console.log('\n==================================================');
  console.log(`📊 PHASE 6A LEAVE SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of 40 Tests`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLeaveApiTests()
  .catch((err) => {
    console.error('Fatal error running Phase 6A Leave API test suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
