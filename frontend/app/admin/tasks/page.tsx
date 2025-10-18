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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardCheck,
  Plus,
  RefreshCcw,
  CheckCircle,
} from 'lucide-react';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email?: string | null;
};

type TaskRow = {
  id: string;
  employee_id?: string | null;
  assigned_by?: string | null; // references employees.id
  title: string;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | string;
  status?: 'pending' | 'in_progress' | 'completed' | string;
  due_date?: string | null;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  assigned_to?: string | null;
  assigned_at?: string | null;
};

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all'); // 'all' | '__unassigned' | empId
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;
  const { toast } = useToast();

  // currentAdminEmployeeId is employees.id (server-side created) for the logged-in auth user
  const [currentAdminEmployeeId, setCurrentAdminEmployeeId] = useState<string | null>(null);

  // New task form state
  const [newTask, setNewTask] = useState<{
    title: string;
    description?: string;
    assignedTo?: string | null;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | string;
  }>({ title: '', description: '', assignedTo: null, dueDate: '', priority: 'medium' });

  // Bulk assign state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [bulkTaskTitle, setBulkTaskTitle] = useState('');
  const [bulkTaskDescription, setBulkTaskDescription] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkPriority, setBulkPriority] = useState<'low' | 'medium' | 'high' | string>('medium');

  // Derived filtered & paginated lists
  const filtered = useMemo(() => {
    let arr = tasks || [];
    if (filterStatus !== 'all') arr = arr.filter((t) => (t.status || 'pending') === filterStatus);

    if (filterAssignee !== 'all') {
      if (filterAssignee === '__unassigned') {
        arr = arr.filter((t) => !t.assigned_to);
      } else {
        arr = arr.filter((t) => (t.assigned_to || '') === filterAssignee);
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      arr = arr.filter(
        (t) =>
          (t.title || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q)
      );
    }
    return arr;
  }, [tasks, filterStatus, filterAssignee, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // read auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const authEmail = (sessionData as any)?.session?.user?.email ?? null;

      // If admin has an employee row, read and store it (may be null)
      let adminEmployeeId: string | null = null;
      if (authEmail) {
        const { data: empRow } = await supabase
          .from('employees')
          .select('id')
          .eq('email', authEmail)
          .maybeSingle();
        adminEmployeeId = (empRow as any)?.id ?? null;
      }
      setCurrentAdminEmployeeId(adminEmployeeId);

      // Fetch tasks + employees
      const [{ data: tasksData, error: tasksErr }, { data: employeesData, error: empErr }] =
        await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('employees').select('id, first_name, last_name').order('first_name', { ascending: true }),
        ]);

      if (tasksErr) {
        console.error('Error loading tasks:', tasksErr);
        toast({ title: 'Failed to load tasks', variant: 'destructive' });
      }
      if (empErr) {
        console.error('Error loading employees:', empErr);
        toast({ title: 'Failed to load employees', variant: 'destructive' });
      }

      setTasks((tasksData || []) as TaskRow[]);
      setEmployees((employeesData || []) as Employee[]);
    } catch (err) {
      console.error('Unexpected error loading tasks page:', err);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
      setTasks([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }

  // Helper to get name for assigned_to
  const getAssigneeName = (id?: string | null) => {
    if (!id) return 'Unassigned';
    const emp = employees.find((e) => e.id === id);
    return emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown';
  };

  // Call server API to create employees row if missing (server uses service role key)
  async function ensureAdminEmployeeRow(): Promise<string | null> {
    // already present?
    if (currentAdminEmployeeId) return currentAdminEmployeeId;

    // read auth session
    const { data: sessionData } = await supabase.auth.getSession();
    const authEmail = (sessionData as any)?.session?.user?.email ?? null;
    const metadata = (sessionData as any)?.session?.user?.user_metadata ?? {};
    const first_name = metadata?.given_name || metadata?.first_name || metadata?.name?.split?.(' ')?.[0] || undefined;
    const last_name = metadata?.family_name || metadata?.last_name || undefined;

    if (!authEmail) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return null;
    }

    try {
      const resp = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, first_name, last_name }),
      });

      const body = await resp.json();
      if (!resp.ok) {
        console.error('create-employee API error:', body);
        toast({ title: 'Failed to create admin profile', description: body?.error || 'Server error', variant: 'destructive' });
        return null;
      }
      const id = body?.id ?? null;
      if (!id) {
        console.error('create-employee returned no id:', body);
        toast({ title: 'Failed to create admin profile', variant: 'destructive' });
        return null;
      }
      // update local state
      setCurrentAdminEmployeeId(id);
      return id;
    } catch (err) {
      console.error('Error calling create-employee API:', err);
      toast({ title: 'Failed to create admin profile', variant: 'destructive' });
      return null;
    }
  }

  // Create a single task (assigned_by set from employees.id). assigned_at set if assigned_to provided.
  async function handleCreateTask() {
    if (!newTask.title || !newTask.title.trim()) {
      toast({ title: 'Please provide a task title', variant: 'destructive' });
      return;
    }

    // Ensure admin has an employees row (server-side create if missing)
    let assignedById = currentAdminEmployeeId;
    if (!assignedById) {
      toast({ title: 'Creating admin profile...', description: 'Linking your account to the employees table.' });
      assignedById = await ensureAdminEmployeeRow();
      if (!assignedById) {
        toast({ title: 'Cannot create task', description: 'Admin profile missing and could not be created.', variant: 'destructive' });
        return;
      }
    }

    const payload: Partial<TaskRow> = {
      title: newTask.title.trim(),
      description: newTask.description?.trim() || null,
      priority: newTask.priority || 'medium',
      status: 'pending',
      due_date: newTask.dueDate || null,
      assigned_to: newTask.assignedTo || null,
      assigned_at: newTask.assignedTo ? new Date().toISOString() : null,
      assigned_by: assignedById,
    };

    try {
      const insertResp = await supabase.from('tasks').insert([payload]).select('*');
      if (insertResp.error) {
        console.error('Supabase insert error (raw):', JSON.stringify(insertResp.error, null, 2));
        toast({ title: 'Failed to create task', description: insertResp.error.message || 'DB error', variant: 'destructive' });
        return;
      }

      toast({ title: 'Task created' });
      setNewTask({ title: '', description: '', assignedTo: null, dueDate: '', priority: 'medium' });
      await loadData();
    } catch (err: any) {
      try {
        console.error('Create task caught error:', JSON.stringify(err, null, 2));
      } catch {
        console.error('Create task caught error (raw):', err);
      }
      toast({ title: 'Failed to create task', variant: 'destructive' });
    }
  }

  // Bulk assign same task to selected employees. Each inserted row will include assigned_by and assigned_at.
  async function handleBulkAssign() {
    if (!bulkTaskTitle.trim()) {
      toast({ title: 'Please provide task title', variant: 'destructive' });
      return;
    }
    if (!selectedEmployeeIds.length) {
      toast({ title: 'Please select at least one employee', variant: 'destructive' });
      return;
    }

    // ensure admin employee row exists
    let assignedById = currentAdminEmployeeId;
    if (!assignedById) {
      toast({ title: 'Creating admin profile...', description: 'Linking your account to the employees table.' });
      assignedById = await ensureAdminEmployeeRow();
      if (!assignedById) {
        toast({ title: 'Cannot bulk assign', description: 'Admin profile missing and could not be created.', variant: 'destructive' });
        return;
      }
    }

    try {
      const payload = selectedEmployeeIds.map((empId) => ({
        title: bulkTaskTitle,
        description: bulkTaskDescription || null,
        priority: bulkPriority || 'medium',
        status: 'pending',
        due_date: bulkDueDate || null,
        assigned_to: empId,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedById,
      }));

      const { error } = await supabase.from('tasks').insert(payload);
      if (error) throw error;

      toast({ title: `Assigned task to ${selectedEmployeeIds.length} employees` });
      setBulkTaskTitle('');
      setBulkTaskDescription('');
      setBulkDueDate('');
      setSelectedEmployeeIds([]);
      await loadData();
    } catch (err: any) {
      console.error('Bulk assign error:', err);
      toast({ title: 'Bulk assign failed', variant: 'destructive' });
    }
  }

  // Update a task (partial). When setting status to completed, set completed_at to now.
  async function updateTask(taskId: string, updates: Partial<TaskRow>) {
    try {
      const payload: Partial<TaskRow> = { ...updates };

      if (updates.status && updates.status === 'completed') {
        payload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase.from('tasks').update(payload).eq('id', taskId);
      if (error) throw error;

      await loadData();
    } catch (err: any) {
      console.error('Update task error:', err);
      toast({ title: 'Failed to update task', variant: 'destructive' });
    }
  }

  async function markComplete(taskId: string) {
    await updateTask(taskId, { status: 'completed' });
    toast({ title: 'Marked completed' });
  }

  // Reassign someone; set assigned_at and assigned_by (requires admin employees.id)
  async function reassignTask(taskId: string, empId: string | null) {
    try {
      // ensure admin employee id for assigned_by
      let assignedById = currentAdminEmployeeId;
      if (!assignedById) {
        assignedById = await ensureAdminEmployeeRow();
        if (!assignedById) {
          toast({ title: 'Cannot reassign', variant: 'destructive' });
          return;
        }
      }

      await updateTask(taskId, {
        assigned_to: empId || null,
        assigned_at: empId ? new Date().toISOString() : null,
        assigned_by: assignedById,
      } as Partial<TaskRow>);
      toast({ title: 'Reassigned' });
    } catch (err) {
      // updateTask handles toast/error
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return;
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
      toast({ title: 'Task deleted' });
      await loadData();
    } catch (err: any) {
      console.error('Delete task error:', err);
      toast({ title: 'Failed to delete task', variant: 'destructive' });
    }
  }

  // UI
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-600 mt-1">Create, assign and manage company tasks</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={loadData}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Create / Assign section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="text-cyan-600" /> Create / Assign Task
          </CardTitle>
          <CardDescription>Fill details and assign to an employee (or leave unassigned)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Input placeholder="Task title" value={newTask.title} onChange={(e) => setNewTask((s) => ({ ...s, title: e.target.value }))} />
            <Input placeholder="Description" value={newTask.description || ''} onChange={(e) => setNewTask((s) => ({ ...s, description: e.target.value }))} />

            <Select
              value={newTask.assignedTo ?? ''}
              onValueChange={(val) => setNewTask((s) => ({ ...s, assignedTo: val === '__unassigned' ? null : val }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Assign to (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassigned">Unassigned</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input type="date" value={newTask.dueDate || ''} onChange={(e) => setNewTask((s) => ({ ...s, dueDate: e.target.value }))} />
              <Select value={newTask.priority || 'medium'} onValueChange={(v) => setNewTask((s) => ({ ...s, priority: v }))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            <Button onClick={handleCreateTask}><Plus className="w-4 h-4 mr-2" /> Create Task</Button>
            <Button variant="ghost" onClick={() => setNewTask({ title: '', description: '', assignedTo: null, dueDate: '', priority: 'medium' })}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Bulk assign */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Bulk Assign
          </CardTitle>
          <CardDescription>Select employees on the right and assign the same task to them</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="Title" value={bulkTaskTitle} onChange={(e) => setBulkTaskTitle(e.target.value)} />
            <Input placeholder="Description" value={bulkTaskDescription} onChange={(e) => setBulkTaskDescription(e.target.value)} />
            <div className="flex gap-2">
              <Input type="date" placeholder="Due date" value={bulkDueDate} onChange={(e) => setBulkDueDate(e.target.value)} />
              <Select value={bulkPriority} onValueChange={(v) => setBulkPriority(v as any)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 max-h-64 overflow-auto">
              {employees.map((emp) => {
                const checked = selectedEmployeeIds.includes(emp.id);
                return (
                  <label key={emp.id} className={`p-2 border rounded cursor-pointer flex items-center justify-between ${checked ? 'bg-slate-50' : ''}`}>
                    <div>{emp.first_name} {emp.last_name}</div>
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      setSelectedEmployeeIds((prev) => e.target.checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id));
                    }} />
                  </label>
                );
              })}
            </div>

            <div className="flex gap-2 mt-3">
              <Button onClick={handleBulkAssign}>Assign to Selected ({selectedEmployeeIds.length})</Button>
              <Button variant="ghost" onClick={() => setSelectedEmployeeIds([])}>Clear Selection</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters / Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="min-w-[240px]" />

          <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={(v) => { setFilterAssignee(v); setPage(1); }}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              <SelectItem value="__unassigned">Unassigned</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-slate-600">Showing {filtered.length} tasks • Page {page}/{totalPages}</div>
      </div>

      {/* Task list */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>All Tasks</CardTitle>
          <CardDescription>Manage assignments and status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading tasks...</p>
          ) : paginated.length === 0 ? (
            <p className="text-sm text-slate-500">No tasks match the current filters.</p>
          ) : (
            <div className="space-y-3">
              {paginated.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border rounded hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-slate-900 truncate">{t.title}</div>
                      <div className="text-xs text-slate-500">• {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="text-xs text-slate-600 truncate">{t.description}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Assignee: <strong>{getAssigneeName(t.assigned_to)}</strong>
                      {t.due_date ? ` • Due: ${new Date(t.due_date).toLocaleDateString()}` : ''}
                      {t.priority ? ` • Priority: ${t.priority}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* per-task assignee select: sentinel maps to null */}
                    <Select
                      value={t.assigned_to ?? ''}
                      onValueChange={(val) => reassignTask(t.id, val === '__unassigned' ? null : val)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Assignee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__unassigned">Unassigned</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={t.status || 'pending'} onValueChange={(v) => updateTask(t.id, { status: v })}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={t.priority || 'medium'} onValueChange={(v) => updateTask(t.id, { priority: v })}>
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={() => markComplete(t.id)} title="Mark complete">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => deleteTask(t.id)} variant="ghost" title="Delete">Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <div className="px-3 py-1 border rounded">{page}</div>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
