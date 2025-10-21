'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, TrendingUp, AlertCircle, Brain, Calendar } from 'lucide-react';
import StatsCard from '@/components/hr/StatsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/simple-progress';
import { supabase } from '@/lib/supabase';
import type { Employee, AIInsight, EmployeeCourse } from '@/lib/supabase';

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeCourses: 0,
    avgPerformance: 0,
    pendingReviews: 0,
  });
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    setError(null);
    try {
      const [empRes, coursesRes, insightsRes, reviewsRes] = await Promise.all([
        supabase.from('employees').select('*').eq('status', 'active'),
        supabase
          .from('employee_courses')
          .select('*, learning_courses(*)')
          .in('status', ['enrolled', 'in_progress']),
        supabase
          .from('ai_insights')
          .select('*')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.from('performance_reviews').select('overall_rating'),
      ]);

      // Handle errors from any response
      const anyError = empRes.error || coursesRes.error || insightsRes.error || reviewsRes.error;
      if (anyError) {
        console.error('Supabase error', anyError);
        setError('Failed to load dashboard data');
        return;
      }

      const employees = empRes.data ?? [];
      const courses = coursesRes.data ?? [];
      const insightsData = insightsRes.data ?? [];
      const reviews = reviewsRes.data ?? [];

      const avgPerformance = reviews.length
        ? reviews.reduce((acc: number, r: any) => acc + (r.overall_rating ?? 0), 0) / reviews.length
        : 0;

      // Pending = reviews without an overall_rating
      const pendingReviewsCount = reviews.filter((r: any) => r.overall_rating == null).length;

      setStats({
        totalEmployees: employees.length,
        activeCourses: courses.length,
        avgPerformance: avgPerformance,
        pendingReviews: pendingReviewsCount,
      });

      setInsights(insightsData as AIInsight[]);

      const courseCounts = (courses as any[]).reduce((acc: any, course: any) => {
        const courseId = course.course_id;
        if (!acc[courseId]) {
          acc[courseId] = {
            ...(course.learning_courses || {}),
            enrollments: 0,
            avgProgress: 0,
            totalProgress: 0,
          };
        }
        acc[courseId].enrollments++;
        acc[courseId].totalProgress += Number(course.progress_percentage ?? 0);
        acc[courseId].avgProgress = acc[courseId].totalProgress / acc[courseId].enrollments;
        return acc;
      }, {} as Record<string, any>);

      const topCoursesArray = Object.values(courseCounts)
        .sort((a: any, b: any) => (b.enrollments || 0) - (a.enrollments || 0))
        .slice(0, 5);

      setTopCourses(topCoursesArray);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'turnover_risk':
        return AlertCircle;
      case 'skill_gap':
        return GraduationCap;
      case 'performance_trend':
        return TrendingUp;
      default:
        return Brain;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
  <p className="text-slate-600 mt-1">Welcome back! Here&apos;s your HR overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Employees"
          value={stats.totalEmployees}
          change="+12% from last month"
          changeType="positive"
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatsCard
          title="Active Enrollments"
          value={stats.activeCourses}
          change="+8% from last month"
          changeType="positive"
          icon={GraduationCap}
          iconColor="text-green-600"
        />
        <StatsCard
          title="Avg Performance"
          value={stats.avgPerformance.toFixed(1)}
          change="+0.3 from last quarter"
          changeType="positive"
          icon={TrendingUp}
          iconColor="text-purple-600"
        />
        <StatsCard
          title="Pending Reviews"
          value={stats.pendingReviews}
          change="3 due this week"
          changeType="neutral"
          icon={Calendar}
          iconColor="text-orange-600"
        />
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-xl">Quick Actions</CardTitle>
          <CardDescription>Common tasks and workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/hr/employees')}
              className="p-4 text-left border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-200"
            >
              <Users className="w-6 h-6 text-blue-600 mb-2" />
              <h4 className="font-semibold text-slate-900">Add New Employee</h4>
              <p className="text-xs text-slate-600 mt-1">Onboard a new team member</p>
            </button>
            <button className="p-4 text-left border border-slate-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-200">
              <GraduationCap className="w-6 h-6 text-green-600 mb-2" />
              <h4 className="font-semibold text-slate-900">Create Course</h4>
              <p className="text-xs text-slate-600 mt-1">Add new learning material</p>
            </button>
            <button className="p-4 text-left border border-slate-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all duration-200">
              <TrendingUp className="w-6 h-6 text-purple-600 mb-2" />
              <h4 className="font-semibold text-slate-900">Schedule Review</h4>
              <p className="text-xs text-slate-600 mt-1">Plan performance evaluation</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
