import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { getNormalizedDate, hasApprovedLeave } from '@/lib/attendance';
import { AttendanceStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user & assert active employment status
    const session = await requireAuth();

    const today = getNormalizedDate();
    const now = new Date();

    // 2. Reject check-in if employee is on APPROVED leave for today
    const onLeave = await hasApprovedLeave(session.employeeId, today);
    if (onLeave) {
      return NextResponse.json(
        { success: false, error: 'Cannot check in while on approved leave.' },
        { status: 400 }
      );
    }

    // 3. Query existing attendance record for today (employeeId + date unique constraint)
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: today,
        },
      },
    });

    // 4. Reject duplicate check-in if checkIn is already set
    if (existingAttendance && existingAttendance.checkIn !== null) {
      return NextResponse.json(
        { success: false, error: 'Already checked in for today.' },
        { status: 409 }
      );
    }

    // 5. Create or update attendance record for today
    let attendance;
    if (existingAttendance) {
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          checkIn: now,
          status: AttendanceStatus.PRESENT,
        },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          employeeId: session.employeeId,
          date: today,
          checkIn: now,
          checkOut: null,
          status: AttendanceStatus.PRESENT,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: { attendance },
        message: 'Checked in successfully.',
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

    console.error('Error during attendance check-in:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during check-in.' },
      { status: 500 }
    );
  }
}
