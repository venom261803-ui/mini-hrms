import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { getNormalizedDate } from '@/lib/attendance';
import { createLeaveSchema, leaveFilterSchema } from '@/validations/leave.schema';
import { Role, LeaveStatus, LeaveType } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Authenticate session & assert active employment status
    const session = await requireAuth();

    const body = await request.json();

    // 2. Validate request body against Zod schema
    const validationResult = createLeaveSchema.safeParse(body);
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

    const { leaveType, startDate, endDate, reason } = validationResult.data;

    // 3. Normalize dates to UTC midnight
    const normalizedStart = getNormalizedDate(startDate);
    const normalizedEnd = getNormalizedDate(endDate);

    // 4. Validate endDate is not prior to startDate
    if (normalizedEnd < normalizedStart) {
      return NextResponse.json(
        { success: false, error: 'End date cannot be prior to start date.' },
        { status: 400 }
      );
    }

    // 5. Overlapping Leave Check: Reject if new dates overlap PENDING or APPROVED leave
    const overlappingLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: session.employeeId,
        status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
        startDate: { lte: normalizedEnd },
        endDate: { gte: normalizedStart },
      },
    });

    if (overlappingLeave) {
      return NextResponse.json(
        { success: false, error: 'Leave request dates overlap with an existing request.' },
        { status: 409 }
      );
    }

    // 6. Create new LeaveRequest (starts strictly as PENDING)
    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: session.employeeId,
        leaveType,
        startDate: normalizedStart,
        endDate: normalizedEnd,
        reason,
        status: LeaveStatus.PENDING,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: { leaveRequest: newLeaveRequest },
        message: 'Leave request submitted successfully.',
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

    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while submitting leave request.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // 1. Authenticate session & assert active employment status
    const session = await requireAuth();

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawQueryParams = {
      employeeId: searchParams.get('employeeId') || undefined,
      status: searchParams.get('status') as LeaveStatus | undefined,
      leaveType: searchParams.get('leaveType') as LeaveType | undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
    };

    const validationResult = leaveFilterSchema.safeParse(rawQueryParams);
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

    const { employeeId: requestedEmployeeId, status, leaveType, startDate, endDate } = validationResult.data;

    // 3. Build Prisma where clause based on user role
    const whereClause: any = {};

    // --- EMPLOYEE ROLE ACCESS SCOPING ---
    if (session.role === Role.EMPLOYEE) {
      if (requestedEmployeeId && requestedEmployeeId !== session.employeeId) {
        return NextResponse.json(
          { success: false, error: 'Forbidden: You can only access your own leave requests.' },
          { status: 403 }
        );
      }
      whereClause.employeeId = session.employeeId;
    }

    // --- MANAGER ROLE ACCESS SCOPING ---
    else if (session.role === Role.MANAGER) {
      if (requestedEmployeeId) {
        if (requestedEmployeeId !== session.employeeId) {
          const targetEmployee = await prisma.employee.findUnique({
            where: { id: requestedEmployeeId },
            select: { id: true, managerId: true },
          });

          if (!targetEmployee || targetEmployee.managerId !== session.employeeId) {
            return NextResponse.json(
              { success: false, error: 'Forbidden: You can only access leave requests for your team members.' },
              { status: 403 }
            );
          }
        }
        whereClause.employeeId = requestedEmployeeId;
      } else {
        whereClause.OR = [
          { employeeId: session.employeeId },
          { employee: { managerId: session.employeeId } },
        ];
      }
    }

    // --- HR_ADMIN ROLE ACCESS SCOPING ---
    else if (session.role === Role.HR_ADMIN) {
      if (requestedEmployeeId) {
        whereClause.employeeId = requestedEmployeeId;
      }
    }

    // 4. Additional filter parameters
    if (status) {
      whereClause.status = status;
    }

    if (leaveType) {
      whereClause.leaveType = leaveType;
    }

    if (startDate || endDate) {
      whereClause.startDate = {
        ...(startDate ? { gte: getNormalizedDate(startDate) } : {}),
      };
      if (endDate) {
        whereClause.endDate = {
          lte: getNormalizedDate(endDate),
        };
      }
    }

    // 5. Query leave requests from database
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            department: true,
            designation: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: { leaveRequests, total: leaveRequests.length },
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

    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching leave requests.' },
      { status: 500 }
    );
  }
}
