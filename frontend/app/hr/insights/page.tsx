'use client';

import { useEffect, useState } from 'react';
import { Brain, TrendingUp, AlertCircle, GraduationCap, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/simple-progress';
import { supabase } from '@/lib/supabase';
import type { AIInsight } from '@/lib/supabase';

export default function InsightsPage() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    const { data } = await supabase
      .from('ai_insights')
      .select('*, employees(first_name, last_name), departments(name)')
      .order('created_at', { ascending: false });

    setInsights(data || []);
  }

  async function generateSampleInsights() {
    setLoading(true);

    const sampleInsights = [
      {
        insight_type: 'turnover_risk',
        title: 'High Turnover Risk Detected',
        description: 'Three employees in Engineering department show patterns of disengagement based on performance and attendance trends.',
        confidence_score: 0.87,
        priority: 'high',
        status: 'new',
        data: {
          affected_employees: 3,
          department: 'Engineering',
          risk_factors: ['Low performance scores', 'Increased absences', 'Reduced collaboration']
        }
      },
      {
        insight_type: 'skill_gap',
        title: 'AI/ML Skills Gap in Tech Team',
        description: 'Analysis shows 65% of technical staff lack modern AI/ML competencies, which are becoming critical for upcoming projects.',
        confidence_score: 0.92,
        priority: 'high',
        status: 'new',
        data: {
          skill: 'AI/ML',
          gap_percentage: 65,
          recommended_training: ['Machine Learning Fundamentals', 'Deep Learning with Python']
        }
      },
      {
        insight_type: 'performance_trend',
        title: 'Positive Performance Trend',
        description: 'Marketing department shows 23% improvement in performance scores over the last quarter.',
        confidence_score: 0.95,
        priority: 'medium',
        status: 'new',
        data: {
          department: 'Marketing',
          improvement: 23,
          key_factors: ['Better collaboration', 'Completed training programs', 'Clear goal alignment']
        }
      },
      {
        insight_type: 'learning_recommendation',
        title: 'Personalized Learning Path Available',
        description: 'Based on current skills and career goals, 12 employees would benefit from leadership development programs.',
        confidence_score: 0.89,
        priority: 'medium',
        status: 'new',
        data: {
          target_employees: 12,
          recommended_courses: ['Leadership Essentials', 'Strategic Thinking', 'Team Management']
        }
      },
      {
        insight_type: 'turnover_risk',
        title: 'Critical Retention Alert',
        description: 'Senior developer shows high likelihood of departure. Immediate intervention recommended.',
        confidence_score: 0.91,
        priority: 'critical',
        status: 'new',
        data: {
          risk_level: 'critical',
          recommendations: ['Salary review', 'Career development discussion', 'Role enhancement']
        }
      },
      {
        insight_type: 'skill_gap',
        title: 'Cybersecurity Training Needed',
        description: 'Company-wide assessment indicates insufficient cybersecurity awareness across all departments.',
        confidence_score: 0.88,
        priority: 'high',
        status: 'new',
        data: {
          affected_percentage: 78,
          urgency: 'high',
          compliance_risk: true
        }
      }
    ];

    for (const insight of sampleInsights) {
      await supabase.from('ai_insights').insert([insight]);
    }

    await loadInsights();
    setLoading(false);
  }

  async function updateInsightStatus(id: string, status: string) {
    await supabase
      .from('ai_insights')
      .update({ status })
      .eq('id', id);

    loadInsights();
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
      case 'learning_recommendation':
        return Target;
      default:
        return Brain;
    }
  };

  const filterByStatus = (status: string) => {
    return insights.filter((insight) => insight.status === status);
  };

  const InsightCard = ({ insight }: { insight: any }) => {
    const IconComponent = getInsightIcon(insight.insight_type);

    return (
      <Card className="border-slate-200 hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100">
              <IconComponent className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-slate-900">{insight.title}</h3>
                <Badge variant="outline" className={getPriorityColor(insight.priority)}>
                  {insight.priority}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-3">{insight.description}</p>

              {insight.confidence_score && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-600 mb-1">
                    <span>AI Confidence</span>
                    <span>{(insight.confidence_score * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={insight.confidence_score * 100} className="h-2" />
                </div>
              )}

              {insight.data && (
                <div className="bg-slate-50 rounded-lg p-3 mb-3">
                  <h4 className="text-xs font-semibold text-slate-700 mb-2">Key Details</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    {Object.entries(insight.data).map(([key, value]: [string, any]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {insight.status === 'new' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateInsightStatus(insight.id, 'reviewed')}
                    >
                      Mark Reviewed
                    </Button>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-cyan-600"
                      onClick={() => updateInsightStatus(insight.id, 'actioned')}
                    >
                      Take Action
                    </Button>
                  </>
                )}
                {insight.status === 'reviewed' && (
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-cyan-600"
                    onClick={() => updateInsightStatus(insight.id, 'actioned')}
                  >
                    Take Action
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Insights</h1>
          <p className="text-slate-600 mt-1">Intelligence-driven recommendations for your organization</p>
        </div>
        <Button
          onClick={generateSampleInsights}
          disabled={loading}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {loading ? 'Generating...' : 'Generate Sample Insights'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Insights</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{insights.length}</p>
              </div>
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">New</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {filterByStatus('new').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Reviewed</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {filterByStatus('reviewed').length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Actioned</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {filterByStatus('actioned').length}
                </p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          <TabsTrigger value="actioned">Actioned</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {insights.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <Brain className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Insights Yet</h3>
                <p className="text-slate-600 mb-4">
                  Generate sample insights to see AI-powered recommendations
                </p>
                <Button
                  onClick={generateSampleInsights}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Sample Insights
                </Button>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          {filterByStatus('new').length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <p className="text-slate-600">No new insights</p>
              </CardContent>
            </Card>
          ) : (
            filterByStatus('new').map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {filterByStatus('reviewed').length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <p className="text-slate-600">No reviewed insights</p>
              </CardContent>
            </Card>
          ) : (
            filterByStatus('reviewed').map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
        </TabsContent>

        <TabsContent value="actioned" className="space-y-4">
          {filterByStatus('actioned').length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-12 text-center">
                <p className="text-slate-600">No actioned insights</p>
              </CardContent>
            </Card>
          ) : (
            filterByStatus('actioned').map((insight) => <InsightCard key={insight.id} insight={insight} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
