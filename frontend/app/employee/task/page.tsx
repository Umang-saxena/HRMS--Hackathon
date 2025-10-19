'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  async function resolveEmployeeId() {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      const session = (sessionData as any)?.session;
      if (!session) return null;

      const userEmail = session.user?.email;
      if (!userEmail) return null;

      const { data: emp, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();

      if (empErr) {
        console.error('Employee lookup error:', JSON.stringify(empErr, null, 2));
        return null;
      }

      return emp?.id ?? null;
    } catch (err) {
      console.error('resolveEmployeeId error:', err);
      return null;
    }
  }

  async function loadTasks() {
    setLoading(true);
    setErrorMsg(null);

    try {
      const employeeId = await resolveEmployeeId();
      if (!employeeId) {
        setErrorMsg('Could not resolve employee for the current user.');
        setTasks([]);
        return;
      }

      console.log('Resolved employeeId for tasks:', employeeId);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', employeeId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Tasks query error:', JSON.stringify(error, null, 2));
        setErrorMsg('Failed to fetch tasks.');
        setTasks([]);
        return;
      }

      setTasks(data || []);
    } catch (err: any) {
      console.error('Error loading tasks:', JSON.stringify(err, null, 2));
      setErrorMsg('Unexpected error while loading tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
        <p className="text-slate-600 mt-1">Your assigned tasks and progress</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Assigned Tasks
          </CardTitle>
          <CardDescription>Active and completed tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading tasks...</p>
          ) : errorMsg ? (
            <p className="text-sm text-red-600 text-center py-6">{errorMsg}</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tasks assigned.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((t, i) => (
                <div key={t.id ?? i} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 transition-all duration-200">
                  <div className="max-w-[70%]">
                    <p className="font-semibold text-slate-900">{t.title}</p>
                    {t.description && <p className="text-xs text-slate-600">{t.description}</p>}
                    {t.due_date && <p className="text-xs text-slate-500 mt-1">Due: {new Date(t.due_date).toLocaleDateString()}</p>}
                  </div>
                  <Badge variant="outline" className="capitalize">{t.status || 'pending'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
