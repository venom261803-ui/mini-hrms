'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginSchema } from '@/validations/auth.schema';
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('from') || '/dashboard';
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(
    reason === 'inactive' ? 'Your account is inactive. Please contact HR for assistance.' : null
  );

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);

    // Client-side Zod validation
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.flatten().fieldErrors;
      setFieldErrors({
        email: formatted.email?.[0],
        password: formatted.password?.[0],
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.details) {
          setFieldErrors({
            email: data.details.email?.[0],
            password: data.details.password?.[0],
          });
        }
        setGeneralError(data.error || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      // Successful authentication redirect
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      console.error('Login network error:', err);
      setGeneralError('Network error. Unable to connect to authentication server.');
      setIsLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setFieldErrors({});
    setGeneralError(null);
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header Branding */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/30">
          <Shield className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Mini HRMS Portal</h1>
        <p className="text-sm text-slate-400">Sign in to access your role workspace</p>
      </div>

      {/* Login Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-800/80 p-8 shadow-xl backdrop-blur-sm">
        {generalError && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-sm text-red-400">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{generalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className={`w-full rounded-lg border bg-slate-900/90 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
                  fieldErrors.email
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
                disabled={isLoading}
              />
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full rounded-lg border bg-slate-900/90 pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:outline-none focus:ring-2 ${
                  fieldErrors.password
                    ? 'border-red-500 focus:ring-red-500/20'
                    : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/20'
                }`}
                disabled={isLoading}
              />
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-400">{fieldErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 px-4 font-semibold text-white transition hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-600/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-8 border-t border-slate-700/60 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Development Quick Demo Logins:
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleFillDemo('hr@company.com')}
              className="rounded border border-slate-700 bg-slate-900/50 p-2 text-slate-300 hover:border-blue-500 hover:text-white transition text-center"
            >
              <span className="block font-semibold text-blue-400">HR Admin</span>
              hr@company.com
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('manager.a@company.com')}
              className="rounded border border-slate-700 bg-slate-900/50 p-2 text-slate-300 hover:border-emerald-500 hover:text-white transition text-center"
            >
              <span className="block font-semibold text-emerald-400">Manager A</span>
              manager.a
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('employee.a@company.com')}
              className="rounded border border-slate-700 bg-slate-900/50 p-2 text-slate-300 hover:border-purple-500 hover:text-white transition text-center"
            >
              <span className="block font-semibold text-purple-400">Employee A</span>
              employee.a
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 text-center">
            Password for all demo accounts: <code className="text-slate-300">Password123!</code>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <Suspense fallback={
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          Loading portal...
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
