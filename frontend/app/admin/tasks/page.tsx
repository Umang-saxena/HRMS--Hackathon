'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // if you don't have this, replace with <textarea className="..." />
import { useToast } from '@/hooks/use-toast';
import { ClipboardCheck, RefreshCcw, CheckCircle } from 'lucide-react';

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  status?: 'pending' | 'in_progress' | 'completed' | string | null;
  priority?: 'low' | 'medium' | 'high' | string | null;
  due_date?: string | null;
  assigned_to?: string | null; // employees.id
  assigned_at?: string | null;
  created_at?: string | null;
};

type EmployeeRowMin = { id: string; email: string };

export default function EmployeeTasksPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({}); // taskId -> comment (optional)
  const [search, setSearch] = useState('');

  // -------- helpers (pure, not inside blocks) --------
  const loadSession = async (): Promise<{ email: string | null }> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('getSession error:', JSON.stringify(error, null, 2));
      return { email: null };
    }
    const email = (data?.session?.user?.email as string) || null;
    return { email };
  };

  const resolveEmployeeIdByEmail = async (email: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('employees')
      .select('id,email')
      .eq('email', email)
      .maybeSingle<EmployeeRowMin>();
    if (error) {
      console.error('resolveEmployeeIdByEmail error:', JSON.stringify(error, null, 2));
      return null;
    }
    return data?.id ?? null;
  };

  const loadTasksForEmployee = async (employeeId: string): Promise<TaskRow[]> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('id, title, description, status, priority, due_date, assigned_to, assigned_at, created_at')
      .eq('assigned_to', employeeId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('loadTasksForEmployee error:', JSON.stringify(error, null, 2));
      return [];
    }
    return (data || []) as TaskRow[];
  };

  // -------- effects --------
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // 1) session email
        const { email } = await loadSession();
        setAuthEmail(email);
        if (!email) {
          toast({ title: 'Not signed in', description: 'Please login again.', variant: 'destructive' });
          setTasks([]);
          setCurrentEmployeeId(null);
          return;
        }

        // 2) employee id
        const empId = await resolveEmployeeIdByEmail(email);
        setCurrentEmployeeId(empId);
        if (!empId) {
          console.warn('No employees row found for session email:', email);
          toast({ title: 'No employee profile', description: 'Contact HR to link your account.', variant: 'destructive' });
          setTasks([]);
          return;
        }

        // 3) tasks
        const t = await loadTasksForEmployee(empId);
        setTasks(t);
      } catch (err) {
        console.error('Unexpected error loading employee tasks:', err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------- actions (pure) --------
 async function handleMarkComplete(taskId: string) {
  try {
    // 1) show session & resolved employee id right away
    const sessionResp = await supabase.auth.getSession();
    console.log('sessionResp:', JSON.stringify(sessionResp, null, 2));
    const email = sessionResp?.data?.session?.user?.email ?? null;
    console.log('session email:', email);
    if (!email) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return;
    }

    // Resolve employee id (again, to be safe)
    const { data: empRow, error: empErr } = await supabase
      .from('employees')
      .select('id, email')
      .eq('email', email)
      .maybeSingle();

    if (empErr) {
      console.error('Error resolving employee row:', JSON.stringify(empErr, null, 2));
      toast({ title: 'Failed to find employee row', variant: 'destructive' });
      return;
    }
    const confirmedBy = empRow?.id ?? null;
    console.log('resolved employee id:', confirmedBy);

    if (!confirmedBy) {
      toast({ title: 'No employee profile found', description: 'Contact HR to link your account', variant: 'destructive' });
      return;
    }

    // 2) perform insert and PRINT the full response
    const insertResp = await supabase
      .from('task_confirmations')
      .insert([
        {
          task_id: taskId,
          confirmed_by: confirmedBy,
          confirmed: true,
          comment: (commentMap[taskId] || null),
        },
      ])
      // include .select to request returned rows (sometimes gives more info back)
      .select('*');

    // console the entire response object
    try {
      console.log('insertResp (full):', JSON.stringify(insertResp, null, 2));
    } catch (e) {
      console.log('insertResp (raw):', insertResp);
    }

    // handle error
    if (insertResp.error) {
      // show a helpful toast and full console
      console.error('Insert error (detail):', JSON.stringify(insertResp.error, null, 2));
      toast({ title: 'Failed to notify admin', description: insertResp.error.message || 'DB/RLS error', variant: 'destructive' });
      return;
    }

    toast({ title: 'Task marked complete', description: 'Admin has been notified.' });

    // Optionally refresh local tasks list
    if (currentEmployeeId) {
      const refreshed = await loadTasksForEmployee(currentEmployeeId);
      setTasks(refreshed);
    }
  } catch (err) {
    // final fallback logging
    try {
      console.error('handleMarkComplete caught:', JSON.stringify(err, null, 2));
    } catch {
      console.error('handleMarkComplete caught (raw):', err);
    }
    toast({ title: 'Failed to notify admin', variant: 'destructive' });
  }
}


  const handleCommentChange = (taskId: string, value: string) => {
    setCommentMap((prev) => ({ ...prev, [taskId]: value }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }, [tasks, search]);

  // -------- UI --------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
          <p className="text-slate-600 mt-1">Tasks assigned to you</p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            if (!currentEmployeeId) return;
            setLoading(true);
            const t = await loadTasksForEmployee(currentEmployeeId);
            setTasks(t);
            setLoading(false);
          }}
        >
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Assigned Tasks
          </CardTitle>
          <CardDescription>Active and completed tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3">
            <Input
              placeholder="Search task title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading tasks...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tasks matched your account.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((t) => (
                <div key={t.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{t.title}</div>
                      <div className="text-xs text-slate-600 truncate">{t.description}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        Status: <Badge variant="outline" className="capitalize">{t.status || 'pending'}</Badge>
                        {t.priority ? <> • Priority: {t.priority}</> : null}
                        {t.due_date ? <> • Due: {new Date(t.due_date).toLocaleDateString()}</> : null}
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-3">
                      <Button
                        type="button"
                        onClick={() => handleMarkComplete(t.id)}
                        title="Notify admin that this task is completed"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Notify Admin
                      </Button>
                    </div>
                  </div>

                  {/* Optional comment box for confirmation */}
                  <div className="mt-3">
                    {/* If you don't have a <Textarea />, replace with <textarea className="w-full border rounded p-2 text-sm" /> */}
                    <Textarea
                      placeholder="Add a note for your admin (optional)…"
                      value={commentMap[t.id] || ''}
                      onChange={(e) => handleCommentChange(t.id, e.target.value)}
                      className="w-full"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debug block – comment or remove in prod if you want */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Debug</CardTitle>
          <CardDescription>Session & matching</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-slate-600 space-y-1">
          <div>auth.email: <span className="font-mono">{authEmail || '—'}</span></div>
          <div>resolved employees.id: <span className="font-mono">{currentEmployeeId || '—'}</span></div>
          <div>tasks count: <span className="font-mono">{tasks.length}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
