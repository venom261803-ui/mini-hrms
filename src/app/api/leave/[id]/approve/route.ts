import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, AuthError } from '@/lib/permissions';
import { getNormalizedDate } from '@/lib/attendance';
import { Role, LeaveStatus, AttendanceStatus } from '@prisma/client';

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

    // 3. Find target leave request with employee relation
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

    // 4. Status Check: Must be currently PENDING
    if (targetLeave.status !== LeaveStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Cannot approve a leave request that is not PENDING.' },
        { status: 400 }
      );
    }

    // 5. Self-Approval Lockout: Reviewer cannot approve their own leave request
    if (targetLeave.employeeId === session.employeeId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You cannot approve your own leave request.' },
        { status: 403 }
      );
    }

    // 6. Manager Scope Enforcement: MANAGER can only approve direct team members
    if (session.role === Role.MANAGER) {
      if (targetLeave.employee.managerId !== session.employeeId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only approve leave requests for your direct team members.' },
          { status: 403 }
        );
      }
    }

    // 7. Attendance Integration & Conflict Detection for Leave Date Range
    const startMs = getNormalizedDate(targetLeave.startDate).getTime();
    const endMs = getNormalizedDate(targetLeave.endDate).getTime();
    const dayMs = 86400000;

    const leaveDates: Date[] = [];
    for (let currentMs = startMs; currentMs <= endMs; currentMs += dayMs) {
      leaveDates.push(new Date(currentMs));
    }

    // Check for existing PRESENT attendance conflicts on any requested leave date
    for (const d of leaveDates) {
      const existingAtt = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: targetLeave.employeeId,
            date: d,
          },
        },
      });

      if (existingAtt && existingAtt.status === AttendanceStatus.PRESENT) {
        const formatted = d.toISOString().split('T')[0];
        return NextResponse.json(
          {
            success: false,
            error: `Cannot approve leave: Conflicting PRESENT attendance record already exists for date ${formatted}.`,
          },
          { status: 400 }
        );
      }
    }

    // 8. Execute Approval & Upsert Attendance LEAVE records in a Prisma Transaction
    const updatedLeave = await prisma.$transaction(async (tx) => {
      const approved = await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: {
          status: LeaveStatus.APPROVED,
          reviewedById: session.employeeId,
          reviewedAt: new Date(),
          rejectionReason: null,
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

      // Upsert attendance records with LEAVE status for each approved date
      for (const d of leaveDates) {
        const existingAtt = await tx.attendance.findUnique({
          where: {
            employeeId_date: {
              employeeId: targetLeave.employeeId,
              date: d,
            },
          },
        });

        if (existingAtt) {
          await tx.attendance.update({
            where: { id: existingAtt.id },
            data: { status: AttendanceStatus.LEAVE },
          });
        } else {
          await tx.attendance.create({
            data: {
              employeeId: targetLeave.employeeId,
              date: d,
              status: AttendanceStatus.LEAVE,
            },
          });
        }
      }

      return approved;
    });

    return NextResponse.json(
      {
        success: true,
        data: { leaveRequest: updatedLeave },
        message: 'Leave request approved successfully.',
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

    console.error('Error approving leave request:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while approving leave.' },
      { status: 500 }
    );
  }
}
