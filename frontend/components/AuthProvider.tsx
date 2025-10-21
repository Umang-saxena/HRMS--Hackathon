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

        if (session && pathname === '/auth') {
          const role = session.user.user_metadata?.role || 'employee';
          const rolePage = getRolePage(role);
          router.push(rolePage);
        } else if (!session && pathname !== '/auth' && pathname !== '/') {
          router.push('/auth');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, pathname]);

  // TAB COUNT & unload handling:
  useEffect(() => {
    const TAB_COUNT_KEY = 'hrms_open_tabs';
    // helper to read/write count
    const readCount = () => parseInt(localStorage.getItem(TAB_COUNT_KEY) || '0', 10);
    const writeCount = (n: number) => localStorage.setItem(TAB_COUNT_KEY, String(n));

    // increment on mount
    try {
      const current = readCount();
      writeCount(current + 1);
    } catch (err) {
      console.error('Error incrementing tab count', err);
    }

    // stable handler reference so we can remove it
    const handleBeforeUnload = (ev: BeforeUnloadEvent) => {
      try {
        // decrement count
        const current = readCount();
        const next = Math.max(0, current - 1);
        writeCount(next);

        // if this was the last open tab, clear session and attempt sign out
        if (next === 0) {
          // best-effort sign out; may not complete in every browser
          try {
            // synchronous cleanup
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('sb:auth-token');
            sessionStorage.clear();
            // attempt async sign out (may be canceled by browser)
            void supabase.auth.signOut();
          } catch (err) {
            console.error('Error during unload signOut:', err);
          }
        }
      } catch (err) {
        console.error('Error handling beforeunload', err);
      }

      // No need to call preventDefault here unless you want a confirm dialog.
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also listen for 'storage' events so other tabs can react if needed (optional)
    const onStorage = (e: StorageEvent) => {
      if (e.key === TAB_COUNT_KEY) {
        // optional: we could update local state if we cared about number of open tabs
        // console.log('tab count changed:', e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);

    // cleanup on unmount (react unmount, not tab close)
    return () => {
      try {
        // decrement because this instance is being unmounted
        const current = readCount();
        const next = Math.max(0, current - 1);
        writeCount(next);

        if (next === 0) {
          try {
            localStorage.removeItem('supabase.auth.token');
            localStorage.removeItem('sb:auth-token');
            sessionStorage.clear();
            void supabase.auth.signOut();
          } catch (err) {
            console.error('Error during cleanup signOut:', err);
          }
        }
      } catch (err) {
        console.error('Error in unmount cleanup', err);
      }

      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('storage', onStorage);
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
    const role = user?.user_metadata?.role || 'employee';
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
