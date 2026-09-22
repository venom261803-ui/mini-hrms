'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import { Employee, UserSession } from '@/types';
import {
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  ShieldCheck,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Self-edit form fields (Email and Phone only)
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const authRes = await fetch('/api/auth/me');
        if (!authRes.ok) {
          router.push('/login');
          return;
        }
        const authData = await authRes.json();
        const userSession: UserSession = authData.data?.user;
        setSession(userSession);

        if (!userSession?.employeeId) {
          setErrorMessage('No associated employee record found.');
          setIsLoading(false);
          return;
        }

        // Fetch full employee profile using GET /api/employees/[id]
        const empRes = await fetch(`/api/employees/${userSession.employeeId}`);
        const empData = await empRes.json();

        if (!empRes.ok || !empData.success) {
          setErrorMessage(empData.error || 'Failed to fetch employee profile');
          return;
        }

        const emp: Employee = empData.data.employee;
        setEmployee(emp);
        setEmail(emp.email || '');
        setPhone(emp.phone || '');
      } catch (err: any) {
        console.error('Error loading profile:', err);
        setErrorMessage(err.message || 'Error loading profile data');
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee || !session) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Send ONLY email and phone in payload to satisfy self-update security rules
      const payload: Record<string, string> = {};
      if (email !== employee.email) payload.email = email;
      if (phone !== employee.phone) payload.phone = phone;

      if (Object.keys(payload).length === 0) {
        toast.info('No changes were made to your contact details.');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        let msg = result.error || 'Failed to update profile';
        if (result.details) {
          const detailMsgs = Object.values(result.details).flat().join(', ');
          msg += `: ${detailMsgs}`;
        }
        setErrorMessage(msg);
        toast.error(msg);
        return;
      }

      const updatedEmp = result.data.employee;
      setEmployee(updatedEmp);
      setEmail(updatedEmp.email);
      setPhone(updatedEmp.phone);

      const msg = result.message || 'Contact details updated successfully.';
      setSuccessMessage(msg);
      toast.success(msg);
    } catch (err: any) {
      const msg = err.message || 'Network error updating profile';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          Loading employee profile...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                My Employee Profile
              </h1>
              <p className="text-xs text-slate-400">
                View your organizational record and manage your contact details
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {employee && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Identity Card (Left) */}
            <div className="lg:col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-6 flex flex-col items-center text-center space-y-4 shadow-xl">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-3xl border-2 border-blue-500/30">
                {employee.fullName.charAt(0)}
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">{employee.fullName}</h2>
                <p className="text-xs text-blue-400 font-semibold">{employee.designation}</p>
                <code className="text-xs text-slate-400 font-mono block mt-1">
                  ID: {employee.employeeCode}
                </code>
              </div>

              <div className="w-full pt-4 border-t border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Role</span>
                  <span className="font-semibold text-blue-400 uppercase tracking-wider">
                    {session?.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold uppercase">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    {employee.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Fields Details & Edit Form (Right) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Read-Only HR Attributes */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Lock className="h-4 w-4 text-slate-400" />
                    HR-Managed Organizational Information (Read-Only)
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Employee Code</span>
                    <span className="font-mono text-white text-sm font-semibold">
                      {employee.employeeCode}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1">Full Legal Name</span>
                    <span className="text-white text-sm font-semibold">{employee.fullName}</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1 flex items-center gap-1">
                      <Building className="h-3.5 w-3.5 text-slate-500" /> Department
                    </span>
                    <span className="text-white text-sm font-semibold">{employee.department}</span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1 flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-slate-500" /> Designation
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {employee.designation}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-slate-500" /> Assigned Manager
                    </span>
                    <span className="text-white text-sm font-semibold">
                      {employee.manager ? employee.manager.fullName : 'None (Independent)'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block mb-1 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" /> Joining Date
                    </span>
                    <span className="font-mono text-white text-sm font-semibold">
                      {employee.joiningDate
                        ? new Date(employee.joiningDate).toISOString().split('T')[0]
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Contact Information Form */}
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-400" />
                    Editable Contact Details
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    As an employee, you are permitted to self-update your contact email and phone number.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                    >
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="profile-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="profile-phone"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        id="profile-phone"
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 bg-slate-950 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end pt-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-600/30 transition disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Contact Details
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
