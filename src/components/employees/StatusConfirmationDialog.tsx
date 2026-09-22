'use client';

import { useState } from 'react';
import { AlertTriangle, ShieldCheck, Loader2, X } from 'lucide-react';
import { Employee, EmploymentStatus } from '@/types';
import { toast } from 'sonner';

interface StatusConfirmationDialogProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StatusConfirmationDialog({
  isOpen,
  employee,
  onClose,
  onSuccess,
}: StatusConfirmationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !employee) return null;

  const isDeactivating = employee.status === EmploymentStatus.ACTIVE;
  const newStatus = isDeactivating ? EmploymentStatus.INACTIVE : EmploymentStatus.ACTIVE;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/employees/${employee.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || 'Failed to update employee status');
        return;
      }

      toast.success(
        result.message ||
          `Employee ${employee.fullName} is now ${newStatus.toLowerCase()}.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Network error updating status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-dialog-title"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                isDeactivating
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              {isDeactivating ? (
                <AlertTriangle className="h-6 w-6" />
              ) : (
                <ShieldCheck className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 id="status-dialog-title" className="text-lg font-semibold text-white">
                {isDeactivating ? 'Deactivate Employee?' : 'Activate Employee?'}
              </h3>
              <p className="text-xs text-slate-400">
                Target: <span className="font-semibold text-slate-200">{employee.fullName}</span> ({employee.employeeCode})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-sm text-slate-300">
          {isDeactivating ? (
            <p>
              This will prevent the employee from logging in and accessing company systems.
            </p>
          ) : (
            <p>
              This will restore the employee's system access and login privileges.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-semibold transition shadow-lg disabled:opacity-50 ${
              isDeactivating
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : isDeactivating ? (
              'Deactivate'
            ) : (
              'Activate'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
