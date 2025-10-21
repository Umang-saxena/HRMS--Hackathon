'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminLayout from '@/components/layout/AdminLayout';
import HrLayout from '@/components/layout/HrLayout';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import CandidateLayout from '@/components/layout/CandidateLayout';

interface AuthContextType {
  user: any;
  session: any;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

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
    case 'interviewer':
      return '/interviews';
    default:
      return '/';
  }
};

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);

        console.log('Auth event:', event, 'path:', pathname);

        // ✅ Redirect logic
        if (session && pathname === '/auth') {
          const role = session.user.user_metadata?.role || 'employee';
          const rolePage = getRolePage(role);
          router.push(rolePage);
        } 
        // ✅ Only redirect to /auth if not on home page or /auth itself
        else if (!session && pathname !== '/auth' && pathname !== '/') {
          router.push('/auth');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  // ✅ Auto logout when closing tab or refreshing
  useEffect(() => {
    const clearSessionOnClose = () => {
      try {
        supabase.auth.signOut(); // log out Supabase
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb:auth-token');
        sessionStorage.clear();
      } catch (err) {
        console.error('Error clearing session:', err);
      }
    };

    window.addEventListener('beforeunload', clearSessionOnClose);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        clearSessionOnClose();
      }
    });

    return () => {
      window.removeEventListener('beforeunload', clearSessionOnClose);
      document.removeEventListener('visibilitychange', clearSessionOnClose);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  const renderLayout = () => {
    const role = user.user_metadata?.role || 'employee';
    console.log('Role:', role);

    switch (role) {
      case 'admin':
        return <AdminLayout>{children}</AdminLayout>;
      case 'hr':
        return <HrLayout>{children}</HrLayout>;
      case 'employee':
        return <EmployeeLayout>{children}</EmployeeLayout>;
      case 'candidate':
        return <CandidateLayout>{children}</CandidateLayout>;
      default:
        return <EmployeeLayout>{children}</EmployeeLayout>;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {user ? renderLayout() : children}
    </AuthContext.Provider>
  );
}
