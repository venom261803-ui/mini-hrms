'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  User,
  CalendarCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  Ban,
  LogIn,
  LogOut,
  Loader2,
  ArrowRight,
  FileText,
  Building,
} from 'lucide-react';
import { EmployeeDashboardData, LeaveStatus, AttendanceStatus } from '@/types';
import DashboardStatCard from './DashboardStatCard';
import { toast } from 'sonner';

interface EmployeeDashboardProps {
  data: EmployeeDashboardData;
  onRefresh: () => void;
}

export default function EmployeeDashboard({ data, onRefresh }: EmployeeDashboardProps) {
  const { employee, todayAttendance, leaveSummary, recentLeaveRequests } = data;

  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Quick Action Check-in
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      const response = await fetch('/api/attendance/check-in', { method: 'POST' });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Check-in failed');
        return;
      }

      toast.success(result.message || 'Successfully checked in!');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Network error during check-in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Quick Action Check-out
  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    try {
      const response = await fetch('/api/attendance/check-out', { method: 'POST' });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Check-out failed');
        return;
      }

      toast.success(result.message || 'Successfully checked out!');
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Network error during check-out');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isNotCheckedIn = todayAttendance.status === 'NOT_CHECKED_IN' || !todayAttendance.checkIn;
  const isCheckedIn = !!todayAttendance.checkIn;
  const isCheckedOut = !!todayAttendance.checkOut;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* A. Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <User className="h-4 w-4" />
            Employee Workspace
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Welcome back, {employee.fullName}
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-2">
            <Building className="h-3.5 w-3.5 text-slate-500" />
            <span>{employee.department}</span> • <span>{employee.designation}</span> •{' '}
            <span className="font-mono text-blue-400">{employee.employeeCode}</span>
          </p>
        </div>

        {/* E. Quick Actions Bar */}
        <div className="flex items-center gap-2 pt-2 md:pt-0">
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            <CalendarCheck className="h-4 w-4 text-blue-400" />
            Attendance
          </Link>
          <Link
            href="/leave"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-md shadow-blue-600/20 transition"
          >
            <CalendarDays className="h-4 w-4" />
            Apply Leave
          </Link>
        </div>
      </div>

      {/* B & C. Top Metrics & Today Attendance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Today's Attendance Card (Spans 2 Columns) */}
        <div className="md:col-span-2 rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">Today's Attendance</h3>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                todayAttendance.status === AttendanceStatus.PRESENT
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : todayAttendance.status === AttendanceStatus.HALF_DAY
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : todayAttendance.status === AttendanceStatus.LEAVE
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {todayAttendance.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Check In Time
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {formatTime(todayAttendance.checkIn)}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Check Out Time
              </span>
              <span className="text-lg font-mono font-bold text-white">
                {formatTime(todayAttendance.checkOut)}
              </span>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="pt-2">
            {isNotCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-500 transition shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {isCheckingIn ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking In...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Check In Now
                  </>
                )}
              </button>
            ) : isCheckedIn && !isCheckedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking Out...
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    Check Out Now
                  </>
                )}
              </button>
            ) : (
              <div className="py-2.5 px-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs font-semibold text-emerald-400 flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Attendance completed for today
              </div>
            )}
          </div>
        </div>

        {/* C. Leave Summary Cards */}
        <div className="md:col-span-2 grid grid-cols-3 gap-4">
          <DashboardStatCard
            title="Pending Leaves"
            value={leaveSummary.pending}
            icon={Clock}
            color="amber"
            subtext="Awaiting review"
          />
          <DashboardStatCard
            title="Approved Leaves"
            value={leaveSummary.approved}
            icon={CheckCircle2}
            color="emerald"
            subtext="Total approved"
          />
          <DashboardStatCard
            title="Rejected Leaves"
            value={leaveSummary.rejected}
            icon={Ban}
            color="red"
            subtext="Total rejected"
          />
        </div>
      </div>

      {/* D. Recent Leave Requests */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Recent Leave Requests</h3>
          </div>
          <Link
            href="/leave"
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
          >
            View All
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {recentLeaveRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No recent leave requests found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {recentLeaveRequests.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-semibold text-white uppercase">
                      {item.leaveType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {new Date(item.startDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {new Date(item.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === LeaveStatus.APPROVED
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : item.status === LeaveStatus.REJECTED
                            ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
