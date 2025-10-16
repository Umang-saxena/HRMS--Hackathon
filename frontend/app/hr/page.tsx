'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, GraduationCap, TrendingUp, AlertCircle, Brain, Calendar } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    const { data: employees } = await supabase
      .from('employees')
      .select('*')
      .eq('status', 'active');

    const { data: courses } = await supabase
      .from('employee_courses')
      .select('*, learning_courses(*)')
      .in('status', ['enrolled', 'in_progress']);

    const { data: insightsData } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: reviews } = await supabase
      .from('performance_reviews')
      .select('overall_rating');

    setStats({
      totalEmployees: employees?.length || 0,
      activeCourses: courses?.length || 0,
      avgPerformance: reviews?.length
        ? (reviews.reduce((acc, r) => acc + (r.overall_rating || 0), 0) / reviews.length)
        : 0,
      pendingReviews: 12,
    });

    setInsights(insightsData || []);

    const courseCounts = courses?.reduce((acc: any, course: any) => {
      const courseId = course.course_id;
      if (!acc[courseId]) {
        acc[courseId] = {
          ...course.learning_courses,
          enrollments: 0,
          avgProgress: 0,
          totalProgress: 0,
        };
      }
      acc[courseId].enrollments++;
      acc[courseId].totalProgress += course.progress_percentage;
      acc[courseId].avgProgress = acc[courseId].totalProgress / acc[courseId].enrollments;
      return acc;
    }, {});

    const topCoursesArray = Object.values(courseCounts || {})
      .sort((a: any, b: any) => b.enrollments - a.enrollments)
      .slice(0, 5);

    setTopCourses(topCoursesArray);
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
        <p className="text-slate-600 mt-1">Welcome back! Here's your HR overview.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">AI-Powered Insights</CardTitle>
                <CardDescription>Real-time analysis and recommendations</CardDescription>
              </div>
              <Brain className="w-6 h-6 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No new insights available. Add sample data to see AI recommendations.
                </p>
              ) : (
                insights.map((insight) => {
                  const IconComponent = getInsightIcon(insight.insight_type);
                  return (
                    <div
                      key={insight.id}
                      className="flex items-start gap-3 p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200"
                    >
                      <div className="p-2 rounded-lg bg-blue-100">
                        <IconComponent className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">
                            {insight.title}
                          </h4>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(insight.priority)}
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {insight.description}
                        </p>
                        {insight.confidence_score && (
                          <p className="text-xs text-slate-500 mt-1">
                            Confidence: {(insight.confidence_score * 100).toFixed(0)}%
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Popular Courses</CardTitle>
                <CardDescription>Most enrolled learning programs</CardDescription>
              </div>
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topCourses.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No course enrollments yet. Start adding courses and enrollments.
                </p>
              ) : (
                topCourses.map((course: any) => (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {course.title}
                        </h4>
                        <p className="text-xs text-slate-600">
                          {course.enrollments} enrolled • {course.duration_hours}h
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {course.level}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Avg Progress</span>
                        <span>{Math.round(course.avgProgress)}%</span>
                      </div>
                      <Progress value={course.avgProgress} className="h-2" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
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
