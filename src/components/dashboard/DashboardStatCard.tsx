'use client';

import { LucideIcon } from 'lucide-react';

interface DashboardStatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'indigo' | 'slate';
  badge?: string;
}

const colorStyles = {
  blue: {
    bgIcon: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  emerald: {
    bgIcon: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  amber: {
    bgIcon: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  red: {
    bgIcon: 'bg-red-500/10 text-red-400 border-red-500/20',
    badge: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  purple: {
    bgIcon: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  },
  indigo: {
    bgIcon: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  },
  slate: {
    bgIcon: 'bg-slate-800 text-slate-400 border-slate-700',
    badge: 'bg-slate-800 text-slate-400 border-slate-700',
  },
};

export default function DashboardStatCard({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  badge,
}: DashboardStatCardProps) {
  const styles = colorStyles[color];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg flex flex-col justify-between space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg border ${styles.bgIcon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {badge && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${styles.badge}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-400 truncate">{subtext}</p>}
    </div>
  );
}
