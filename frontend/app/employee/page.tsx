'use client';

import { useEffect, useState } from 'react';
import { User, Gift, CalendarCheck, Wallet, TrendingUp, ClipboardCheck } from 'lucide-react';
import StatsCard from '@/components/hr/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/simple-progress';
import { supabase } from '@/lib/supabase';
import type { Employee } from '@/lib/supabase';

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [stats, setStats] = useState({
    totalBonuses: 0,
    leavesTaken: 0,
    payroll: 0,
    performance: 0,
    tasksAssigned: 0,
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<any[]>([]);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  async function loadEmployeeData() {
    // Assuming you fetch the logged-in employee via their session or email
    const { data: employeeData } = await supabase
      .from('employees')
      .select('*')
      .eq('email', 'employee@example.com') // replace with session email
      .single();

    if (!employeeData) return;

    setEmployee(employeeData);

    const [{ data: bonuses }, { data: leaves }, { data: payroll }, { data: perf }, { data: assignedTasks }] = await Promise.all([
      supabase.from('bonuses').select('*').eq('employee_id', employeeData.id),
      supabase.from('leaves').select('*').eq('employee_id', employeeData.id),
      supabase.from('payroll').select('*').eq('employee_id', employeeData.id),
      supabase.from('performance_reviews').select('*').eq('employee_id', employeeData.id),
      supabase.from('tasks').select('*').eq('assigned_to', employeeData.id)
    ]);

    const totalBonus = bonuses?.reduce((acc, b) => acc + (b.amount || 0), 0) || 0;
    const totalPayroll = payroll?.reduce((acc, p) => acc + (p.salary || 0), 0) || 0;
    const avgPerf = perf?.length
      ? perf.reduce((acc, p) => acc + (p.overall_rating || 0), 0) / perf.length
      : 0;

    setStats({
      totalBonuses: totalBonus,
      leavesTaken: leaves?.length || 0,
      payroll: totalPayroll,
      performance: avgPerf,
      tasksAssigned: assignedTasks?.length || 0,
    });

    setTasks(assignedTasks || []);
    setPerformanceHistory(perf || []);
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Employee Dashboard</h1>
        <p className="text-slate-600 mt-1">
          Welcome back, {employee?.first_name || 'Employee'} 👋
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatsCard title="Bonuses Earned" value={`₹${stats.totalBonuses}`} icon={Gift} iconColor="text-yellow-600" />
        <StatsCard title="Leaves Taken" value={stats.leavesTaken} icon={CalendarCheck} iconColor="text-blue-600" />
        <StatsCard title="Total Payroll" value={`₹${stats.payroll}`} icon={Wallet} iconColor="text-green-600" />
        <StatsCard title="Performance" value={stats.performance.toFixed(1)} icon={TrendingUp} iconColor="text-purple-600" />
        <StatsCard title="Tasks Assigned" value={stats.tasksAssigned} icon={ClipboardCheck} iconColor="text-orange-600" />
      </div>

      {/* Employee Details Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl">Profile Information</CardTitle>
          <CardDescription>Overview of your employee details</CardDescription>
        </CardHeader>
        <CardContent>
          {employee ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
              <p><strong>Employee ID:</strong> {employee.id}</p>
              
              <p><strong>Role:</strong> {employee.position}</p>
              <p><strong>Email:</strong> {employee.email}</p>
              <p><strong>Joining Date:</strong> {new Date(employee.hire_date).toLocaleDateString()}</p>
              <p><strong>Status:</strong> 
                <Badge variant="outline" className="ml-2 capitalize">{employee.status}</Badge>
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Loading employee details...</p>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl">Performance Overview</CardTitle>
          <CardDescription>Track your performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          {performanceHistory.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No performance data available yet.</p>
          ) : (
            <div className="space-y-3">
              {performanceHistory.map((p, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="flex justify-between text-sm font-semibold">
                    <span>{new Date(p.review_date).toLocaleDateString()}</span>
                    <span>{p.overall_rating}/5</span>
                  </div>
                  <Progress value={(p.overall_rating / 5) * 100} className="h-2 mt-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tasks Assigned */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl">Tasks Assigned</CardTitle>
          <CardDescription>Your active and pending tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No tasks assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, idx) => (
                <div key={idx} className="flex justify-between p-3 border rounded-lg hover:bg-blue-50 transition-all duration-200">
                  <div>
                    <h4 className="font-medium text-slate-900">{task.title}</h4>
                    <p className="text-xs text-slate-600">{task.description}</p>
                  </div>
                  <Badge variant="outline" className="capitalize">{task.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
