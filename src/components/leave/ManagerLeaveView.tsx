'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CalendarCheck,
  CheckCircle2,
  Ban,
  Clock,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  Calendar,
} from 'lucide-react';
import { LeaveRequestRecord, LeaveType, LeaveStatus, UserSession } from '@/types';
import LeaveRejectionModal from './LeaveRejectionModal';
import LeaveDetailModal from './LeaveDetailModal';
import { toast } from 'sonner';

interface ManagerLeaveViewProps {
  session: UserSession;
}

export default function ManagerLeaveView({ session }: ManagerLeaveViewProps) {
  // Leave List & Loading States
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Approval Loading per item
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Modal States
  const [rejectingItem, setRejectingItem] = useState<{ id: string; employeeName: string } | null>(null);
  const [selectedDetailItem, setSelectedDetailItem] = useState<LeaveRequestRecord | null>(null);

  // Fetch Team Leave Requests with Backend Filters
  const fetchTeamLeave = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (leaveTypeFilter !== 'ALL') params.append('leaveType', leaveTypeFilter);
      if (startDateFilter) params.append('startDate', startDateFilter);
      if (endDateFilter) params.append('endDate', endDateFilter);

      const queryString = params.toString();
      const url = queryString ? `/api/leave?${queryString}` : '/api/leave';

      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.error || 'Failed to load team leave requests.');
        return;
      }

      setLeaveRequests(result.data?.leaveRequests || []);
    } catch (err: any) {
      setError(err.message || 'Network error fetching team leave requests.');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, leaveTypeFilter, startDateFilter, endDateFilter]);

  useEffect(() => {
    fetchTeamLeave();
  }, [fetchTeamLeave]);

  // Handle Apply & Clear Filters
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTeamLeave();
  };

  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setLeaveTypeFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  // Approve Handler
  const handleApprove = async (id: string, employeeName: string) => {
    setApprovingId(id);
    try {
      const response = await fetch(`/api/leave/${id}/approve`, {
        method: 'PATCH',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.error || 'Failed to approve leave request.';
        toast.error(msg);
        return;
      }

      toast.success(result.message || `Leave approved for ${employeeName}.`);
      await fetchTeamLeave();
    } catch (err: any) {
      toast.error(err.message || 'Network error while approving leave.');
    } finally {
      setApprovingId(null);
    }
  };

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-xl border border-slate-800 bg-slate-900/90 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-wider mb-1">
            <Users className="h-4 w-4" />
            Manager Workspace
          </div>
          <h1 className="text-2xl font-bold text-white">Team Leave Approvals</h1>
          <p className="text-xs text-slate-400 mt-1">
            Review, approve, or reject leave requests submitted by your direct team members.
          </p>
        </div>
      </div>

      {/* Filter Bar Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <form onSubmit={handleApplyFilters} className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
            <Filter className="h-4 w-4 text-blue-400" />
            Filter Team Leave Requests
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value={LeaveStatus.PENDING}>PENDING</option>
                <option value={LeaveStatus.APPROVED}>APPROVED</option>
                <option value={LeaveStatus.REJECTED}>REJECTED</option>
              </select>
            </div>

            {/* Leave Type Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Leave Type</label>
              <select
                value={leaveTypeFilter}
                onChange={(e) => setLeaveTypeFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value={LeaveType.CASUAL}>CASUAL</option>
                <option value={LeaveType.SICK}>SICK</option>
                <option value={LeaveType.ANNUAL}>ANNUAL</option>
                <option value={LeaveType.UNPAID}>UNPAID</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">From Date</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Clear Filters
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition shadow-md shadow-blue-600/20"
            >
              <Filter className="h-3.5 w-3.5" />
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Team Leave Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-400" />
            <h3 className="font-semibold text-white">Direct Team Leave Queue</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Count: {leaveRequests.length}
          </span>
        </div>

        {error && (
          <div className="p-6 text-center text-red-400 space-y-3">
            <AlertCircle className="h-8 w-8 mx-auto" />
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={fetchTeamLeave}
              className="px-4 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading && !error && (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs font-medium">Loading team leave requests...</p>
          </div>
        )}

        {!isLoading && !error && leaveRequests.length === 0 && (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Calendar className="h-10 w-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No team leave requests found.</p>
            <p className="text-xs text-slate-500">
              There are currently no leave requests matching your criteria.
            </p>
          </div>
        )}

        {!isLoading && !error && leaveRequests.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {leaveRequests.map((item) => {
                  const empName = item.employee?.fullName || 'Employee';
                  const empCode = item.employee?.employeeCode || 'N/A';
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
                  const isPending = item.status === LeaveStatus.PENDING;
                  const isCurrentApproving = approvingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white block">{empName}</span>
                        <span className="text-xs text-blue-400 font-mono block">{empCode}</span>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3.5 px-4 font-semibold text-xs text-slate-200 uppercase">
                        {item.leaveType}
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <span className="text-white block">{startFormatted}</span>
                        <span className="text-slate-400 block text-[11px]">to {endFormatted}</span>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-xs text-slate-200 line-clamp-2">{item.reason}</p>
                        {item.status === LeaveStatus.REJECTED && item.rejectionReason && (
                          <div className="mt-1 text-[11px] text-red-400 bg-red-500/10 p-1.5 rounded border border-red-500/20">
                            <span className="font-semibold block">Rejection Reason:</span>
                            {item.rejectionReason}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {renderStatusBadge(item.status)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedDetailItem(item)}
                            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(item.id, empName)}
                                disabled={isCurrentApproving}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                              >
                                {isCurrentApproving ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                )}
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  setRejectingItem({ id: item.id, employeeName: empName })
                                }
                                disabled={isCurrentApproving}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-600 hover:text-white transition disabled:opacity-50"
                              >
                                <Ban className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {rejectingItem && (
        <LeaveRejectionModal
          isOpen={true}
          leaveId={rejectingItem.id}
          employeeName={rejectingItem.employeeName}
          onClose={() => setRejectingItem(null)}
          onSuccess={fetchTeamLeave}
        />
      )}

      {/* Detail Modal */}
      {selectedDetailItem && (
        <LeaveDetailModal
          isOpen={true}
          leaveRequest={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
        />
      )}
    </div>
  );
}
