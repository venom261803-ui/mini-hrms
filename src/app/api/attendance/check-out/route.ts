import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { getNormalizedDate } from '@/lib/attendance';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user & assert active employment status
    const session = await requireAuth();

    const today = getNormalizedDate();
    const now = new Date();

    // 2. Query attendance record for today
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: today,
        },
      },
    });

    // 3. Reject checkout without check-in
    if (!existingAttendance || existingAttendance.checkIn === null) {
      return NextResponse.json(
        { success: false, error: 'Cannot check out without checking in first.' },
        { status: 400 }
      );
    }

    // 4. Reject duplicate checkout
    if (existingAttendance.checkOut !== null) {
      return NextResponse.json(
        { success: false, error: 'Already checked out for today.' },
        { status: 409 }
      );
    }

    // 5. Update checkout timestamp
    const attendance = await prisma.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        checkOut: now,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { attendance },
        message: 'Checked out successfully.',
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

    console.error('Error during attendance check-out:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred during check-out.' },
      { status: 500 }
    );
  }
}
