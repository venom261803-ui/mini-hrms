import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/permissions';
import { hasApprovedLeave } from '@/lib/attendance';
import { updateAttendanceStatusSchema } from '@/validations/attendance.schema';
import { Role, AttendanceStatus } from '@prisma/client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate session & assert active employment status
    const session = await requireAuth();

    // 2. HR_ADMIN role restriction (Managers and Employees denied with 403)
    requireRole(session, [Role.HR_ADMIN]);

    const { id: attendanceId } = await params;
    const body = await request.json();

    // 3. Payload validation
    const validationResult = updateAttendanceStatusSchema.safeParse(body);
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

    // 4. Verify attendance record exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existingAttendance) {
      return NextResponse.json(
        { success: false, error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // 5. If setting status to LEAVE, verify that an APPROVED leave request exists for date
    if (status === AttendanceStatus.LEAVE) {
      const onLeave = await hasApprovedLeave(
        existingAttendance.employeeId,
        existingAttendance.date
      );

      if (!onLeave) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot set status to LEAVE: No approved leave request exists for this employee on this date.',
          },
          { status: 400 }
        );
      }
    }

    // 6. Update status (preserving checkIn/checkOut timestamps)
    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { status },
    });

    return NextResponse.json(
      {
        success: true,
        data: { attendance: updatedAttendance },
        message: `Attendance status updated to ${status}.`,
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

    console.error('Error updating attendance status:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating attendance status.' },
      { status: 500 }
    );
  }
}
