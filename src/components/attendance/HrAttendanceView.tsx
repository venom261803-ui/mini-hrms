'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  CalendarCheck,
  Search,
  Sliders,
  RotateCcw,
  Users,
  AlertCircle,
  XCircle,
  Building,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, UserSession } from '@/types';
import HrStatusCorrectionModal from './HrStatusCorrectionModal';

interface HrAttendanceViewProps {
  session: UserSession;
}

export default function HrAttendanceView({ session }: HrAttendanceViewProps) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [employeeIdFilter, setEmployeeIdFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceRecord | null>(null);

  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (employeeIdFilter) params.append('employeeId', employeeIdFilter);
      if (departmentFilter) params.append('department', departmentFilter);
      if (dateFilter) params.append('date', dateFilter);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);

      const response = await fetch(`/api/attendance?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to fetch company attendance');
        return;
      }

      setAttendances(result.data?.attendances || []);
    } catch (err: any) {
      setError(err.message || 'Network error fetching company attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [employeeIdFilter, departmentFilter, dateFilter, fromDate, toDate, statusFilter]);

  const hasActiveFilters =
    employeeIdFilter !== '' ||
    departmentFilter !== '' ||
    dateFilter !== '' ||
    fromDate !== '' ||
    toDate !== '' ||
    statusFilter !== 'ALL';

  const clearFilters = () => {
    setEmployeeIdFilter('');
    setDepartmentFilter('');
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
              Company Attendance Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {attendances.length} {attendances.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global organization attendance logs, multi-attribute filtering, and manual status corrections
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Employee Search/ID */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Employee ID</label>
            <input
              type="text"
              placeholder="e.g. EMP004"
              value={employeeIdFilter}
              onChange={(e) => setEmployeeIdFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Department</label>
            <input
              type="text"
              placeholder="e.g. Engineering"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Single Date */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Single Date</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] text-slate-400 uppercase mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value={AttendanceStatus.PRESENT}>PRESENT</option>
              <option value={AttendanceStatus.ABSENT}>ABSENT</option>
              <option value={AttendanceStatus.HALF_DAY}>HALF_DAY</option>
              <option value={AttendanceStatus.LEAVE}>LEAVE</option>
            </select>
          </div>
        </div>

        {/* Reset Filters Action */}
        {hasActiveFilters && (
          <div className="flex justify-end pt-1">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 hover:text-white transition"
            >
              <XCircle className="h-3.5 w-3.5 text-slate-400" />
              Reset All Filters
            </button>
          </div>
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
            onClick={fetchAttendance}
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

      {/* Table Data */}
      {!isLoading && !error && (
        <>
          {attendances.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 mb-3">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-md font-semibold text-white">No attendance records found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                No attendance logs match your search and filter parameters.
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
                      <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
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
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedAttendance(rec)}
                              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition"
                              title="Correct Attendance Status"
                              aria-label={`Correct status for ${rec.employee?.fullName}`}
                            >
                              <Sliders className="h-4 w-4" />
                            </button>
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

      {/* HR Status Correction Modal */}
      <HrStatusCorrectionModal
        isOpen={!!selectedAttendance}
        attendance={selectedAttendance}
        onClose={() => setSelectedAttendance(null)}
        onSuccess={fetchAttendance}
      />
    </div>
  );
}
