'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash, Edit, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
  role?: string | null;
};

type NotificationRow = {
  id: string;
  title: string;
  message: string;
  level?: string | null;
  target?: string | null;
  employee_id?: string | null;
  created_by?: string | null;
  created_at?: string | null;
};

export default function AdminNotificationsPage() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null); // 'admin' | 'hr' | 'employee' | null
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(null); // employees.id for logged-in user
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);

  // form
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [level, setLevel] = useState<'info' | 'warning' | 'urgent'>('info');
  const [target, setTarget] = useState<'all' | 'employees' | 'hr' | 'admin' | 'employee'>('all');
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null);

  // edit
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    void init();

    const channel = supabase
      .channel('public:notifications_admin')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        (payload: any) => {
          try {
            const ev = payload?.event ?? payload?.eventType;
            const newRow = payload?.new ?? payload?.record;
            const oldRow = payload?.old ?? null;
            setNotifications((prev) => {
              let arr = [...prev];
              if (ev === 'INSERT') {
                arr = [newRow as NotificationRow, ...arr];
              } else if (ev === 'UPDATE') {
                arr = arr.map((n) => (n.id === newRow.id ? (newRow as NotificationRow) : n));
              } else if (ev === 'DELETE') {
                arr = arr.filter((n) => n.id !== oldRow.id);
              }
              arr.sort((a, b) => (new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()));
              return arr.slice(0, 200);
            });
          } catch (err) {
            void loadNotifications().catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      try {
        void supabase.removeChannel(channel);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = (userData as any)?.user ?? (userData as any)?.data?.user ?? null;
      if (!user?.email) {
        toast({ title: 'Not signed in', description: 'Please sign in.', variant: 'destructive' });
        setLoading(false);
        return;
      }

      // load employees list (for targeting specific employee)
      const employeesResp = await supabase.from('employees').select('id, first_name, last_name, email, role').order('first_name', { ascending: true });
      if (employeesResp.error) {
        console.warn('Failed to load employees:', employeesResp.error);
      } else {
        setEmployees((employeesResp.data ?? []) as Employee[]);
      }

      // resolve current user's employees row (if exists) to get role
      const empMatch = await supabase.from('employees').select('id, role').eq('email', user.email).maybeSingle();
      if (!empMatch.error && empMatch.data) {
        setCurrentEmployeeId(empMatch.data.id ?? null);
        setUserRole((empMatch.data.role ?? 'employee')?.toLowerCase() ?? 'employee');
      } else {
        setUserRole('employee');
      }

      await loadNotifications();
    } catch (err) {
      console.error('init notifications error', err);
      toast({ title: 'Error', description: 'Failed to initialize notifications', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    try {
      const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) {
        console.warn('Failed to load notifications:', error);
        setNotifications([]);
        return;
      }
      setNotifications((data ?? []) as NotificationRow[]);
    } catch (err) {
      console.error('loadNotifications error', err);
      setNotifications([]);
    }
  }

  const canCreate = useMemo(() => {
    const r = (userRole ?? '').toLowerCase();
    return r === 'admin' || r === 'hr';
  }, [userRole]);

  const allowedTargets = useMemo(() => {
    const r = (userRole ?? '').toLowerCase();
    if (r === 'admin') return ['all', 'employees', 'hr', 'admin', 'employee'];
    if (r === 'hr') return ['employees', 'admin', 'employee'];
    return [];
  }, [userRole]);

  async function handleSave() {
    if (!canCreate) {
      toast({ title: 'Not allowed', description: 'You do not have permission to send notifications', variant: 'destructive' });
      return;
    }
    if (!title.trim() || !message.trim()) {
      toast({ title: 'Validation', description: 'Title and message are required', variant: 'destructive' });
      return;
    }
    if (target === 'employee' && !targetEmployeeId) {
      toast({ title: 'Select employee', description: 'Choose the employee to target', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        level: level,
        target: target,
        employee_id: target === 'employee' ? targetEmployeeId : null,
        created_by: currentEmployeeId ?? null,
      };

      if (!editingId) {
        const resp = await supabase.from('notifications').insert([payload]).select('*');
        if (resp.error) throw resp.error;
        toast({ title: 'Notification sent' });
        setTitle('');
        setMessage('');
        setLevel('info');
        setTarget('all');
        setTargetEmployeeId(null);
      } else {
        const { error } = await supabase.from('notifications').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Notification updated' });
        setEditingId(null);
        setTitle('');
        setMessage('');
        setLevel('info');
        setTarget('all');
        setTargetEmployeeId(null);
      }

      await loadNotifications();
    } catch (err: any) {
      console.error('save notification error', err);
      toast({ title: 'Save failed', description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(n: NotificationRow) {
    setEditingId(n.id);
    setTitle(n.title);
    setMessage(n.message);
    setLevel((n.level as any) ?? 'info');
    setTarget((n.target as any) ?? 'all');
    setTargetEmployeeId(n.employee_id ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this notification?')) return;
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Deleted' });
      await loadNotifications();
    } catch (err: any) {
      console.error('delete notification error', err);
      toast({ title: 'Delete failed', description: err?.message ?? String(err), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-slate-600 mt-1">Send messages to employees, HR or admins</p>
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => void loadNotifications()}><RefreshCcw /> Refresh</Button>
        </div>
      </div>

      {/* Create form (admin/hr only) */}
      {canCreate ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus /> {editingId ? 'Edit Notification' : 'Create Notification'}
            </CardTitle>
            <CardDescription>Choose your target and priority (info/warning/urgent)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
              <Select value={level} onValueChange={(v) => setLevel(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={target}
                onValueChange={(v) => {
                  // when switching target, clear selected employee
                  setTarget(v as any);
                  setTargetEmployeeId(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedTargets.includes('all') && <SelectItem value="all">All (everyone)</SelectItem>}
                  {allowedTargets.includes('employees') && <SelectItem value="employees">All Employees</SelectItem>}
                  {allowedTargets.includes('hr') && <SelectItem value="hr">HR</SelectItem>}
                  {allowedTargets.includes('admin') && <SelectItem value="admin">Admin</SelectItem>}
                  {allowedTargets.includes('employee') && <SelectItem value="employee">Specific Employee</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {target === 'employee' && (
              <div className="mt-3">
                {/* sentinel value "__none" used instead of empty string */}
                <Select
                  value={targetEmployeeId ?? '__none'}
                  onValueChange={(v) => setTargetEmployeeId(v === '__none' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select employee</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} {e.email ? `— ${e.email}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="mt-3">
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message body" rows={4} />
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => void handleSave()} disabled={saving}>
                {editingId ? 'Save' : 'Send'} {saving ? '...' : ''}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={() => {
                  setEditingId(null);
                  setTitle('');
                  setMessage('');
                  setLevel('info');
                  setTarget('all');
                  setTargetEmployeeId(null);
                }}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Read-only</CardTitle>
            <CardDescription>You do not have permission to send notifications.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Recent notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
          <CardDescription>Latest messages (all targets shown). Employees will filter client-side in their dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications yet</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => {
                const created = n.created_at ? format(new Date(n.created_at), 'dd MMM yyyy, HH:mm') : '';
                return (
                  <div key={n.id} className="p-3 border rounded flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs ${n.level === 'urgent' ? 'bg-red-50 text-red-600' : n.level === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                          {n.level ?? 'info'}
                        </div>
                        <div className="font-medium truncate">{n.title}</div>
                        <div className="text-xs text-slate-400 ml-2">{n.target ?? 'all'}</div>
                      </div>
                      <div className="text-sm text-slate-700 mt-1 line-clamp-3">{n.message}</div>
                      <div className="text-xs text-slate-400 mt-2">{created}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-slate-400">{n.employee_id ? 'Personal' : (n.target ?? 'all')}</div>
                      {canCreate ? (
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => startEdit(n)} title="Edit">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="destructive" onClick={() => void handleDelete(n.id)} title="Delete">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
