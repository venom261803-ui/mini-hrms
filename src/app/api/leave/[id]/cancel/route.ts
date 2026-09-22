import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { LeaveStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate session & assert active employment status
    const session = await requireAuth();

    const { id: leaveRequestId } = await params;

    // 2. Find target leave request
    const targetLeave = await prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
    });

    if (!targetLeave) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // 3. Ownership Check: Employee can cancel only their own leave request
    if (targetLeave.employeeId !== session.employeeId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You can only cancel your own leave requests.' },
        { status: 403 }
      );
    }

    // 4. Status Check: Only PENDING leave requests can be cancelled
    if (targetLeave.status !== LeaveStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a leave request that is already APPROVED or REJECTED.' },
        { status: 400 }
      );
    }

    // 5. Delete pending leave request record
    await prisma.leaveRequest.delete({
      where: { id: leaveRequestId },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Leave request cancelled successfully.',
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

    console.error('Error cancelling leave request:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while cancelling leave.' },
      { status: 500 }
    );
  }
}
