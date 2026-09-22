'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import ManagerDashboard from '@/components/dashboard/ManagerDashboard';
import HrDashboard from '@/components/dashboard/HrDashboard';
import { UserSession, Role, DashboardData, EmployeeDashboardData, ManagerDashboardData, HrDashboardData } from '@/types';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Session & Dashboard Live Aggregation Data
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Verify session
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        if (authRes.status === 403) {
          router.push('/login?reason=inactive');
        } else {
          router.push('/login');
        }
        return;
      }
      const authResult = await authRes.json();
      const currentSession: UserSession = authResult.data?.user;
      setSession(currentSession);

      // 2. Fetch Dashboard Live Aggregation from GET /api/dashboard
      const dashRes = await fetch('/api/dashboard');
      const dashResult = await dashRes.json();

      if (!dashRes.ok || !dashResult.success) {
        if (dashRes.status === 401) {
          router.push('/login');
          return;
        }
        setError(dashResult.error || 'Failed to load dashboard data.');
        return;
      }

      setDashboardData(dashResult.data);
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
      setError(err.message || 'Network error loading dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (isLoading || !session) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          Loading live workspace metrics...
        </div>
      </AppLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto my-12 p-6 rounded-2xl border border-slate-800 bg-slate-900 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Dashboard Loading Error</h2>
          <p className="text-xs text-slate-400">{error || 'Unable to retrieve dashboard metrics.'}</p>
          <button
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200 font-semibold hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {session.role === Role.EMPLOYEE && (
        <EmployeeDashboard
          data={dashboardData as EmployeeDashboardData}
          onRefresh={loadDashboard}
        />
      )}
      {session.role === Role.MANAGER && (
        <ManagerDashboard data={dashboardData as ManagerDashboardData} />
      )}
      {session.role === Role.HR_ADMIN && (
        <HrDashboard data={dashboardData as HrDashboardData} />
      )}
    </AppLayout>
  );
}
