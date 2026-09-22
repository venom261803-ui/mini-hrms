import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/permissions';
import { createEmployeeSchema } from '@/validations/employee.schema';
import { Role, EmploymentStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // 1. Authenticate server-side session
    const session = await requireAuth();

    // 2. Deny EMPLOYEE role from accessing company-wide directory
    requireRole(session, [Role.HR_ADMIN, Role.MANAGER]);

    // 3. Database-level role scoping (No client-side filtering)
    const whereClause =
      session.role === Role.MANAGER
        ? { managerId: session.employeeId } // Manager sees only direct team reports
        : {};                               // HR_ADMIN sees all employees

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            role: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { employeeCode: 'asc' },
    });


    return NextResponse.json(
      {
        success: true,
        data: { employees, total: employees.length },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error fetching employee list:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Authenticate server-side session
    const session = await requireAuth();

    // 2. HR_ADMIN role restriction (Managers and Employees denied with 403)
    requireRole(session, [Role.HR_ADMIN]);

    const body = await request.json();

    // 3. Payload validation using Zod schema
    const validationResult = createEmployeeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 4. Duplicate Check: employeeCode
    const existingCode = await prisma.employee.findUnique({
      where: { employeeCode: data.employeeCode },
    });
    if (existingCode) {
      return NextResponse.json(
        { success: false, error: `Employee code '${data.employeeCode}' already exists.` },
        { status: 409 }
      );
    }

    // 5. Duplicate Check: email
    const existingEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: `Email address '${data.email}' is already registered.` },
        { status: 409 }
      );
    }

    // 6. Manager Assignment Validation (if managerId supplied)
    if (data.managerId) {
      const targetManager = await prisma.employee.findUnique({
        where: { id: data.managerId },
        include: { user: true },
      });

      if (!targetManager) {
        return NextResponse.json(
          { success: false, error: 'Invalid manager ID: Assigned manager record does not exist.' },
          { status: 400 }
        );
      }

      if (targetManager.status !== EmploymentStatus.ACTIVE) {
        return NextResponse.json(
          { success: false, error: 'Invalid manager ID: Cannot assign employee to an inactive manager.' },
          { status: 400 }
        );
      }

      if (targetManager.user?.role !== Role.MANAGER && targetManager.user?.role !== Role.HR_ADMIN) {
        return NextResponse.json(
          { success: false, error: 'Invalid manager ID: Assigned manager must hold a MANAGER or HR_ADMIN account.' },
          { status: 400 }
        );
      }
    }

    // Default password hash for new employee account
    const defaultPassword = 'Password123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // 7. Atomic Prisma Transaction: Create Employee + User accounts
    const newEmployee = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeCode: data.employeeCode,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          department: data.department,
          designation: data.designation,
          joiningDate: new Date(data.joiningDate),
          status: data.status || EmploymentStatus.ACTIVE,
          managerId: data.managerId || null,
        },
      });

      await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          role: Role.EMPLOYEE, // Default newly created users to EMPLOYEE role
          employeeId: employee.id,
        },
      });

      return employee;
    });

    return NextResponse.json(
      {
        success: true,
        data: { employee: newEmployee },
        message: 'Employee created successfully.',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating employee.' },
      { status: 500 }
    );
  }
}
