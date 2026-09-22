import { Role, EmploymentStatus } from '@prisma/client';
import { UserSession } from '@/types';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 403) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Server Helper: Asserts that a valid authenticated session exists AND employment status is ACTIVE.
 * Throws AuthError (401) if session is missing or expired.
 * Throws AuthError (403) if employee account is INACTIVE.
 */
export async function requireAuth(): Promise<UserSession> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError('Unauthorized: Authentication required', 401);
  }

  // Authoritative DB employment status check
  if (user.employeeId) {
    const employee = await prisma.employee.findUnique({
      where: { id: user.employeeId },
      select: { status: true },
    });

    if (!employee || employee.status === EmploymentStatus.INACTIVE) {
      throw new AuthError('Account inactive. Contact HR for assistance.', 403);
    }
  }

  return user;
}


/**
 * Server Helper: Asserts that the authenticated user has an allowed role.
 * Throws AuthError (403) if role is insufficient.
 */
export function requireRole(user: UserSession, allowedRoles: Role[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(`Forbidden: Role '${user.role}' is not authorized to perform this action`, 403);
  }
}

/**
 * Server Helper: Enforces server-side resource ownership & team boundary access:
 * - HR_ADMIN: Access allowed to all employees across the organization.
 * - MANAGER: Access allowed ONLY to direct team members (employee.managerId === user.employeeId) or self.
 * - EMPLOYEE: Access allowed ONLY to their own profile (targetEmployeeId === user.employeeId).
 * 
 * Throws AuthError (403) if access is denied.
 */
export async function requireEmployeeAccess(
  user: UserSession,
  targetEmployeeId: string
): Promise<void> {
  // 1. HR_ADMIN has global access
  if (user.role === Role.HR_ADMIN) {
    return;
  }

  // 2. EMPLOYEE can only access their own record
  if (user.role === Role.EMPLOYEE) {
    if (targetEmployeeId !== user.employeeId) {
      throw new AuthError("Forbidden: You cannot access another employee's private information", 403);
    }
    return;
  }

  // 3. MANAGER can access own profile OR assigned direct team members
  if (user.role === Role.MANAGER) {
    if (targetEmployeeId === user.employeeId) {
      return; // Manager accessing self
    }

    // Query database to verify target employee's managerId
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, managerId: true },
    });

    if (!targetEmployee) {
      throw new AuthError('Forbidden: Resource not found or access denied', 403);
    }

    if (targetEmployee.managerId !== user.employeeId) {
      throw new AuthError('Forbidden: You can only access employees assigned to your team', 403);
    }
    return;
  }

  throw new AuthError('Forbidden: Unauthorized resource access', 403);
}

/**
 * Dedicated helper asserting Manager team access boundary.
 */
export async function requireManagerTeamAccess(
  user: UserSession,
  targetEmployeeId: string
): Promise<void> {
  return await requireEmployeeAccess(user, targetEmployeeId);
}
