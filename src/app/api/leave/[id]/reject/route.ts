import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/permissions';
import { rejectLeaveSchema } from '@/validations/leave.schema';
import { Role, LeaveStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate session & assert active employment status
    const session = await requireAuth();

    // 2. HR_ADMIN & MANAGER role restriction (Employees denied with 403)
    requireRole(session, [Role.HR_ADMIN, Role.MANAGER]);

    const { id: leaveRequestId } = await params;
    const body = await request.json();

    // 3. Payload validation
    const validationResult = rejectLeaveSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rejection reason is required.',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { rejectionReason } = validationResult.data;

    // 4. Find target leave request
    const targetLeave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: {
        employee: {
          select: {
            id: true,
            managerId: true,
          },
        },
      },
    });

    if (!targetLeave) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // 5. Status Check: Must be currently PENDING
    if (targetLeave.status !== LeaveStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Cannot reject a leave request that is not PENDING.' },
        { status: 400 }
      );
    }

    // 6. Self-Rejection Lockout: Reviewer cannot reject their own leave request
    if (targetLeave.employeeId === session.employeeId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot reject your own leave request.' },
        { status: 403 }
      );
    }

    // 7. Manager Scope Enforcement: MANAGER can only reject direct team members
    if (session.role === Role.MANAGER) {
      if (targetLeave.employee.managerId !== session.employeeId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only reject leave requests for your direct team members.' },
          { status: 403 }
        );
      }
    }

    // 8. Update LeaveRequest to REJECTED
    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leaveRequestId },
      data: {
        status: LeaveStatus.REJECTED,
        reviewedById: session.employeeId,
        reviewedAt: new Date(),
        rejectionReason,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { leaveRequest: updatedLeave },
        message: 'Leave request rejected successfully.',
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

    console.error('Error rejecting leave request:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while rejecting leave.' },
      { status: 500 }
    );
  }
}
