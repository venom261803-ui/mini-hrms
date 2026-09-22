'use client';

import { useState } from 'react';
import { X, AlertCircle, Loader2, Ban } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveRejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaveId: string;
  employeeName: string;
  onSuccess: () => void;
}

export default function LeaveRejectionModal({
  isOpen,
  onClose,
  leaveId,
  employeeName,
  onSuccess,
}: LeaveRejectionModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/leave/${leaveId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const msg = result.error || 'Failed to reject leave request.';
        setError(msg);
        toast.error(msg);
        return;
      }

      toast.success(result.message || 'Leave request rejected successfully.');
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Network error during leave rejection.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-red-400">
            <Ban className="h-5 w-5" />
            <h3 className="font-semibold text-lg text-white">Reject Leave Request</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-slate-300">
            Please provide a reason for rejecting the leave request submitted by{' '}
            <span className="font-semibold text-white">{employeeName}</span>.
          </p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Project deadline conflict or insufficient staffing"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white placeholder-slate-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              required
            />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !rejectionReason.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition shadow-md shadow-red-600/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <Ban className="h-3.5 w-3.5" />
                  Confirm Rejection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
