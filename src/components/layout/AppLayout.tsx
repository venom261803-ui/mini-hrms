'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarDays,
  User,
  LogOut,
  Shield,
  Menu,
  X,
  Loader2,
} from 'lucide-react';
import { UserSession } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<UserSession | null>(null);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          setSession(null);
          if (response.status === 403) {
            router.push('/login?reason=inactive');
          } else {
            router.push('/login');
          }
          return;
        }
        const data = await response.json();
        setSession(data.data?.user);
        setEmployeeName(data.data?.user?.employee?.fullName || 'User');
      } catch (err) {
        console.error('Session verification error:', err);
        setSession(null);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    }
    checkAuth();
  }, [router]);


  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex items-center gap-3 text-slate-400 font-medium">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          Loading workspace...
        </div>
      </div>
    );
  }

  // Navigation Items according to role
  const navItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    ...(session?.role !== 'EMPLOYEE' ? [{
      name: session?.role === 'HR_ADMIN' ? 'Employee Directory' : 'Team Directory',
      href: '/employees',
      icon: Users,
      show: true,
    }] : []),
    {
      name: 'Attendance',
      href: '/attendance',
      icon: CalendarCheck,
      show: true,
    },
    {
      name: 'Leave Management',
      href: '/leave',
      icon: CalendarDays,
      show: true,
    },
    {
      name: 'My Profile',
      href: '/profile',
      icon: User,
      show: true,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-900/80 backdrop-blur-md">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-wide block leading-none">Mini HRMS</span>
            <span className="text-[11px] text-slate-400 font-medium">SaaS Portal</span>
          </div>
        </div>

        {/* User Session Info Card */}
        <div className="p-4 mx-3 my-3 rounded-xl border border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-blue-400 font-semibold text-sm border border-slate-700">
              {employeeName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold text-sm text-white block truncate">{employeeName}</span>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5 uppercase tracking-wider">
                {session?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-3 border-t border-slate-800/80">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold hover:bg-red-600 hover:text-white transition disabled:opacity-50"
            aria-label="Sign Out"
          >
            {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header - Mobile Toggle & Profile Badge */}
        <header className="flex h-16 items-center justify-between px-4 md:px-8 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <h2 className="text-lg font-semibold text-white hidden sm:block">
              {session?.role === 'HR_ADMIN' ? 'HR Management' : session?.role === 'MANAGER' ? 'Team Workspace' : 'Employee Workspace'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-slate-300">{employeeName}</span>
              <span className="block text-[11px] text-slate-400">{session?.email}</span>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-bold">
              {session?.role === 'HR_ADMIN' ? 'HR' : session?.role === 'MANAGER' ? 'MGR' : 'EMP'}
            </div>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-900 p-4 space-y-2">
            <div className="mb-4 pb-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-white block">{employeeName}</span>
              <span className="text-xs text-blue-400 font-mono">{session?.role}</span>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-xs font-semibold"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
