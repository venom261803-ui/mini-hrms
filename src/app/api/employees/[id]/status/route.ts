import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/permissions';
import { updateStatusSchema } from '@/validations/employee.schema';
import { Role } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate server-side session
    const session = await requireAuth();

    // 2. HR_ADMIN role restriction (Managers and Employees denied with 403)
    requireRole(session, [Role.HR_ADMIN]);

    const { id: targetEmployeeId } = await params;
    const body = await request.json();

    // 3. Payload validation
    const validationResult = updateStatusSchema.safeParse(body);
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

    const { status } = validationResult.data;

    // 4. Verify target employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
    });

    if (!existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    // 5. Update employment status (Non-destructive update)
    const updatedEmployee = await prisma.employee.update({
      where: { id: targetEmployeeId },
      data: { status },
    });

    return NextResponse.json(
      {
        success: true,
        data: { employee: updatedEmployee },
        message: `Employee status updated to ${status}.`,
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

    console.error('Error updating employee status:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating status.' },
      { status: 500 }
    );
  }
}
