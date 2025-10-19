'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  GraduationCap,
  TrendingUp,
  Calendar,
  User,
  FileText,
  Award,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Header from './Header';
import { useAuth } from '@/components/AuthProvider';

const navigation = [
  { name: 'Dashboard', href: '/employee', icon: LayoutDashboard },
  { name: 'Bonuses', href: '/employee/bonuses', icon: GraduationCap },
  { name: 'Performance', href: '/employee/performance', icon: TrendingUp },
  { name: 'Attendance', href: '/employee/attendance', icon: Calendar },
  { name: 'Profile', href: '/employee/profile', icon: User },
  { name: 'Payroll', href: '/employee/payroll', icon: FileText },
  { name: 'Task', href: '/employee/task', icon: Award },
  
];

interface EmployeeLayoutProps {
  children: ReactNode;
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.user_metadata?.role !== 'employee') {
      const getRolePage = (role: string) => {
        switch (role) {
          case 'admin':
            return '/admin';
          case 'hr':
            return '/hr/employees';
          case 'employee':
            return '/employee';
          case 'candidate':
            return '/candidate';
          default:
            return '/';
        }
      };
      router.push(getRolePage(user.user_metadata?.role || 'employee'));
    }
  }, [user, router]);

  if (!user || user.user_metadata?.role !== 'employee') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700">
        <div className="flex items-center justify-center h-16 px-4 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Employee Portal
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
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-500/30'
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
            Employee Self-Service
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
