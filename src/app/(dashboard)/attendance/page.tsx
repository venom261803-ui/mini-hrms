'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import EmployeeAttendanceView from '@/components/attendance/EmployeeAttendanceView';
import ManagerAttendanceView from '@/components/attendance/ManagerAttendanceView';
import HrAttendanceView from '@/components/attendance/HrAttendanceView';
import { UserSession, Role } from '@/types';
import { Loader2 } from 'lucide-react';

export default function AttendancePage() {
  const router = useRouter();
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getSession() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          router.push('/login');
          return;
        }
        const data = await response.json();
        setSession(data.data?.user);
      } catch (err) {
        console.error('Failed to load attendance session:', err);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }
    getSession();
  }, [router]);

  if (isLoading || !session) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          Loading attendance workspace...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {session.role === Role.EMPLOYEE && <EmployeeAttendanceView session={session} />}
      {session.role === Role.MANAGER && <ManagerAttendanceView session={session} />}
      {session.role === Role.HR_ADMIN && <HrAttendanceView session={session} />}
    </AppLayout>
  );
}
