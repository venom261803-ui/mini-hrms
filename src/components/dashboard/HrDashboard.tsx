'use client';

import Link from 'next/link';
import {
  Shield,
  Users,
  CalendarCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  Ban,
  UserCheck,
  UserX,
  Building,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { HrDashboardData, LeaveStatus } from '@/types';
import DashboardStatCard from './DashboardStatCard';

interface HrDashboardProps {
  data: HrDashboardData;
}

export default function HrDashboard({ data }: HrDashboardProps) {
  const {
    employeeSummary,
    todayAttendance,
    leaveSummary,
    pendingLeaveRequests,
    departmentOverview,
  } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <Shield className="h-4 w-4" />
            HR Administration
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Executive HR Dashboard</h1>
          <p className="text-xs text-slate-400">
            Company-wide analytics, workforce statistics, attendance metrics, and pending approvals.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 pt-2 md:pt-0">
          <Link
            href="/employees"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            <Users className="h-4 w-4 text-blue-400" />
            Employee Directory
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            <CalendarCheck className="h-4 w-4 text-emerald-400" />
            Company Attendance
          </Link>
          <Link
            href="/leave"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-md shadow-blue-600/20 transition"
          >
            <CalendarDays className="h-4 w-4" />
            Company Leave
          </Link>
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard
          title="Total Workforce"
          value={employeeSummary.totalEmployees}
          icon={Users}
          color="blue"
          subtext={`${employeeSummary.activeEmployees} Active • ${employeeSummary.inactiveEmployees} Inactive`}
        />
        <DashboardStatCard
          title="Present Today"
          value={todayAttendance.present}
          icon={UserCheck}
          color="emerald"
          badge={`${todayAttendance.present}/${employeeSummary.activeEmployees}`}
        />
        <DashboardStatCard
          title="On Approved Leave"
          value={todayAttendance.leave}
          icon={CalendarDays}
          color="indigo"
          subtext="Covered by approved leave"
        />
        <DashboardStatCard
          title="Pending Leave Approvals"
          value={leaveSummary.pending}
          icon={Clock}
          color="amber"
          subtext="Awaiting review"
        />
      </div>

      {/* Today's Attendance & Leave Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Attendance Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-400" />
              Company Attendance Breakdown Today
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Present
              </span>
              <span className="text-xl font-bold text-emerald-400">
                {todayAttendance.present}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Absent
              </span>
              <span className="text-xl font-bold text-red-400">{todayAttendance.absent}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Half Day
              </span>
              <span className="text-xl font-bold text-amber-400">
                {todayAttendance.halfDay}
              </span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Leave
              </span>
              <span className="text-xl font-bold text-blue-400">{todayAttendance.leave}</span>
            </div>
          </div>
        </div>

        {/* Leave Summary Breakdown */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-400" />
              Overall Leave Status Metrics
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Pending
              </span>
              <span className="text-xl font-bold text-amber-400">{leaveSummary.pending}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Approved
              </span>
              <span className="text-xl font-bold text-emerald-400">{leaveSummary.approved}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
                Rejected
              </span>
              <span className="text-xl font-bold text-red-400">{leaveSummary.rejected}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Pending Leave Requests & Department Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Pending Leave Requests Table (Spans 2 Columns) */}
        <div className="lg:col-span-2 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold text-white">Pending Leave Queue</h3>
              </div>
              <Link
                href="/leave"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Review All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {pendingLeaveRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No pending leave requests requiring action.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Dates</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {pendingLeaveRequests.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <span className="block">{item.employeeName}</span>
                          <span className="text-[10px] text-blue-400 font-mono">
                            {item.employeeCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">{item.department}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200 uppercase">
                          {item.leaveType}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {new Date(item.startDate).toLocaleDateString()} to{' '}
                          {new Date(item.endDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Department Overview */}
        <div className="lg:col-span-1 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">Department Distribution</h3>
              </div>
            </div>

            {departmentOverview.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No department data recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 text-xs">
                {departmentOverview.map((dept, idx) => (
                  <div
                    key={idx}
                    className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition"
                  >
                    <span className="font-semibold text-slate-200">{dept.department}</span>
                    <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-mono font-bold border border-blue-500/20">
                      {dept.employeeCount} {dept.employeeCount === 1 ? 'employee' : 'employees'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
