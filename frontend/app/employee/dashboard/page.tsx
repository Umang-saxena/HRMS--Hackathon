"use client"; // Marks this as a Client Component due to hooks and data fetching

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, DollarSign, ListTodo, TrendingUp, Clock, Award } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Changed from react-router-dom
import { Button } from '@/components/ui/button';

interface EmployeeStats {
  pendingLeaves: number;
  completedTasks: number;
  pendingTasks: number;
  latestPayroll: number;
  pendingBonuses: number;
  latestScore: number;
}

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const router = useRouter(); // Changed from useNavigate
  const [stats, setStats] = useState<EmployeeStats>({
    pendingLeaves: 0,
    completedTasks: 0,
    pendingTasks: 0,
    latestPayroll: 0,
    pendingBonuses: 0,
    latestScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return; // Guard clause to ensure user exists
    try {
      const { count: pendingLeaves } = await supabase
        .from('leaves')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'pending');

      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'completed');

      const { count: pendingTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .in('status', ['pending', 'in_progress']);
        
      const { data: payrollData } = await supabase
        .from('payroll')
        .select('net_salary')
        .eq('employee_id', user.id)
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: pendingBonuses } = await supabase
        .from('bonuses')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('status', 'pending');

      const { data: scoresData } = await supabase
        .from('performance_scores')
        .select('overall_score')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setStats({
        pendingLeaves: pendingLeaves || 0,
        completedTasks: completedTasks || 0,
        pendingTasks: pendingTasks || 0,
        latestPayroll: payrollData?.net_salary || 0,
        pendingBonuses: pendingBonuses || 0,
        latestScore: scoresData?.overall_score || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Employee Dashboard</h1>
          <p className="text-muted-foreground">Manage your work, leaves, and view your performance</p>
        </div>

        {loading ? (
            <p>Loading stats...</p>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/employee/leaves')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Leave Requests</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
                  <p className="text-xs text-muted-foreground">Click to manage leaves</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/employee/tasks')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
                  <ListTodo className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingTasks}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.completedTasks} completed
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/employee/payroll')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Latest Salary</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${stats.latestPayroll.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">View payroll details</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/employee/bonuses')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Bonuses</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingBonuses}</div>
                  <p className="text-xs text-muted-foreground">Bonuses awaiting approval</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push('/employee/performance')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.latestScore}/10</div>
                  <p className="text-xs text-muted-foreground">Latest evaluation</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/employee/leaves')}>
                    Apply for Leave
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => router.push('/employee/tasks')}>
                    View Tasks
                  </Button>
                </CardContent>
              </Card>
            </div>
        )}
      </div>
    </Layout>
  );
}