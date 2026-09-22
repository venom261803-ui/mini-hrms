'use client';

import { X, Calendar, User, CheckCircle2, Ban, Clock, FileText, ShieldAlert } from 'lucide-react';
import { LeaveRequestRecord, LeaveStatus } from '@/types';

interface LeaveDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveRequest: LeaveRequestRecord | null;
}

export default function LeaveDetailModal({
  isOpen,
  onClose,
  leaveRequest,
}: LeaveDetailModalProps) {
  if (!isOpen || !leaveRequest) return null;

  const startFormatted = leaveRequest.startDate
    ? new Date(leaveRequest.startDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  const endFormatted = leaveRequest.endDate
    ? new Date(leaveRequest.endDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

  // Calculate duration in calendar days
  const startMs = new Date(leaveRequest.startDate).getTime();
  const endMs = new Date(leaveRequest.endDate).getTime();
  const durationDays = Math.ceil((endMs - startMs) / 86400000) + 1;

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case LeaveStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Ban className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      case LeaveStatus.PENDING:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3.5 w-3.5" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-blue-400">
            <FileText className="h-5 w-5" />
            <h3 className="font-semibold text-lg text-white">Leave Request Details</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="mt-4 space-y-4 text-sm">
          {/* Status & Category */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Leave Type</span>
              <span className="font-bold text-white tracking-wide uppercase">{leaveRequest.leaveType}</span>
            </div>
            <div>{getStatusBadge(leaveRequest.status)}</div>
          </div>

          {/* Employee Info if available */}
          {leaveRequest.employee && (
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <User className="h-3.5 w-3.5 text-blue-400" />
                Applicant Information
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                <div>
                  <span className="text-slate-400 block">Name:</span>
                  <span className="text-white font-medium">{leaveRequest.employee.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Employee Code:</span>
                  <span className="text-blue-400 font-mono font-medium">{leaveRequest.employee.employeeCode}</span>
                </div>
                {leaveRequest.employee.department && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Department: </span>
                    <span className="text-slate-200">{leaveRequest.employee.department}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date Range & Duration */}
          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-center">
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Start Date</span>
              <span className="text-xs text-white font-semibold">{startFormatted}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">End Date</span>
              <span className="text-xs text-white font-semibold">{endFormatted}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Duration</span>
              <span className="text-xs text-blue-400 font-semibold">{durationDays} {durationDays === 1 ? 'Day' : 'Days'}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider mb-1">
              Reason for Leave
            </span>
            <p className="text-xs text-slate-200 bg-slate-950 p-2.5 rounded border border-slate-800 whitespace-pre-wrap leading-relaxed">
              {leaveRequest.reason || 'No reason provided.'}
            </p>
          </div>

          {/* Review Metadata / Rejection Reason */}
          {leaveRequest.status === LeaveStatus.REJECTED && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-red-400 uppercase tracking-wider">
                <ShieldAlert className="h-4 w-4" />
                Rejection Reason
              </div>
              <p className="text-red-200 pt-1 font-medium">
                {leaveRequest.rejectionReason || 'No specific rejection reason supplied.'}
              </p>
            </div>
          )}

          {leaveRequest.reviewedBy && (
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 text-xs grid grid-cols-2 gap-2 text-slate-400">
              <div>
                <span>Reviewed By: </span>
                <span className="text-slate-200 font-medium">{leaveRequest.reviewedBy.fullName}</span>
              </div>
              {leaveRequest.reviewedAt && (
                <div>
                  <span>Reviewed Date: </span>
                  <span className="text-slate-200 font-medium">
                    {new Date(leaveRequest.reviewedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
