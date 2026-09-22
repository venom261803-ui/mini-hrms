'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sliders, AlertCircle } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus } from '@/types';
import { toast } from 'sonner';

interface HrStatusCorrectionModalProps {
  isOpen: boolean;
  attendance: AttendanceRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HrStatusCorrectionModal({
  isOpen,
  attendance,
  onClose,
  onSuccess,
}: HrStatusCorrectionModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (attendance) {
      setSelectedStatus(attendance.status);
      setErrorMessage(null);
    }
  }, [attendance]);

  if (!isOpen || !attendance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/attendance/${attendance.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.error || 'Failed to update attendance status';
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      toast.success(result.message || `Attendance status updated to ${selectedStatus}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Network error updating attendance status';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDate = attendance.date
    ? new Date(attendance.date).toISOString().split('T')[0]
    : 'N/A';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hr-status-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 id="hr-status-title" className="text-base font-semibold text-white">
                Correct Attendance Status
              </h2>
              <p className="text-xs text-slate-400">HR Manual Status Adjustment</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Employee:</span>
                <span className="font-semibold text-white">
                  {attendance.employee?.fullName || 'Employee'} ({attendance.employee?.employeeCode || 'N/A'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono text-slate-300">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Status:</span>
                <span className="font-semibold text-blue-400">{attendance.status}</span>
              </div>
            </div>

            <div>
              <label htmlFor="new-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                New Attendance Status <span className="text-red-400">*</span>
              </label>
              <select
                id="new-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as AttendanceStatus)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value={AttendanceStatus.PRESENT}>PRESENT</option>
                <option value={AttendanceStatus.ABSENT}>ABSENT</option>
                <option value={AttendanceStatus.HALF_DAY}>HALF_DAY</option>
                <option value={AttendanceStatus.LEAVE}>LEAVE</option>
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Note: Setting status to LEAVE requires an existing APPROVED leave request covering this date.
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-md shadow-blue-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Status'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
