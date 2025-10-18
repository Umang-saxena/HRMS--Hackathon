'use client';

import { useEffect, useState } from 'react';
import { ClipboardCheck, Send, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/simple-progress';

type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  assigned_at?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [updateTexts, setUpdateTexts] = useState<Record<string, string>>({});
  const [updateProgress, setUpdateProgress] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      if (!session) {
        setTasks([]);
        return;
      }

      const email = session.user?.email ?? null;
      let empId = null;

      if (email) {
        const { data: emp } = await supabase
          .from('employees')
          .select('id')
          .eq('email', email)
          .maybeSingle();
        if (emp) empId = emp.id;
      }

      setEmployeeId(empId);
      if (!empId) {
        toast({ title: 'No employee found for your account', variant: 'destructive' });
        setTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', empId)
        .order('created_at', { ascending: false });

      if (error) console.error('Error fetching tasks:', error);
      setTasks(data || []);
    } catch (err) {
      console.error('Unexpected loadTasks error:', err);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }

  // 🟢 Handle progress update
  async function handleAddUpdate(taskId: string) {
    const text = updateTexts[taskId]?.trim();
    const progress = updateProgress[taskId] || 0;
    if (!text && !progress) {
      toast({ title: 'Please provide update text or progress.', variant: 'destructive' });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session ?? null;
    const userId = session?.user?.id;

    const { error } = await supabase.from('task_updates').insert([
      {
        task_id: taskId,
        updated_by: userId,
        update_text: text || null,
        progress_percent: progress || null,
      },
    ]);

    if (error) {
      console.error('Error inserting task update:', error);
      toast({ title: 'Error saving update', variant: 'destructive' });
    } else {
      toast({ title: 'Progress updated successfully!' });
      setUpdateTexts((prev) => ({ ...prev, [taskId]: '' }));
      setUpdateProgress((prev) => ({ ...prev, [taskId]: 0 }));
    }
  }

  // ✅ Mark task complete + confirm
  async function handleMarkComplete(task: TaskRow) {
    if (!task?.id) return;
    setLoading(true);

    try {
      // Update main tasks table
      const { error: upErr } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', task.id);

      if (upErr) {
        console.error('Error updating task:', upErr);
        toast({ title: 'Failed to mark complete', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Insert into task_confirmations table
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;
      const userId = session?.user?.id;

      const { error: confErr } = await supabase.from('task_confirmations').insert([
        {
          task_id: task.id,
          confirmed_by: userId,
          confirmed: true,
          comment: `Task "${task.title}" completed by employee.`,
        },
      ]);

      if (confErr) {
        console.error('Error inserting confirmation:', confErr);
        toast({ title: 'Failed to notify admin', variant: 'destructive' });
      } else {
        toast({ title: 'Task marked complete', description: 'Admin has been notified.' });
      }

      await loadTasks();
    } catch (err) {
      console.error('handleMarkComplete error:', err);
      toast({ title: 'Unexpected error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
        <p className="text-slate-600 mt-1">Your assigned tasks and progress updates</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Assigned Tasks
          </CardTitle>
          <CardDescription>Manage and update your tasks</CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 text-center py-8">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No tasks assigned.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 shadow-sm bg-white hover:bg-slate-50 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900">{task.title}</h4>
                      <p className="text-xs text-slate-600">{task.description}</p>
                      <Badge
                        variant={task.status === 'completed' ? 'secondary' : 'outline'}
                        className="mt-2 capitalize"
                      >
                        {task.status || 'pending'}
                      </Badge>
                    </div>
                    {task.status !== 'completed' && (
                      <Button
                        onClick={() => handleMarkComplete(task)}
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <ClipboardCheck className="w-4 h-4" /> Complete
                      </Button>
                    )}
                  </div>

                  {/* Progress Update Section */}
                  {task.status !== 'completed' && (
                    <div className="mt-4 space-y-2">
                      <Input
                        placeholder="Add a progress update..."
                        value={updateTexts[task.id] || ''}
                        onChange={(e) =>
                          setUpdateTexts((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          placeholder="Progress %"
                          value={updateProgress[task.id] || ''}
                          onChange={(e) =>
                            setUpdateProgress((prev) => ({
                              ...prev,
                              [task.id]: Number(e.target.value),
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddUpdate(task.id)}
                          className="flex items-center gap-1"
                        >
                          <Send className="w-4 h-4" /> Update
                        </Button>
                      </div>
                    </div>
                  )}

                  {task.status === 'completed' && task.completed_at && (
                    <div className="mt-2 text-xs text-slate-500">
                      Completed at: {new Date(task.completed_at).toLocaleString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
