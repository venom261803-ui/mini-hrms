'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  Calendar,
  History,
  AlertTriangle,
} from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, UserSession } from '@/types';
import { toast } from 'sonner';

interface EmployeeAttendanceViewProps {
  session: UserSession;
}

export default function EmployeeAttendanceView({ session }: EmployeeAttendanceViewProps) {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check-in & Check-out action states
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchAttendance = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/attendance');
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to fetch attendance history');
        return;
      }

      setAttendances(result.data?.attendances || []);
    } catch (err: any) {
      setError(err.message || 'Network error fetching attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // Today's normalized ISO date string YYYY-MM-DD
  const todayIsoDate = new Date().toISOString().split('T')[0];

  // Find today's attendance record from fetched list
  const todayRecord = useMemo(() => {
    return attendances.find((rec) => {
      const recDate = rec.date ? new Date(rec.date).toISOString().split('T')[0] : '';
      return recDate === todayIsoDate;
    });
  }, [attendances, todayIsoDate]);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    setActionError(null);
    try {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.error || 'Check-in failed';
        setActionError(msg);
        toast.error(msg);
        return;
      }

      toast.success(result.message || 'Successfully checked in!');
      await fetchAttendance();
    } catch (err: any) {
      const msg = err.message || 'Network error during check-in';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setIsCheckingOut(true);
    setActionError(null);
    try {
      const response = await fetch('/api/attendance/check-out', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.error || 'Check-out failed';
        setActionError(msg);
        toast.error(msg);
        return;
      }

      toast.success(result.message || 'Successfully checked out!');
      await fetchAttendance();
    } catch (err: any) {
      const msg = err.message || 'Network error during check-out';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toISOString().split('T')[0];
  };

  const isCheckedInToday = !!todayRecord && todayRecord.checkIn !== null;
  const isCheckedOutToday = !!todayRecord && todayRecord.checkOut !== null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
            <CalendarCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              My Attendance Workspace
            </h1>
            <p className="text-xs text-slate-400">
              Check in for work, record daily departure, and review attendance history
            </p>
          </div>
        </div>
      </div>

      {/* Action Error Notification */}
      {actionError && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">{actionError}</div>
        </div>
      )}

      {/* Today's Attendance Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Today's Date
            </span>
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Calendar className="h-5 w-5 text-blue-400" />
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          </div>

          {/* Current Status Badge */}
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1 text-right">
              Today's Status
            </span>
            <div>
              {!todayRecord || !todayRecord.checkIn ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Not Checked In
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    todayRecord.status === AttendanceStatus.PRESENT
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : todayRecord.status === AttendanceStatus.HALF_DAY
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : todayRecord.status === AttendanceStatus.LEAVE
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      todayRecord.status === AttendanceStatus.PRESENT ? 'bg-emerald-400 animate-pulse' : 'bg-current'
                    }`}
                  />
                  {todayRecord.status}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Timestamps & Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Check-In Timestamp Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-400" /> Check In Time
            </span>
            <span className="text-xl font-mono font-bold text-white block">
              {formatTime(todayRecord?.checkIn || null)}
            </span>
          </div>

          {/* Check-Out Timestamp Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
            <span className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> Check Out Time
            </span>
            <span className="text-xl font-mono font-bold text-white block">
              {formatTime(todayRecord?.checkOut || null)}
            </span>
          </div>

          {/* Action Button Container */}
          <div className="flex flex-col justify-center gap-3">
            {!isCheckedInToday ? (
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
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
            ) : !isCheckedOutToday ? (
              <button
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
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
              <div className="w-full py-3 px-4 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-center text-xs font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Completed for Today
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attendance History Table Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-400" />
            My Attendance History
          </h2>
          <span className="text-xs text-slate-400">
            {attendances.length} {attendances.length === 1 ? 'Record' : 'Records'}
          </span>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-3 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 bg-slate-800 rounded-lg w-full"></div>
            ))}
          </div>
        )}

        {/* Fetch Error Banner */}
        {error && !isLoading && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* History Table */}
        {!isLoading && !error && (
          <>
            {attendances.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-slate-400 text-sm">
                No attendance history recorded yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <tr>
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
                            <td className="px-5 py-4 font-mono text-xs text-white">
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
    </div>
  );
}
