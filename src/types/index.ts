import { Role, EmploymentStatus, AttendanceStatus, LeaveType, LeaveStatus } from '@prisma/client';

export { Role, EmploymentStatus, AttendanceStatus, LeaveType, LeaveStatus };


export interface UserSession {
  id: string;
  email: string;
  role: Role;
  employeeId: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    phone: string;
    joiningDate: string;
    status: EmploymentStatus;
  };
}

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: EmploymentStatus;
  managerId: string | null;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    role: Role;
  } | null;
  manager?: {
    id: string;
    fullName: string;
    email: string;
    designation?: string;
  } | null;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: AttendanceStatus;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string;
    department: string;
    designation: string;
  };
}



export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
}

export interface LeaveRequestRecord {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    email?: string;
    department?: string;
    designation?: string;
  };
  reviewedBy?: {
    id: string;
    fullName: string;
  } | null;
}

export interface EmployeeDashboardData {
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    status: EmploymentStatus;
  };
  todayAttendance: {
    status: string;
    checkIn: string | null;
    checkOut: string | null;
  };
  leaveSummary: {
    pending: number;
    approved: number;
    rejected: number;
  };
  recentLeaveRequests: Array<{
    id: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    status: LeaveStatus;
    rejectionReason?: string | null;
    reason?: string;
  }>;
}

export interface ManagerDashboardData {
  teamSize: number;
  teamAttendanceToday: {
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    notCheckedIn: number;
  };
  pendingLeaveCount: number;
  recentLeaveRequests: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    status: LeaveStatus;
  }>;
  teamMembers: Array<{
    id: string;
    employeeCode: string;
    fullName: string;
    department: string;
    designation: string;
    status: EmploymentStatus;
  }>;
}

export interface HrDashboardData {
  employeeSummary: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
  };
  todayAttendance: {
    present: number;
    absent: number;
    halfDay: number;
    leave: number;
    notCheckedIn: number;
  };
  leaveSummary: {
    pending: number;
    approved: number;
    rejected: number;
  };
  pendingLeaveRequests: Array<{
    id: string;
    employeeName: string;
    employeeCode: string;
    department: string;
    leaveType: LeaveType;
    startDate: string;
    endDate: string;
    reason: string;
  }>;
  departmentOverview: Array<{
    department: string;
    employeeCount: number;
  }>;
}

export type DashboardData = EmployeeDashboardData | ManagerDashboardData | HrDashboardData;

