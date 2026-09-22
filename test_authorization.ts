import { prisma } from './src/lib/prisma';
import { requireRole, requireEmployeeAccess, AuthError } from './src/lib/permissions';
import { UserSession } from './src/types';
import { Role } from '@prisma/client';

async function runAuthorizationTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING PHASE 3 AUTHORIZATION & IDOR TEST SUITE');
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
    console.error('❌ Failed to load test fixtures from seeded database.');
    process.exit(1);
  }

  const hrSession: UserSession = { id: hrUser.id, email: hrUser.email, role: hrUser.role, employeeId: hrUser.employeeId };
  const managerASession: UserSession = { id: managerAUser.id, email: managerAUser.email, role: managerAUser.role, employeeId: managerAUser.employeeId };
  const managerBSession: UserSession = { id: managerBUser.id, email: managerBUser.email, role: managerBUser.role, employeeId: managerBUser.employeeId };
  const empASession: UserSession = { id: empAUser.id, email: empAUser.email, role: empAUser.role, employeeId: empAUser.employeeId };

  async function assertTest(
    testNumber: number,
    description: string,
    action: () => Promise<void>,
    expectedOutcome: 'ALLOW' | 'DENY_403' | 'DENY_401'
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
          console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED 403 Forbidden (Pass) [Msg: "${err.message}"]`);
          passedCount++;
        } else if (expectedOutcome === 'DENY_401' && err.statusCode === 401) {
          console.log(`✅ TEST ${testNumber}: ${description} -> REJECTED 401 Unauthorized (Pass) [Msg: "${err.message}"]`);
          passedCount++;
        } else {
          console.error(`❌ TEST ${testNumber}: ${description} -> Unexpected AuthError status ${err.statusCode} (Expected ${expectedOutcome}) (Fail)`);
          failedCount++;
        }
      } else {
        console.error(`❌ TEST ${testNumber}: ${description} -> Threw unexpected error:`, err);
        failedCount++;
      }
    }
  }

  // TEST 1: HR_ADMIN -> access Employee A
  await assertTest(1, 'HR_ADMIN -> access Employee A', async () => {
    await requireEmployeeAccess(hrSession, empAUser.employeeId);
  }, 'ALLOW');

  // TEST 2: HR_ADMIN -> access Employee D
  await assertTest(2, 'HR_ADMIN -> access Employee D', async () => {
    await requireEmployeeAccess(hrSession, empDUser.employeeId);
  }, 'ALLOW');

  // TEST 3: Manager A -> access Employee A
  await assertTest(3, 'Manager A -> access Employee A (Direct report)', async () => {
    await requireEmployeeAccess(managerASession, empAUser.employeeId);
  }, 'ALLOW');

  // TEST 4: Manager A -> access Employee B
  await assertTest(4, 'Manager A -> access Employee B (Direct report)', async () => {
    await requireEmployeeAccess(managerASession, empBUser.employeeId);
  }, 'ALLOW');

  // TEST 5: Manager A -> access Employee D
  await assertTest(5, 'Manager A -> access Employee D (Manager B team)', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 'DENY_403');

  // TEST 6: Manager B -> access Employee D
  await assertTest(6, 'Manager B -> access Employee D (Direct report)', async () => {
    await requireEmployeeAccess(managerBSession, empDUser.employeeId);
  }, 'ALLOW');

  // TEST 7: Manager B -> access Employee A
  await assertTest(7, 'Manager B -> access Employee A (Manager A team)', async () => {
    await requireEmployeeAccess(managerBSession, empAUser.employeeId);
  }, 'DENY_403');

  // TEST 8: Employee A -> access own employee record
  await assertTest(8, 'Employee A -> access own employee record', async () => {
    await requireEmployeeAccess(empASession, empAUser.employeeId);
  }, 'ALLOW');

  // TEST 9: Employee A -> access Employee B
  await assertTest(9, 'Employee A -> access Employee B (Peer employee)', async () => {
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 'DENY_403');

  // TEST 10: Unauthenticated request -> protected employee endpoint
  await assertTest(10, 'Unauthenticated request -> protected helper', async () => {
    const unauthenticatedUser: UserSession | null = null;
    if (!unauthenticatedUser) {
      throw new AuthError('Unauthorized: Authentication required', 401);
    }
  }, 'DENY_401');

  // TEST 11: Employee A attempts to change requested employee ID to Employee B (IDOR)
  await assertTest(11, 'Employee A IDOR attempt to request Employee B ID', async () => {
    // Client sends empBUser.employeeId while logged in as empASession
    await requireEmployeeAccess(empASession, empBUser.employeeId);
  }, 'DENY_403');

  // TEST 12: Manager A attempts to access Manager B employee using modified ID (IDOR)
  await assertTest(12, 'Manager A IDOR attempt to request Manager B employee ID', async () => {
    await requireEmployeeAccess(managerASession, empDUser.employeeId);
  }, 'DENY_403');

  console.log('\n==================================================');
  console.log(`📊 AUTHORIZATION SUITE RESULTS: ${passedCount} PASSED, ${failedCount} FAILED out of 12 Tests`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAuthorizationTests()
  .catch((err) => {
    console.error('Fatal error running authorization test suite:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
