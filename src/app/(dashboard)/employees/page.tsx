'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import EmployeeDirectory from '@/components/employees/EmployeeDirectory';
import { UserSession, Role } from '@/types';
import { Loader2 } from 'lucide-react';

export default function EmployeesPage() {
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
        const userSession: UserSession = data.data?.user;

        // EMPLOYEE role is not authorized to view employee directory page, redirect to self profile
        if (userSession?.role === Role.EMPLOYEE) {
          router.replace('/profile');
          return;
        }

        setSession(userSession);
      } catch (err) {
        console.error('Failed to load session:', err);
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
          Loading directory...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <EmployeeDirectory session={session} />
    </AppLayout>
  );
}
