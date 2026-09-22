'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDays,
  PlusCircle,
  Clock,
  CheckCircle2,
  Ban,
  Trash2,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Info,
  X,
} from 'lucide-react';
import { LeaveRequestRecord, LeaveType, LeaveStatus, UserSession } from '@/types';
import { toast } from 'sonner';

interface EmployeeLeaveViewProps {
  session: UserSession;
}

export default function EmployeeLeaveView({ session }: EmployeeLeaveViewProps) {
  // Form State
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.CASUAL);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  // UI & Action States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // History & List States
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequestRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Cancel Confirmation Modal State
  const [cancelModalItem, setCancelModalItem] = useState<LeaveRequestRecord | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch Employee Leave History
  const fetchLeaveHistory = async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch('/api/leave');
      const result = await response.json();

      if (!response.ok || !result.success) {
        setHistoryError(result.error || 'Failed to load leave history.');
        return;
      }

      setLeaveHistory(result.data?.leaveRequests || []);
    } catch (err: any) {
      setHistoryError(err.message || 'Network error fetching leave history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLeaveHistory();
  }, []);

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!leaveType) {
      setFormError('Please select a valid leave type.');
      return;
    }
    if (!startDate) {
      setFormError('Start date is required.');
      return;
    }
    if (!endDate) {
      setFormError('End date is required.');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End date cannot be prior to start date.');
      return;
    }
    if (!reason.trim()) {
      setFormError('Please provide a reason for the leave request.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        let msg = result.error || 'Failed to submit leave request.';
        if (response.status === 409) {
          msg = 'These dates overlap with an existing leave request.';
        }
        setFormError(msg);
        toast.error(msg);
        return;
      }

      toast.success(result.message || 'Leave request submitted successfully.');
      // Reset form fields
      setLeaveType(LeaveType.CASUAL);
      setStartDate('');
      setEndDate('');
      setReason('');
      // Refetch history
      await fetchLeaveHistory();
    } catch (err: any) {
      const msg = err.message || 'Network error submitting leave request.';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Pending Leave Handler
  const handleConfirmCancel = async () => {
    if (!cancelModalItem) return;

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/leave/${cancelModalItem.id}/cancel`, {
        method: 'PATCH',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.error || 'Failed to cancel leave request.';
        toast.error(msg);
        return;
      }

      toast.success(result.message || 'Leave request cancelled.');
      setCancelModalItem(null);
      await fetchLeaveHistory();
    } catch (err: any) {
      toast.error(err.message || 'Network error while cancelling leave.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Format status badge
  const renderStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" />
            APPROVED
          </span>
        );
      case LeaveStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Ban className="h-3 w-3" />
            REJECTED
          </span>
        );
      case LeaveStatus.PENDING:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <CalendarDays className="h-4 w-4" />
            Employee Workspace
          </div>
          <h1 className="text-2xl font-bold text-white">Leave Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Apply for leave, track request statuses, and manage pending applications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Apply Leave Form */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl sticky top-4">
            <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-800 text-white font-semibold">
              <PlusCircle className="h-5 w-5 text-blue-400" />
              <span>Apply for Leave</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Leave Type Select */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Leave Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                >
                  <option value={LeaveType.CASUAL}>CASUAL LEAVE</option>
                  <option value={LeaveType.SICK}>SICK LEAVE</option>
                  <option value={LeaveType.ANNUAL}>ANNUAL LEAVE</option>
                  <option value={LeaveType.UNPAID}>UNPAID LEAVE</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Start Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  End Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (formError) setFormError(null);
                  }}
                  placeholder="Provide brief details for your leave request"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 transition shadow-md shadow-blue-600/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    Submit Leave Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Leave History */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-white">My Leave Requests</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total: {leaveHistory.length}
              </span>
            </div>

            {/* Error view */}
            {historyError && (
              <div className="p-6 text-center text-red-400 space-y-3">
                <AlertCircle className="h-8 w-8 mx-auto" />
                <p className="text-sm font-medium">{historyError}</p>
                <button
                  onClick={fetchLeaveHistory}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoadingHistory && !historyError && (
              <div className="p-8 text-center text-slate-400 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-xs font-medium">Loading your leave requests...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingHistory && !historyError && leaveHistory.length === 0 && (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <Calendar className="h-10 w-10 mx-auto text-slate-600" />
                <p className="text-sm font-semibold text-slate-300">No leave requests found.</p>
                <p className="text-xs text-slate-500">
                  You haven't submitted any leave requests yet. Fill out the form to apply.
                </p>
              </div>
            )}

            {/* History Table */}
            {!isLoadingHistory && !historyError && leaveHistory.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Dates</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {leaveHistory.map((item) => {
                      const startFormatted = new Date(item.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const endFormatted = new Date(item.endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      const startMs = new Date(item.startDate).getTime();
                      const endMs = new Date(item.endDate).getTime();
                      const days = Math.ceil((endMs - startMs) / 86400000) + 1;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40 transition">
                          {/* Leave Type */}
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <span className="block text-xs uppercase">{item.leaveType}</span>
                            <span className="text-[11px] text-slate-500 font-normal">
                              {days} {days === 1 ? 'day' : 'days'}
                            </span>
                          </td>

                          {/* Date Range */}
                          <td className="py-3.5 px-4 text-xs font-mono">
                            <span className="text-white block">{startFormatted}</span>
                            <span className="text-slate-400 block text-[11px]">to {endFormatted}</span>
                          </td>

                          {/* Reason & Rejection Reason */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="text-xs text-slate-200 line-clamp-2">{item.reason}</p>
                            {item.status === LeaveStatus.REJECTED && item.rejectionReason && (
                              <div className="mt-1 text-[11px] text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20">
                                <span className="font-semibold block">Reason:</span>
                                {item.rejectionReason}
                              </div>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {renderStatusBadge(item.status)}
                          </td>

                          {/* Action Button (Cancel ONLY for PENDING) */}
                          <td className="py-3.5 px-4 text-right">
                            {item.status === LeaveStatus.PENDING ? (
                              <button
                                onClick={() => setCancelModalItem(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-600 hover:text-white transition"
                                title="Cancel pending leave"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500 italic">None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Leave Cancellation */}
      {cancelModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-lg">
                <AlertCircle className="h-5 w-5" />
                Cancel Leave Request
              </div>
              <button
                onClick={() => setCancelModalItem(null)}
                disabled={isCancelling}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-300">
                Are you sure you want to cancel this pending{' '}
                <span className="font-semibold text-white uppercase">{cancelModalItem.leaveType}</span> leave
                request from{' '}
                <span className="font-mono text-white">
                  {new Date(cancelModalItem.startDate).toLocaleDateString()}
                </span>{' '}
                to{' '}
                <span className="font-mono text-white">
                  {new Date(cancelModalItem.endDate).toLocaleDateString()}
                </span>
                ?
              </p>
              <p className="text-xs text-slate-400 italic">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalItem(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition shadow-md shadow-red-600/20 disabled:opacity-50"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Yes, Cancel Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
