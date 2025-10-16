'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  TrendingUp,
  Brain,
  Calendar,
  Building2,
  Bot,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Employees', href: '/employees', icon: Users },
  { name: 'Departments', href: '/departments', icon: Building2 },
  { name: 'Learning & Development', href: '/learning', icon: GraduationCap },
  { name: 'Performance Reviews', href: '/performance', icon: TrendingUp },
  { name: 'AI Insights', href: '/insights', icon: Brain },
  { name: 'Attendance', href: '/attendance', icon: Calendar },
  { name: 'AI Assistant', href: '/assistant', icon: Bot },
  { name: 'Test Auth', href: '/test', icon: Shield },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700">
      <div className="flex items-center justify-center h-16 px-4 border-b border-slate-700">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          HRML AI
        </h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <item.icon className={cn('w-5 h-5 mr-3', isActive ? 'text-white' : 'text-slate-400')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="px-3 py-2 text-xs text-slate-500">
          Powered by AI Technology
        </div>
      </div>
    </div>
  );
}
