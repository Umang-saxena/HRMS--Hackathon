'use client';

import { ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  User,
  FileText,
  Calendar,
  MessageSquare,
  TrendingUp,
  CheckCircle,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Header from './Header';
import { useAuth } from '@/components/AuthProvider';

const navigation = [
  { name: 'Dashboard', href: '/candidate', icon: LayoutDashboard },
  { name: 'Job Search', href: '/candidate/jobs', icon: Briefcase },
  { name: 'My Applications', href: '/candidate/applications', icon: FileText },
  { name: 'Interviews', href: '/candidate/interviews', icon: Calendar },
  { name: 'Profile', href: '/candidate/profile', icon: User },
  { name: 'Messages', href: '/candidate/messages', icon: MessageSquare },
  { name: 'Career Progress', href: '/candidate/progress', icon: TrendingUp },
  { name: 'Offers', href: '/candidate/offers', icon: CheckCircle },
  { name: 'Settings', href: '/candidate/settings', icon: Settings },
];

interface CandidateLayoutProps {
  children: ReactNode;
}

export default function CandidateLayout({ children }: CandidateLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user && user.user_metadata?.role !== 'candidate') {
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

  if (!user || user.user_metadata?.role !== 'candidate') {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <div className="flex flex-col w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700">
        <div className="flex items-center justify-center h-16 px-4 border-b border-slate-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Candidate Portal
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
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30'
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
            Job Application Management
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
