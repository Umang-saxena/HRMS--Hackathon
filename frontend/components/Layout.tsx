import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Video,
  Settings,
  LogOut,
  Menu,
  Calendar,
  DollarSign,
  ListTodo,
  Award,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, userRole, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'hr', 'interviewer', 'candidate'] },
    { name: 'Jobs', href: '/jobs', icon: Briefcase, roles: ['admin', 'hr', 'candidate'] },
    { name: 'Candidates', href: '/candidates', icon: Users, roles: ['admin', 'hr', 'interviewer'] },
    { name: 'Interviews', href: '/interviews', icon: Video, roles: ['admin', 'hr', 'interviewer'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin', 'hr', 'interviewer', 'candidate'] },
  ];

  const employeeNavigation = [
    { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
    { name: 'My Tasks', href: '/employee/tasks', icon: ListTodo },
    { name: 'Leave Requests', href: '/employee/leaves', icon: Calendar },
    { name: 'Payroll', href: '/employee/payroll', icon: DollarSign },
    { name: 'Bonuses', href: '/employee/bonuses', icon: Award },
    { name: 'Performance', href: '/employee/performance', icon: TrendingUp },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const filteredNavigation = userRole === 'employee' 
    ? employeeNavigation
    : navigation.filter(item => userRole && item.roles.includes(userRole));

  const isActive = (path: string) => pathname === path;

  const NavItems = () => (
    <>
      {filteredNavigation.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-secondary'
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{item.name}</span>
          </Link>
        );
      })}
    </>
  );

  const initials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r border-border bg-card lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b border-border p-6">
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              RecruitPro
            </h1>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{userRole} Portal</p>
          </div>
          
          <nav className="flex-1 space-y-1 p-4">
            <NavItems />
          </nav>

          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            RecruitPro
          </h1>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-border p-6">
                  <h2 className="text-xl font-bold">Menu</h2>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">{userRole}</p>
                </div>
                
                <nav className="flex-1 space-y-1 p-4">
                  <NavItems />
                </nav>

                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={signOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pt-0 pt-16">
        {children}
      </main>
    </div>
  );
}
