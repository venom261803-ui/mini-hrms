import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireEmployeeAccess, AuthError } from '@/lib/permissions';
import { updateEmployeeSelfSchema, updateEmployeeHrSchema } from '@/validations/employee.schema';
import { Role, EmploymentStatus } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: targetEmployeeId } = await params;

    await requireEmployeeAccess(session, targetEmployeeId);

    const employee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            designation: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { employee },
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

    console.error('Error fetching employee by ID:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate server-side session
    const session = await requireAuth();
    const { id: targetEmployeeId } = await params;

    const body = await request.json();

    // 2. Role-based update authorization rules
    if (session.role === Role.MANAGER) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Managers are not authorized to modify employee records' },
        { status: 403 }
      );
    }

    // --- EMPLOYEE ROLE UPDATE ---
    if (session.role === Role.EMPLOYEE) {
      // Must be self-update
      if (targetEmployeeId !== session.employeeId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You cannot modify another employee's record" },
          { status: 403 }
        );
      }

      // Check for locked HR fields in payload
      const hrFields = [
        'fullName', 'employeeCode', 'department', 'designation', 
        'managerId', 'joiningDate', 'status', 'role', 'passwordHash', 'id', 'user'
      ];
      const attemptedHrFields = Object.keys(body).filter((key) => hrFields.includes(key));
      
      if (attemptedHrFields.length > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Forbidden: Employees are not allowed to modify HR-managed fields (${attemptedHrFields.join(', ')})` 
          },
          { status: 403 }
        );
      }

      // Validate self-update fields (email & phone only)
      const validationResult = updateEmployeeSelfSchema.safeParse(body);
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

      const updateData = validationResult.data;

      // Email uniqueness check if email is being updated
      if (updateData.email) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: updateData.email,
            NOT: { employeeId: targetEmployeeId },
          },
        });
        if (existingEmail) {
          return NextResponse.json(
            { success: false, error: `Email address '${updateData.email}' is already in use` },
            { status: 409 }
          );
        }
      }

      // Execute self update in a transaction
      const updatedEmployee = await prisma.$transaction(async (tx) => {
        const employee = await tx.employee.update({
          where: { id: targetEmployeeId },
          data: updateData,
        });

        if (updateData.email) {
          await tx.user.update({
            where: { employeeId: targetEmployeeId },
            data: { email: updateData.email },
          });
        }

        return employee;
      });

      return NextResponse.json(
        {
          success: true,
          data: { employee: updatedEmployee },
          message: 'Profile updated successfully.',
        },
        { status: 200 }
      );
    }

    // --- HR_ADMIN ROLE UPDATE ---
    if (session.role === Role.HR_ADMIN) {
      const validationResult = updateEmployeeHrSchema.safeParse(body);
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

      const updateData = validationResult.data;

      // Check email uniqueness if modified
      if (updateData.email) {
        const existingEmail = await prisma.user.findFirst({
          where: {
            email: updateData.email,
            NOT: { employeeId: targetEmployeeId },
          },
        });
        if (existingEmail) {
          return NextResponse.json(
            { success: false, error: `Email address '${updateData.email}' is already in use` },
            { status: 409 }
          );
        }
      }

      // Manager validation if managerId is being changed
      if (updateData.managerId !== undefined && updateData.managerId !== null) {
        if (updateData.managerId === targetEmployeeId) {
          return NextResponse.json(
            { success: false, error: 'An employee cannot be assigned as their own manager.' },
            { status: 400 }
          );
        }

        const targetManager = await prisma.employee.findUnique({
          where: { id: updateData.managerId },
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

      // Execute HR update in a transaction
      const updatedEmployee = await prisma.$transaction(async (tx) => {
        const employeeData: any = { ...updateData };
        if (updateData.joiningDate) {
          employeeData.joiningDate = new Date(updateData.joiningDate);
        }

        const employee = await tx.employee.update({
          where: { id: targetEmployeeId },
          data: employeeData,
        });

        if (updateData.email) {
          await tx.user.update({
            where: { employeeId: targetEmployeeId },
            data: { email: updateData.email },
          });
        }

        return employee;
      });

      return NextResponse.json(
        {
          success: true,
          data: { employee: updatedEmployee },
          message: 'Employee updated successfully.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Forbidden: Unauthorized update request' },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error updating employee:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating employee.' },
      { status: 500 }
    );
  }
}
