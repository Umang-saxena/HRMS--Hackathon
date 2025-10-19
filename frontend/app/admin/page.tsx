'use client';

import { useEffect, useState } from 'react';
import {
  Users,
  Wallet,
  TrendingUp,
  Calendar,
  ClipboardCheck,
  UserCog,
  PlusCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import StatsCard from '@/components/hr/StatsCard';
import { Progress } from '@/components/ui/simple-progress';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  role?: string | null;
  email?: string | null;
};

type PerformanceReview = {
  employee_id: string;
  overall_rating: number;
};

type Attendance = {
  id?: string;
  employee_id?: string | null;
  date: string;
  status: string;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalHRs: 0,
    totalPayroll: 0,
    avgPerformance: 0,
  });

  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    absentToday: 0,
    monthlyAttendancePercent: 0,
  });

  const [topPerformers, setTopPerformers] = useState<
    { name: string; rating: number; role: string }[]
  >([]);
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();

  // employees.id (from employees table) for the logged-in admin (used as tasks.assigned_by)
  const [currentAdminEmployeeId, setCurrentAdminEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    loadAdminDashboard();
  }, []);

  // Helper to get ISO date YYYY-MM-DD for "today"
  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  // Get start of current month yyyy-mm-01
  function startOfMonthIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  // load dashboard state (employees, payroll, perf, recent attendance + attendance summaries)
  async function loadAdminDashboard() {
    try {
      const [
        { data: employeesData, error: empErr },
        { data: payrollData, error: payErr },
        { data: perfData, error: perfErr },
      ] = await Promise.all([
        supabase.from('employees').select('*'),
        supabase.from('payroll').select('*'),
        supabase.from('performance_reviews').select('*'),
      ]);

      if (empErr || payErr || perfErr) {
        console.error('Error fetching admin dashboard data:', { empErr, payErr, perfErr });
      }

      const employeesArr = employeesData || [];
      const payrollArr = payrollData || [];
      const perfArr = perfData || [];

      // HR count
      const hrs =
        employeesArr.filter((e: any) => (e.role || '').toLowerCase() === 'hr').length || 0;

      // payroll sum
      const payrollSum = payrollArr.reduce(
        (acc: number, p: any) => acc + (Number(p.salary) || 0),
        0
      );

      // average performance
      const avgPerf =
        perfArr.length > 0
          ? perfArr.reduce((acc: number, p: any) => acc + (Number(p.overall_rating) || 0), 0) /
            perfArr.length
          : 0;

      // Top performers (join)
      const topPerf =
        perfArr
          ?.slice()
          .sort((a: PerformanceReview, b: PerformanceReview) => b.overall_rating - a.overall_rating)
          .slice(0, 5)
          .map((p: PerformanceReview) => {
            const emp = employeesArr.find((e: Employee) => e.id === p.employee_id);
            return {
              name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
              rating: p.overall_rating,
              role: emp?.role || 'Employee',
            };
          }) || [];

      // Recent attendance (fetch last 10)
      const { data: attendanceData, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .order('date', { ascending: false })
        .limit(10);

      if (attErr) {
        console.error('Error fetching recent attendance:', attErr);
      }
      const attendanceArr = attendanceData || [];

      // Attendance summary computations
      const today = todayIso();
      const monthStart = startOfMonthIso();

      const [{ data: todayRows, error: todayErr }, { data: monthRows, error: monthErr }] =
        await Promise.all([
          supabase.from('attendance').select('status').eq('date', today),
          supabase.from('attendance').select('status').gte('date', monthStart).lte('date', today),
        ]);

      if (todayErr) console.error('Error fetching today attendance:', todayErr);
      if (monthErr) console.error('Error fetching month attendance:', monthErr);

      const todayArr: any[] = todayRows || [];
      const presentToday = todayArr.filter((r) => (r.status || '').toLowerCase() === 'present').length;
      const absentToday = todayArr.filter((r) => (r.status || '').toLowerCase() === 'absent').length;

      const monthArr: any[] = monthRows || [];
      const presentMonthCount = monthArr.filter((r) => (r.status || '').toLowerCase() === 'present').length;
      const totalMonthCount = monthArr.length;
      const monthlyAttendancePercent = totalMonthCount > 0 ? Math.round((presentMonthCount / totalMonthCount) * 100) : 0;

      // update state
      setStats({
        totalEmployees: employeesArr.length,
        totalHRs: hrs,
        totalPayroll: payrollSum,
        avgPerformance: avgPerf,
      });

      setTopPerformers(topPerf || []);
      setRecentAttendance(attendanceArr || []);
      setEmployees(employeesArr || []);

      setAttendanceStats({
        presentToday,
        absentToday,
        monthlyAttendancePercent,
      });

      // optionally: attempt to resolve current admin employee.id by matching email (non-blocking)
      // this is just a best-effort to avoid calling the server API later; it is safe if not found.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authEmail = (sessionData as any)?.session?.user?.email ?? null;
        if (authEmail) {
          const { data: empRow } = await supabase
            .from('employees')
            .select('id')
            .eq('email', authEmail)
            .maybeSingle();
          if (empRow && (empRow as any).id) {
            setCurrentAdminEmployeeId((empRow as any).id);
          }
        }
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error('Unexpected error loading admin data:', err);
      toast({
        title: 'Error loading dashboard',
        description: 'Unable to load admin data',
        variant: 'destructive',
      });
    }
  }

  // Ensure an employees row exists for the logged-in auth user. Calls server route which uses service role.
  async function ensureAdminEmployeeRow(): Promise<string | null> {
    // return cached if present
    if (currentAdminEmployeeId) return currentAdminEmployeeId;

    // read session for email & metadata
    const { data: sessionData } = await supabase.auth.getSession();
    const authEmail = (sessionData as any)?.session?.user?.email ?? null;
    const metadata = (sessionData as any)?.session?.user?.user_metadata ?? {};
    const first_name = metadata?.given_name || metadata?.first_name || metadata?.name?.split?.(' ')?.[0] || undefined;
    const last_name = metadata?.family_name || metadata?.last_name || undefined;

    if (!authEmail) {
      toast({ title: 'Not authenticated', description: 'Sign in to assign tasks', variant: 'destructive' });
      return null;
    }

    try {
      const resp = await fetch('/api/admin/create-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, first_name, last_name }),
      });

      const text = await resp.text();
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        // returned HTML or broken JSON
        console.error('create-employee returned non-JSON:', text);
        toast({ title: 'Server error', description: 'Failed to create admin profile', variant: 'destructive' });
        return null;
      }

      if (!resp.ok) {
        console.error('create-employee API error:', body);
        toast({ title: 'Failed to link admin profile', description: body?.error || 'Server error', variant: 'destructive' });
        return null;
      }

      const id = body?.id ?? null;
      if (!id) {
        console.error('create-employee returned no id:', body);
        toast({ title: 'Failed to link admin profile', variant: 'destructive' });
        return null;
      }

      setCurrentAdminEmployeeId(id);
      return id;
    } catch (err) {
      console.error('Error calling create-employee API:', err);
      toast({ title: 'Network error', description: 'Could not reach server', variant: 'destructive' });
      return null;
    }
  }

  // Assign task to an employee (uses employees.id as assigned_by)
  async function handleAssignTask() {
    if (!newTask.title || !newTask.assignedTo) {
      toast({
        title: 'Missing Fields',
        description: 'Please provide a title and select an employee.',
        variant: 'destructive',
      });
      return;
    }

    // ensure admin is linked to employees table and get employees.id
    const assignedById = await ensureAdminEmployeeRow();
    if (!assignedById) {
      // ensureAdminEmployeeRow already shows an error toast
      return;
    }

    const payload = {
      title: newTask.title,
      description: newTask.description,
      assigned_to: newTask.assignedTo,
      status: 'pending',
      assigned_by: assignedById, // <-- critical: employees.id
      assigned_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('tasks').insert([payload]).select('*');

    if (error) {
      console.error('Error inserting task:', error);
      toast({
        title: 'Error assigning task',
        description: error.message || 'DB error',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: '✅ Task assigned successfully!' });
    setNewTask({ title: '', description: '', assignedTo: '' });
    loadAdminDashboard();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Company-wide overview and management</p>
      </div>

      {/* Stats Overview (includes attendance cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="Total Employees" value={stats.totalEmployees} icon={Users} iconColor="text-blue-600" />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="HR Managers" value={stats.totalHRs} icon={UserCog} iconColor="text-cyan-600" />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="Total Payroll" value={`₹${stats.totalPayroll}`} icon={Wallet} iconColor="text-green-600" />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="Avg Performance" value={stats.avgPerformance.toFixed(1)} icon={TrendingUp} iconColor="text-purple-600" />
        </div>

        {/* Present Today */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard
            title="Present Today"
            value={attendanceStats.presentToday}
            change={`${attendanceStats.monthlyAttendancePercent}% (month)`}
            changeType="positive"
            icon={Calendar}
            iconColor="text-green-600"
          />
        </div>

        {/* Absent Today */}
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard
            title="Absent Today"
            value={attendanceStats.absentToday}
            change="Check Attendance page"
            changeType="neutral"
            icon={Calendar}
            iconColor="text-red-600"
          />
        </div>
      </div>

      {/* Top Performers & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-purple-600" /> Top Performers
            </CardTitle>
            <CardDescription>Highest rated employees</CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No performance data yet.</p>
            ) : (
              <div className="space-y-3">
                {topPerformers.map((emp, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center border rounded-lg p-3 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{emp.name}</p>
                      <p className="text-xs text-slate-600">{emp.role}</p>
                    </div>
                    <Badge variant="secondary">{emp.rating}/5</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance (recent + month percent) */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="text-green-600" /> Recent Attendance
            </CardTitle>
            <CardDescription>Last 10 attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-slate-600">This month attendance</p>
                <p className="text-2xl font-semibold">{attendanceStats.monthlyAttendancePercent}%</p>
                <p className="text-xs text-slate-500">Present ratio across month</p>
              </div>
              <div className="w-48">
                <Progress value={attendanceStats.monthlyAttendancePercent} className="h-2" />
              </div>
            </div>

            {recentAttendance.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No attendance data yet.</p>
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((a) => (
                  <div key={a.id} className="flex justify-between items-center border rounded-lg p-3">
                    <div>
                      <p className="text-sm">{a.date}</p>
                      <p className="text-xs text-slate-600">Employee ID: {a.employee_id || '—'}</p>
                    </div>
                    <Badge variant="outline">{a.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Task Section */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="text-orange-600" /> Assign Task
          </CardTitle>
          <CardDescription>Assign a new task to an employee</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Task Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <Input
              placeholder="Task Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <select
              value={newTask.assignedTo}
              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
              className="border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <Button onClick={handleAssignTask} className="mt-4 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Assign Task
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
