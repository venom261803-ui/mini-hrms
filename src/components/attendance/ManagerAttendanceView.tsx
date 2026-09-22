'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  CalendarCheck,
  Filter,
  RotateCcw,
  Users,
  AlertCircle,
  XCircle,
  Building,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, UserSession } from '@/types';

interface ManagerAttendanceViewProps {
  session: UserSession;
}

export default function ManagerAttendanceView({ session }: ManagerAttendanceViewProps) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchTeamAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.append('date', dateFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`/api/attendance?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to fetch team attendance records');
        return;
      }

      setAttendances(result.data?.attendances || []);
    } catch (err: any) {
      setError(err.message || 'Network error fetching team attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAttendance();
  }, [dateFilter, fromDate, toDate, statusFilter]);

  const hasActiveFilters = dateFilter !== '' || fromDate !== '' || toDate !== '' || statusFilter !== 'ALL';

  const clearFilters = () => {
    setDateFilter('');
    setFromDate('');
    setToDate('');
    setStatusFilter('ALL');
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Team Attendance Records
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {attendances.length} {attendances.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Read-only attendance logs for employees directly assigned under your team management
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Specific Date Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Single Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value={AttendanceStatus.PRESENT}>PRESENT</option>
              <option value={AttendanceStatus.ABSENT}>ABSENT</option>
              <option value={AttendanceStatus.HALF_DAY}>HALF_DAY</option>
              <option value={AttendanceStatus.LEAVE}>LEAVE</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="self-end md:self-center flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition"
          >
            <XCircle className="h-3.5 w-3.5 text-slate-400" />
            Reset Filters
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-400 text-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchTeamAttendance}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-xs font-semibold transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Skeletons */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-slate-800 rounded-lg w-full"></div>
          ))}
        </div>
      )}

      {/* Data Table */}
      {!isLoading && !error && (
        <>
          {attendances.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-md font-semibold text-white">No attendance records found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No attendance logs match the active criteria for your team members.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th scope="col" className="px-5 py-3.5">Employee ID</th>
                      <th scope="col" className="px-5 py-3.5">Full Name</th>
                      <th scope="col" className="px-5 py-3.5">Department</th>
                      <th scope="col" className="px-5 py-3.5">Date</th>
                      <th scope="col" className="px-5 py-3.5">Status</th>
                      <th scope="col" className="px-5 py-3.5">Check In</th>
                      <th scope="col" className="px-5 py-3.5">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {attendances.map((rec) => {
                      const isPresent = rec.status === AttendanceStatus.PRESENT;
                      return (
                        <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                          <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-400 whitespace-nowrap">
                            {rec.employee?.employeeCode || 'N/A'}
                          </td>
                          <td className="px-5 py-4 font-semibold text-white whitespace-nowrap">
                            {rec.employee?.fullName || 'Employee'}
                          </td>
                          <td className="px-5 py-4 text-xs whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                              <Building className="h-3 w-3 text-slate-400" />
                              {rec.employee?.department || 'N/A'}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                            {formatDate(rec.date)}
                          </td>
                          <td className="px-5 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                                isPresent
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : rec.status === AttendanceStatus.HALF_DAY
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : rec.status === AttendanceStatus.LEAVE
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                            {formatTime(rec.checkIn)}
                          </td>
                          <td className="px-5 py-4 font-mono text-xs text-slate-300 whitespace-nowrap">
                            {formatTime(rec.checkOut)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
