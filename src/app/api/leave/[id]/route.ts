import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { Role } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            department: true,
            designation: true,
            managerId: true,
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

    if (!leaveRequest) {
      return NextResponse.json(
        { success: false, error: 'Leave request not found' },
        { status: 404 }
      );
    }

    // Role-based access control
    if (session.role === Role.EMPLOYEE) {
      if (leaveRequest.employeeId !== session.employeeId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only access your own leave requests.' },
          { status: 403 }
        );
      }
    } else if (session.role === Role.MANAGER) {
      if (
        leaveRequest.employeeId !== session.employeeId &&
        leaveRequest.employee.managerId !== session.employeeId
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only access leave requests for your team members.' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: { leaveRequest },
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

    console.error('Error fetching single leave request:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
