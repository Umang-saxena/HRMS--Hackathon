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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/simple-progress';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import StatsCard from '@/components/hr/StatsCard';

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  role?: string | null;
  email?: string | null;
  salary?: number | null; // yearly gross
};

type AttendanceRow = {
  id?: string;
  employee_id?: string | null;
  date: string;
  status?: string;
};

type PerfRow = {
  id: string;
  employee_id: string;
  overall_score: number;
  updated_at: string;
  created_at?: string;
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalHRs: 0,
    monthlyPayroll: 0, // sum of monthly salary across employees
  });

  const [attendanceStats, setAttendanceStats] = useState({
    presentToday: 0,
    absentToday: 0,
    monthlyAttendancePercent: 0,
  });

  const [topPerformersWeek, setTopPerformersWeek] = useState<
    { id: string; name: string; role: string; avgScore: number }[]
  >([]);

  const [recentAttendance, setRecentAttendance] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    void loadAdminDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function startOfMonthIso() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }

  async function loadAdminDashboard() {
    setLoading(true);
    try {
      // Fetch employees, payroll (we'll compute monthly payroll from employees.salary), performance_reviews(not used directly), recent attendance
      const [
        { data: employeesData, error: empErr },
        { data: attendanceRecentData, error: attErr },
        { data: perfRowsData, error: perfErr },
      ] = await Promise.all([
        supabase.from('employees').select('id,first_name,last_name,role,salary'),
        supabase.from('attendance').select('*').order('date', { ascending: false }).limit(10),
        supabase.from('performance_scores').select('*').order('updated_at', { ascending: false }).limit(500),
      ]);

      if (empErr) console.error('employees fetch error', empErr);
      if (attErr) console.error('recent attendance fetch error', attErr);
      if (perfErr) console.error('performance_scores fetch error', perfErr);

      const employeesArr = (employeesData ?? []) as Employee[];
      const attendanceArr = (attendanceRecentData ?? []) as AttendanceRow[];
      const perfRows = (perfRowsData ?? []) as PerfRow[];

      // compute HR count
      const hrs = employeesArr.filter((e) => (e.role ?? '').toLowerCase() === 'hr').length;

      // compute monthly payroll: sum( (salary || 0) / 12 )
      const monthlyPayrollSum = employeesArr.reduce((acc, e) => {
        const yearly = Number(e.salary ?? 0) || 0;
        return acc + yearly / 12;
      }, 0);

      // attendance summary
      const today = todayIso();
      const monthStart = startOfMonthIso();

      const [{ data: todayRows, error: todayErr }, { data: monthRows, error: monthErr }] = await Promise.all([
        supabase.from('attendance').select('employee_id,status,check_in').eq('date', today),
        supabase.from('attendance').select('employee_id,status,date,check_in').gte('date', monthStart).lte('date', today),
      ]);

      if (todayErr) console.error('today attendance error', todayErr);
      if (monthErr) console.error('month attendance error', monthErr);

      const todayArr: any[] = (todayRows ?? []);
      const monthArr: any[] = (monthRows ?? []);

      // treat present if status === 'Present' OR check_in not null
      const presentToday = todayArr.filter((r) => ((r.status ?? '').toLowerCase() === 'present' || r.check_in != null)).length;
      const totalEmployees = employeesArr.length;
      const absentToday = Math.max(0, totalEmployees - presentToday);

      const presentMonthCount = monthArr.filter((r) => ((r.status ?? '').toLowerCase() === 'present' || r.check_in != null)).length;
      const totalMonthCount = monthArr.length;
      const monthlyAttendancePercent = totalMonthCount > 0 ? Math.round((presentMonthCount / totalMonthCount) * 100) : 0;

      // compute top 3 performers of the WEEK (last 7 days) from performance_scores
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoIso = weekAgo.toISOString();

      const recentPerfRows = perfRows.filter((r) => {
        try {
          return new Date(r.updated_at) >= new Date(weekAgoIso);
        } catch {
          return false;
        }
      });

      // aggregate avg score per employee
      const perEmp: Record<string, { sum: number; count: number }> = {};
      for (const r of recentPerfRows) {
        const id = r.employee_id;
        if (!id) continue;
        const v = Number(r.overall_score ?? 0) || 0;
        if (!perEmp[id]) perEmp[id] = { sum: 0, count: 0 };
        perEmp[id].sum += v;
        perEmp[id].count += 1;
      }

      // build array and join employee names
      const aggregated = Object.entries(perEmp).map(([empId, val]) => {
        const emp = employeesArr.find((e) => e.id === empId);
        return {
          id: empId,
          name: emp ? `${emp.first_name} ${emp.last_name}` : empId,
          role: emp?.role ?? 'Employee',
          avgScore: val.count > 0 ? val.sum / val.count : 0,
        };
      });

      // If not enough entries in last 7 days, fall back to latest overall best (from perfRows)
      let top3 = aggregated.sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
      if (top3.length < 3) {
        // derive from all-time perfRows: average per employee
        const perEmpAll: Record<string, { sum: number; count: number }> = {};
        for (const r of perfRows) {
          const id = r.employee_id;
          if (!id) continue;
          const v = Number(r.overall_score ?? 0) || 0;
          if (!perEmpAll[id]) perEmpAll[id] = { sum: 0, count: 0 };
          perEmpAll[id].sum += v;
          perEmpAll[id].count += 1;
        }
        const allAgg = Object.entries(perEmpAll).map(([empId, val]) => {
          const emp = employeesArr.find((e) => e.id === empId);
          return {
            id: empId,
            name: emp ? `${emp.first_name} ${emp.last_name}` : empId,
            role: emp?.role ?? 'Employee',
            avgScore: val.count > 0 ? val.sum / val.count : 0,
          };
        });
        const merged = [...aggregated, ...allAgg];
        // dedupe (keep higher avgScore if duplicates)
        const map = new Map<string, { id: string; name: string; role: string; avgScore: number }>();
        for (const it of merged) {
          const existing = map.get(it.id);
          if (!existing || it.avgScore > existing.avgScore) map.set(it.id, it);
        }
        top3 = Array.from(map.values()).sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
      }

      // update states
      setEmployees(employeesArr);
      setStats({
        totalEmployees: totalEmployees,
        totalHRs: hrs,
        monthlyPayroll: monthlyPayrollSum,
      });
      setAttendanceStats({
        presentToday,
        absentToday,
        monthlyAttendancePercent,
      });
      setRecentAttendance(attendanceArr);
      setTopPerformersWeek(top3);
    } catch (err) {
      console.error('Unexpected error loading admin dashboard:', err);
      toast({
        title: 'Error loading dashboard',
        description: 'Unable to load admin data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-600 mt-1">Company-wide overview and management</p>
      </div>

      {/* Stats Overview (removed small performance card) */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="Total Employees" value={stats.totalEmployees} icon={Users} iconColor="text-blue-600" />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="HR Managers" value={stats.totalHRs} icon={UserCog} iconColor="text-cyan-600" />
        </div>

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          {/* Monthly Payroll card (sum of all monthly salaries) */}
          <StatsCard
            title="Monthly Payroll"
            value={`₹${Number(stats.monthlyPayroll ?? 0).toFixed(2)}`}
            icon={Wallet}
            iconColor="text-green-600"
          />
        </div>

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

        <div className="col-span-1 md:col-span-1 lg:col-span-1">
          <StatsCard title="Top Tasks" value="Open Tasks" icon={ClipboardCheck} iconColor="text-orange-600" />
        </div>
      </div>

      {/* Top performers of the week & Recent Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-purple-600" /> Top 3 Performers (This Week)
            </CardTitle>
            <CardDescription>Based on performance scores updated in the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {topPerformersWeek.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No recent performance data for this week.</p>
            ) : (
              <div className="space-y-3">
                {topPerformersWeek.map((p, idx) => (
                  <div key={p.id} className="flex justify-between items-center border rounded-lg p-3 hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-600">{p.role}</p>
                    </div>
                    <Badge variant="secondary">{Number(p.avgScore).toFixed(1)}/5</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
            <Input placeholder="Task Title" />
            <Input placeholder="Task Description" />
            <select className="border border-slate-300 rounded-lg px-3 py-2">
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </option>
              ))}
            </select>
          </div>

          <Button className="mt-4 flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Assign Task
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
