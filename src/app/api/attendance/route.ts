import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { getNormalizedDate } from '@/lib/attendance';
import { attendanceFilterSchema } from '@/validations/attendance.schema';
import { Role, AttendanceStatus } from '@prisma/client';

export async function GET(request: Request) {
  try {
    // 1. Authenticate user & assert active employment status
    const session = await requireAuth();

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawQueryParams = {
      employeeId: searchParams.get('employeeId') || undefined,
      date: searchParams.get('date') || undefined,
      fromDate: searchParams.get('fromDate') || undefined,
      toDate: searchParams.get('toDate') || undefined,
      status: searchParams.get('status') as AttendanceStatus | undefined,
    };

    const validationResult = attendanceFilterSchema.safeParse(rawQueryParams);
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

    const { employeeId: requestedEmployeeId, date, fromDate, toDate, status } = validationResult.data;

    // 3. Build Prisma where clause according to user role
    const whereClause: any = {};

    // --- EMPLOYEE ROLE ACCESS SCOPING ---
    if (session.role === Role.EMPLOYEE) {
      if (requestedEmployeeId && requestedEmployeeId !== session.employeeId) {
        return NextResponse.json(
          { success: false, error: "Forbidden: You can only access your own attendance records." },
          { status: 403 }
        );
      }
      whereClause.employeeId = session.employeeId;
    }

    // --- MANAGER ROLE ACCESS SCOPING ---
    else if (session.role === Role.MANAGER) {
      if (requestedEmployeeId) {
        if (requestedEmployeeId !== session.employeeId) {
          // Verify target employee belongs to Manager's team
          const targetEmployee = await prisma.employee.findUnique({
            where: { id: requestedEmployeeId },
            select: { id: true, managerId: true },
          });

          if (!targetEmployee || targetEmployee.managerId !== session.employeeId) {
            return NextResponse.json(
              { success: false, error: 'Forbidden: You can only access attendance records for your team members.' },
              { status: 403 }
            );
          }
        }
        whereClause.employeeId = requestedEmployeeId;
      } else {
        // Manager sees own attendance AND direct team reports
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

    // 4. Additional filter parameters (status, date, date range)
    if (status) {
      whereClause.status = status;
    }

    if (date) {
      whereClause.date = getNormalizedDate(date);
    } else if (fromDate || toDate) {
      whereClause.date = {
        ...(fromDate ? { gte: getNormalizedDate(fromDate) } : {}),
        ...(toDate ? { lte: getNormalizedDate(toDate) } : {}),
      };
    }

    // Department query parameter (optional filter)
    const departmentParam = searchParams.get('department');
    if (departmentParam) {
      whereClause.employee = {
        ...(whereClause.employee || {}),
        department: departmentParam,
      };
    }

    // 5. Query attendance records from database
    const attendances = await prisma.attendance.findMany({
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
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        data: { attendances, total: attendances.length },
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

    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while fetching attendance.' },
      { status: 500 }
    );
  }
}
