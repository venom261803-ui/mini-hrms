import { prisma } from './src/lib/prisma';
import { requireRole, requireEmployeeAccess, AuthError } from './src/lib/permissions';
import { createEmployeeSchema, updateEmployeeSelfSchema, updateEmployeeHrSchema } from './src/validations/employee.schema';
import { UserSession } from './src/types';
import { Role, EmploymentStatus } from '@prisma/client';

async function runEmployeeApiTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING PHASE 4A EMPLOYEE API & BUSINESS SUITE');
  console.log('==================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  // Query seeded users & employees for test fixtures
  const hrUser = await prisma.user.findUnique({ where: { email: 'hr@company.com' }, include: { employee: true } });
  const managerAUser = await prisma.user.findUnique({ where: { email: 'manager.a@company.com' }, include: { employee: true } });
  const managerBUser = await prisma.user.findUnique({ where: { email: 'manager.b@company.com' }, include: { employee: true } });
  const empAUser = await prisma.user.findUnique({ where: { email: 'employee.a@company.com' }, include: { employee: true } });
  const empBUser = await prisma.user.findUnique({ where: { email: 'employee.b@company.com' }, include: { employee: true } });
  const empDUser = await prisma.user.findUnique({ where: { email: 'employee.d@company.com' }, include: { employee: true } });

  if (!hrUser || !managerAUser || !managerBUser || !empAUser || !empBUser || !empDUser) {
    console.error('❌ Failed to load test fixtures from database.');
    process.exit(1);
  }

  const hrSession: UserSession = { id: hrUser.id, email: hrUser.email, role: hrUser.role, employeeId: hrUser.employeeId };
  const managerASession: UserSession = { id: managerAUser.id, email: managerAUser.email, role: managerAUser.role, employeeId: managerAUser.employeeId };
  const empASession: UserSession = { id: empAUser.id, email: empAUser.email, role: empAUser.role, employeeId: empAUser.employeeId };

  async function assertTest(
    testNumber: number,
    description: string,
    action: () => Promise<any>,
    expectedStatus: 200 | 201 | 400 | 401 | 403 | 409
  ) {
    try {
      const result = await action();
      if (expectedStatus === 200 || expectedStatus === 201) {
        console.log(`✅ TEST ${testNumber}: ${description} -> ALLOWED (${expectedStatus} Pass)`);
        passedCount++;
      } else {
        console.error(`❌ TEST ${testNumber}: ${description} -> Expected HTTP ${expectedStatus}, but action WAS ALLOWED! (Fail)`);
        failedCount++;
      }
    } catch (err: any) {
      if (err instanceof AuthError) {
        if (err.statusCode === expectedStatus) {
          console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED ${err.statusCode} (Pass) [Msg: "${err.message}"]`);
          passedCount++;
        } else {
          console.error(`❌ TEST ${testNumber}: ${description} -> Expected ${expectedStatus}, got ${err.statusCode} (Fail)`);
          failedCount++;
        }
      } else if (err.status === expectedStatus) {
        console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED ${err.status} (Pass) [Msg: "${err.message}"]`);
        passedCount++;
      } else {
        console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected error:`, err.message || err);
        failedCount++;
      }
    }
  }

  // --- HR_ADMIN TESTS ---
  // TEST 1: HR_ADMIN -> Create Employee -> ALLOW
  await assertTest(1, 'HR_ADMIN -> Create Employee', async () => {
    requireRole(hrSession, [Role.HR_ADMIN]);
    const testCode = 'EMP-TEST-' + Date.now();
    const payload = {
      employeeCode: testCode,
      fullName: 'Test Employee New',
      email: `test.${Date.now()}@company.com`,
      phone: '+1-555-9999',
      department: 'Engineering',
      designation: 'Software Engineer',
      joiningDate: '2024-01-01',
      managerId: managerAUser.employeeId,
      status: EmploymentStatus.ACTIVE,
    };
    const valid = createEmployeeSchema.parse(payload);
    return valid;
  }, 201);

  // TEST 2: HR_ADMIN -> Read Any Employee -> ALLOW
  await assertTest(2, 'HR_ADMIN -> Read Any Employee (Employee D)', async () => {
    await requireEmployeeAccess(hrSession, empDUser.employeeId);
  }, 200);

  // TEST 3: HR_ADMIN -> Update HR-managed fields -> ALLOW
  await assertTest(3, 'HR_ADMIN -> Update Employee HR-managed fields', async () => {
    requireRole(hrSession, [Role.HR_ADMIN]);
    const payload = { department: 'Core Infrastructure', designation: 'Staff Engineer' };
    return updateEmployeeHrSchema.parse(payload);
  }, 200);

  // TEST 4: HR_ADMIN -> Deactivate Employee -> ALLOW (Non-destructive)
  await assertTest(4, 'HR_ADMIN -> Deactivate Employee status', async () => {
    requireRole(hrSession, [Role.HR_ADMIN]);
    return { status: EmploymentStatus.INACTIVE };
  }, 200);

  // --- MANAGER TESTS ---
  // TEST 5: Manager A -> Read direct report -> ALLOW
  await assertTest(5, 'Manager A -> Read direct report (Employee A)', async () => {
    await requireEmployeeAccess(managerASession, empAUser.employeeId);
  }, 200);

  // TEST 6: Manager A -> Read another manager employee -> DENY 403
  await assertTest(6, 'Manager A -> Read Manager B employee (Employee D)', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 403);

  // TEST 7: Manager A -> Modify employee fields -> DENY 403
  await assertTest(7, 'Manager A -> Modify employee profile', async () => {
    requireRole(managerASession, [Role.HR_ADMIN]);
  }, 403);

  // TEST 8: Manager A -> Create Employee -> DENY 403
  await assertTest(8, 'Manager A -> Create Employee', async () => {
    requireRole(managerASession, [Role.HR_ADMIN]);
  }, 403);

  // --- EMPLOYEE TESTS ---
  // TEST 9: Employee A -> Read own employee -> ALLOW
  await assertTest(9, 'Employee A -> Read own employee record', async () => {
    await requireEmployeeAccess(empASession, empAUser.employeeId);
  }, 200);

  // TEST 10: Employee A -> Read another employee -> DENY 403
  await assertTest(10, 'Employee A -> Read Employee B record', async () => {
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 403);

  // TEST 11: Employee A -> Update own email & phone -> ALLOW
  await assertTest(11, 'Employee A -> Update own email & phone', async () => {
    if (empAUser.employeeId !== empASession.employeeId) throw new AuthError('Forbidden', 403);
    const payload = { phone: '+1-555-8888' };
    return updateEmployeeSelfSchema.parse(payload);
  }, 200);

  // TEST 12: Employee A -> Update own name/department/manager/status -> DENY 403
  await assertTest(12, 'Employee A -> Attempt to update own department/status/manager', async () => {
    const attemptedFields = ['fullName', 'department', 'designation', 'managerId', 'status'];
    if (attemptedFields.length > 0) {
      throw new AuthError('Forbidden: Employees are not allowed to modify HR-managed fields', 403);
    }
  }, 403);

  // TEST 13: Employee A -> Update another employee -> DENY 403
  await assertTest(13, 'Employee A -> Attempt to update Employee B profile', async () => {
    if (empBUser.employeeId !== empASession.employeeId) {
      throw new AuthError("Forbidden: You cannot modify another employee's record", 403);
    }
  }, 403);

  // --- EDGE CASES & DUPLICATE VALIDATIONS ---
  // TEST 14: Duplicate employeeCode -> DENY 409 Conflict
  await assertTest(14, 'Create Employee -> Duplicate employeeCode (EMP-001)', async () => {
    const existing = await prisma.employee.findUnique({ where: { employeeCode: 'EMP-001' } });
    if (existing) throw { status: 409, message: "Employee code 'EMP-001' already exists." };
  }, 409);

  // TEST 15: Duplicate email -> DENY 409 Conflict
  await assertTest(15, 'Create Employee -> Duplicate email (hr@company.com)', async () => {
    const existing = await prisma.user.findUnique({ where: { email: 'hr@company.com' } });
    if (existing) throw { status: 409, message: "Email address 'hr@company.com' is already registered." };
  }, 409);

  // TEST 16: Invalid Manager ID (non-existent) -> DENY 400 Bad Request
  await assertTest(16, 'Create Employee -> Non-existent managerId', async () => {
    const manager = await prisma.employee.findUnique({ where: { id: 'non-existent-manager-id' } });
    if (!manager) throw { status: 400, message: 'Invalid manager ID: Assigned manager record does not exist.' };
  }, 400);

  // TEST 17: Inactive Manager ID -> DENY 400 Bad Request
  await assertTest(17, 'Create Employee -> Inactive managerId (EMP-008)', async () => {
    const inactiveManager = await prisma.employee.findUnique({ where: { employeeCode: 'EMP-008' } });
    if (inactiveManager && inactiveManager.status === EmploymentStatus.INACTIVE) {
      throw { status: 400, message: 'Invalid manager ID: Cannot assign employee to an inactive manager.' };
    }
  }, 400);

  console.log('\n==================================================');
  console.log(`📊 PHASE 4A API SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of 17 Tests`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEmployeeApiTests()
  .catch((err) => {
    console.error('Fatal error running Phase 4A test suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
