"use client"; // Marks this as a Client Component

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PerformanceScore {
  id: string;
  review_period: string;
  quality_score: number;
  productivity_score: number;
  teamwork_score: number;
  communication_score: number;
  overall_score: number;
  comments: string | null;
  created_at: string;
}

export default function EmployeePerformancePage() {
  const { user } = useAuth();
  const [scores, setScores] = useState<PerformanceScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchScores();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchScores = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('performance_scores')
        .select('*')
        .eq('employee_id', user.id)
        .order('review_period', { ascending: false });

      if (error) throw error;
      setScores(data || []);
    } catch (error) {
      console.error('Error fetching performance scores:', error);
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const ScoreBar = ({ label, score }: { label: string; score: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/10</span>
      </div>
      <Progress value={score * 10} className="h-2" />
    </div>
  );

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Performance Reviews</h1>
          <p className="text-muted-foreground">Track your performance evaluations and feedback</p>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Loading performance reviews...</CardContent></Card>
          ) : scores.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No performance reviews have been recorded yet.</CardContent></Card>
          ) : (
            scores.map((score) => (
              <Card key={score.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Review
                      </CardTitle>
                      <CardDescription>
                        Review Period: {new Date(score.review_period).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{score.overall_score}/10</div>
                      <p className="text-xs text-muted-foreground">Overall Score</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScoreBar label="Quality of Work" score={score.quality_score} />
                  <ScoreBar label="Productivity" score={score.productivity_score} />
                  <ScoreBar label="Teamwork" score={score.teamwork_score} />
                  <ScoreBar label="Communication" score={score.communication_score} />
                  
                  {score.comments && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Reviewer Comments:</p>
                      <p className="text-sm text-muted-foreground italic border-l-2 pl-2">{score.comments}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground pt-2">
                    Reviewed on: {new Date(score.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}