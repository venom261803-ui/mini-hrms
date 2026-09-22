import { NextResponse } from 'next/server';
import { getSessionUser, clearSessionCookie } from '@/lib/auth';

import { prisma } from '@/lib/prisma';
import { EmploymentStatus } from '@prisma/client';

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session missing or expired' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        email: true,
        role: true,
        employeeId: true,
        createdAt: true,
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            email: true,
            phone: true,
            department: true,
            designation: true,
            joiningDate: true,
            status: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 401 }
      );
    }

    // Lockout check if employee was deactivated after logging in
    if (user.employee.status === EmploymentStatus.INACTIVE) {
      await clearSessionCookie();
      return NextResponse.json(
        { success: false, error: 'Account inactive. Contact HR for assistance.' },
        { status: 403 }
      );
    }


    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            employee: user.employee,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve session user' },
      { status: 500 }
    );
  }
}
