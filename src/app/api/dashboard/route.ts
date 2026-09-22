import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthError } from '@/lib/permissions';
import { getNormalizedDate } from '@/lib/attendance';
import { Role, EmploymentStatus, AttendanceStatus, LeaveStatus } from '@prisma/client';

export async function GET() {
  try {
    // 1. Authenticate user session & verify active employment status
    const session = await requireAuth();

    const today = getNormalizedDate();

    // ==================================================
    // 1. EMPLOYEE DASHBOARD AGGREGATION
    // ==================================================
    if (session.role === Role.EMPLOYEE) {
      // Employee Summary
      const employee = await prisma.employee.findUnique({
        where: { id: session.employeeId },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          status: true,
        },
      });

      // Today's Attendance for authenticated employee
      const todayAttendanceRecord = await prisma.attendance.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.employeeId,
            date: today,
          },
        },
        select: {
          status: true,
          checkIn: true,
          checkOut: true,
        },
      });

      const todayAttendance = {
        status: todayAttendanceRecord?.status || 'NOT_CHECKED_IN',
        checkIn: todayAttendanceRecord?.checkIn || null,
        checkOut: todayAttendanceRecord?.checkOut || null,
      };

      // Leave Summary Counts for authenticated employee
      const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
        prisma.leaveRequest.count({
          where: { employeeId: session.employeeId, status: LeaveStatus.PENDING },
        }),
        prisma.leaveRequest.count({
          where: { employeeId: session.employeeId, status: LeaveStatus.APPROVED },
        }),
        prisma.leaveRequest.count({
          where: { employeeId: session.employeeId, status: LeaveStatus.REJECTED },
        }),
      ]);

      // Recent Leave Requests (Latest 5)
      const recentLeaveRecords = await prisma.leaveRequest.findMany({
        where: { employeeId: session.employeeId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          status: true,
          rejectionReason: true,
          reason: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          role: Role.EMPLOYEE,
          data: {
            employee,
            todayAttendance,
            leaveSummary: {
              pending: pendingCount,
              approved: approvedCount,
              rejected: rejectedCount,
            },
            recentLeaveRequests: recentLeaveRecords,
          },
        },
        { status: 200 }
      );
    }

    // ==================================================
    // 2. MANAGER DASHBOARD AGGREGATION
    // ==================================================
    if (session.role === Role.MANAGER) {
      // Fetch manager's direct team members
      const teamMembers = await prisma.employee.findMany({
        where: { managerId: session.employeeId },
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          department: true,
          designation: true,
          status: true,
        },
      });

      const teamSize = teamMembers.length;

      // Team Attendance Today
      const todayTeamAttendance = await prisma.attendance.findMany({
        where: {
          date: today,
          employee: { managerId: session.employeeId },
        },
        select: {
          status: true,
        },
      });

      let presentCount = 0;
      let absentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;

      for (const rec of todayTeamAttendance) {
        if (rec.status === AttendanceStatus.PRESENT) presentCount++;
        else if (rec.status === AttendanceStatus.ABSENT) absentCount++;
        else if (rec.status === AttendanceStatus.HALF_DAY) halfDayCount++;
        else if (rec.status === AttendanceStatus.LEAVE) leaveCount++;
      }

      const recordedCount = todayTeamAttendance.length;
      const notCheckedInCount = Math.max(0, teamSize - recordedCount);

      // Pending Leave Requests count for direct team
      const pendingLeaveCount = await prisma.leaveRequest.count({
        where: {
          status: LeaveStatus.PENDING,
          employee: { managerId: session.employeeId },
        },
      });

      // Recent Team Leave Requests (Latest 5)
      const recentTeamLeaveRecords = await prisma.leaveRequest.findMany({
        where: {
          employee: { managerId: session.employeeId },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          status: true,
          employee: {
            select: {
              fullName: true,
              employeeCode: true,
            },
          },
        },
      });

      const recentTeamLeaveRequests = recentTeamLeaveRecords.map((item) => ({
        id: item.id,
        employeeName: item.employee.fullName,
        employeeCode: item.employee.employeeCode,
        leaveType: item.leaveType,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
      }));

      return NextResponse.json(
        {
          success: true,
          role: Role.MANAGER,
          data: {
            teamSize,
            teamAttendanceToday: {
              present: presentCount,
              absent: absentCount,
              halfDay: halfDayCount,
              leave: leaveCount,
              notCheckedIn: notCheckedInCount,
            },
            pendingLeaveCount,
            recentLeaveRequests: recentTeamLeaveRequests,
            teamMembers,
          },
        },
        { status: 200 }
      );
    }

    // ==================================================
    // 3. HR_ADMIN DASHBOARD AGGREGATION
    // ==================================================
    if (session.role === Role.HR_ADMIN) {
      // Company Employee Summary
      const [totalEmployees, activeEmployees, inactiveEmployees] = await Promise.all([
        prisma.employee.count(),
        prisma.employee.count({ where: { status: EmploymentStatus.ACTIVE } }),
        prisma.employee.count({ where: { status: EmploymentStatus.INACTIVE } }),
      ]);

      // Today's Company Attendance
      const todayCompanyAttendance = await prisma.attendance.findMany({
        where: { date: today },
        select: { status: true },
      });

      let presentCount = 0;
      let absentCount = 0;
      let halfDayCount = 0;
      let leaveCount = 0;

      for (const rec of todayCompanyAttendance) {
        if (rec.status === AttendanceStatus.PRESENT) presentCount++;
        else if (rec.status === AttendanceStatus.ABSENT) absentCount++;
        else if (rec.status === AttendanceStatus.HALF_DAY) halfDayCount++;
        else if (rec.status === AttendanceStatus.LEAVE) leaveCount++;
      }

      const notCheckedInCount = Math.max(0, activeEmployees - todayCompanyAttendance.length);

      // Company Leave Summary
      const [pendingLeave, approvedLeave, rejectedLeave] = await Promise.all([
        prisma.leaveRequest.count({ where: { status: LeaveStatus.PENDING } }),
        prisma.leaveRequest.count({ where: { status: LeaveStatus.APPROVED } }),
        prisma.leaveRequest.count({ where: { status: LeaveStatus.REJECTED } }),
      ]);

      // Pending Leave Requests (Latest 5 company-wide pending)
      const pendingLeaveRecords = await prisma.leaveRequest.findMany({
        where: { status: LeaveStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          leaveType: true,
          startDate: true,
          endDate: true,
          reason: true,
          employee: {
            select: {
              fullName: true,
              employeeCode: true,
              department: true,
            },
          },
        },
      });

      const pendingLeaveRequests = pendingLeaveRecords.map((item) => ({
        id: item.id,
        employeeName: item.employee.fullName,
        employeeCode: item.employee.employeeCode,
        department: item.employee.department,
        leaveType: item.leaveType,
        startDate: item.startDate,
        endDate: item.endDate,
        reason: item.reason,
      }));

      // Department Overview
      const deptGroups = await prisma.employee.groupBy({
        by: ['department'],
        _count: { id: true },
      });

      const departmentOverview = deptGroups.map((g) => ({
        department: g.department || 'Unassigned',
        employeeCount: g._count.id,
      }));

      return NextResponse.json(
        {
          success: true,
          role: Role.HR_ADMIN,
          data: {
            employeeSummary: {
              totalEmployees,
              activeEmployees,
              inactiveEmployees,
            },
            todayAttendance: {
              present: presentCount,
              absent: absentCount,
              halfDay: halfDayCount,
              leave: leaveCount,
              notCheckedIn: notCheckedInCount,
            },
            leaveSummary: {
              pending: pendingLeave,
              approved: approvedLeave,
              rejected: rejectedLeave,
            },
            pendingLeaveRequests,
            departmentOverview,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Forbidden: Role not recognized' },
      { status: 403 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    console.error('Error retrieving dashboard aggregation:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while retrieving dashboard data.' },
      { status: 500 }
    );
  }
}
