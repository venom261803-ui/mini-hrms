'use client';

import { useState } from 'react';
import { X, Loader2, UserPlus, AlertCircle } from 'lucide-react';
import { Employee, EmploymentStatus } from '@/types';
import { toast } from 'sonner';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  managers: Employee[];
}

export default function AddEmployeeModal({
  isOpen,
  onClose,
  onSuccess,
  managers,
}: AddEmployeeModalProps) {
  const [formData, setFormData] = useState<{
    employeeCode: string;
    fullName: string;
    email: string;
    phone: string;
    department: string;
    designation: string;
    joiningDate: string;
    managerId: string;
    status: EmploymentStatus;
  }>({
    employeeCode: '',
    fullName: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    joiningDate: new Date().toISOString().split('T')[0],
    managerId: '',
    status: EmploymentStatus.ACTIVE,
  });


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        ...formData,
        managerId: formData.managerId || null,
      };

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        let msg = result.error || 'Failed to create employee';
        if (result.details) {
          const detailMsgs = Object.values(result.details).flat().join(', ');
          msg += `: ${detailMsgs}`;
        }
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      toast.success(result.message || 'Employee created successfully');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        employeeCode: '',
        fullName: '',
        email: '',
        phone: '',
        department: '',
        designation: '',
        joiningDate: new Date().toISOString().split('T')[0],
        managerId: '',
        status: EmploymentStatus.ACTIVE,
      });
    } catch (err: any) {
      const msg = err.message || 'Network error while creating employee';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-employee-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="add-employee-title" className="text-lg font-semibold text-white">
                Add New Employee
              </h2>
              <p className="text-xs text-slate-400">
                Create a new employee profile and user credentials
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Employee Code */}
            <div>
              <label htmlFor="employeeCode" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Employee Code <span className="text-red-400">*</span>
              </label>
              <input
                id="employeeCode"
                name="employeeCode"
                type="text"
                required
                value={formData.employeeCode}
                onChange={handleChange}
                placeholder="e.g. EMP010"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. John Doe"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email Address <span className="text-red-400">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="john.doe@company.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 555-0199"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Department */}
            <div>
              <label htmlFor="department" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Department <span className="text-red-400">*</span>
              </label>
              <input
                id="department"
                name="department"
                type="text"
                required
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Engineering"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Designation */}
            <div>
              <label htmlFor="designation" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Designation <span className="text-red-400">*</span>
              </label>
              <input
                id="designation"
                name="designation"
                type="text"
                required
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g. Senior Software Engineer"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Manager Dropdown */}
            <div>
              <label htmlFor="managerId" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Assigned Manager
              </label>
              <select
                id="managerId"
                name="managerId"
                value={formData.managerId}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value="">-- No Manager (Independent) --</option>
                {managers.map((mgr) => (
                  <option key={mgr.id} value={mgr.id}>
                    {mgr.fullName} ({mgr.employeeCode} - {mgr.designation})
                  </option>
                ))}
              </select>
            </div>

            {/* Joining Date */}
            <div>
              <label htmlFor="joiningDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Joining Date <span className="text-red-400">*</span>
              </label>
              <input
                id="joiningDate"
                name="joiningDate"
                type="date"
                required
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>

            {/* Initial Employment Status */}
            <div>
              <label htmlFor="status" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Employment Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
              >
                <option value={EmploymentStatus.ACTIVE}>ACTIVE</option>
                <option value={EmploymentStatus.INACTIVE}>INACTIVE</option>
              </select>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400">
            Note: Newly created employees will be provisioned with default password <code className="text-slate-300">Password123!</code>.
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Employee'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
