'use client';

import Link from 'next/link';
import {
  Users,
  CalendarCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  Ban,
  UserCheck,
  UserX,
  ArrowRight,
  Shield,
  Building,
} from 'lucide-react';
import { ManagerDashboardData, LeaveStatus, EmploymentStatus } from '@/types';
import DashboardStatCard from './DashboardStatCard';

interface ManagerDashboardProps {
  data: ManagerDashboardData;
}

export default function ManagerDashboard({ data }: ManagerDashboardProps) {
  const { teamSize, teamAttendanceToday, pendingLeaveCount, recentLeaveRequests, teamMembers } =
    data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider">
            <Users className="h-4 w-4" />
            Manager Team Workspace
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Team Dashboard</h1>
          <p className="text-xs text-slate-400">
            Real-time operational summary of your assigned direct reports.
          </p>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 pt-2 md:pt-0">
          <Link
            href="/employees"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            <Users className="h-4 w-4 text-blue-400" />
            Team Directory
          </Link>
          <Link
            href="/attendance"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            <CalendarCheck className="h-4 w-4 text-emerald-400" />
            Team Attendance
          </Link>
          <Link
            href="/leave"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-md shadow-blue-600/20 transition"
          >
            <CalendarDays className="h-4 w-4" />
            Team Leave Requests
          </Link>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard
          title="Direct Team Size"
          value={teamSize}
          icon={Users}
          color="blue"
          subtext="Assigned direct reports"
        />
        <DashboardStatCard
          title="Present Today"
          value={teamAttendanceToday.present}
          icon={UserCheck}
          color="emerald"
          badge={`${teamAttendanceToday.present}/${teamSize}`}
        />
        <DashboardStatCard
          title="On Leave Today"
          value={teamAttendanceToday.leave}
          icon={CalendarDays}
          color="indigo"
          subtext="Approved leave today"
        />
        <DashboardStatCard
          title="Pending Leave Queue"
          value={pendingLeaveCount}
          icon={Clock}
          color="amber"
          subtext="Requires manager review"
        />
      </div>

      {/* Today's Team Attendance Breakdown */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-400" />
            Today's Team Attendance Summary
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
              Present
            </span>
            <span className="text-xl font-bold text-emerald-400">
              {teamAttendanceToday.present}
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
              Absent
            </span>
            <span className="text-xl font-bold text-red-400">{teamAttendanceToday.absent}</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
              Half Day
            </span>
            <span className="text-xl font-bold text-amber-400">
              {teamAttendanceToday.halfDay}
            </span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
              Leave
            </span>
            <span className="text-xl font-bold text-blue-400">{teamAttendanceToday.leave}</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block mb-1">
              Not Checked In
            </span>
            <span className="text-xl font-bold text-slate-400">
              {teamAttendanceToday.notCheckedIn}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Recent Team Leave Requests & Team Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Team Leave Requests */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">Recent Team Leave Requests</h3>
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
                No recent team leave requests found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-xs">
                    {recentLeaveRequests.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-semibold text-white">
                          <span className="block">{item.employeeName}</span>
                          <span className="text-[10px] text-blue-400 font-mono">
                            {item.employeeCode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300 uppercase">
                          {item.leaveType}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">
                          {new Date(item.startDate).toLocaleDateString()}
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

        {/* Compact Team Roster */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">Direct Team Roster</h3>
              </div>
              <Link
                href="/employees"
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                Full Roster
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {teamMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No direct team members assigned.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60 text-xs">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition"
                  >
                    <div>
                      <span className="font-semibold text-white block">{member.fullName}</span>
                      <span className="text-[11px] text-slate-400">
                        {member.department} • {member.designation}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-blue-400 font-mono block">
                        {member.employeeCode}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          member.status === EmploymentStatus.ACTIVE
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
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
